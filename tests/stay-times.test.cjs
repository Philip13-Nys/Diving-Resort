const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");
const source = fs.readFileSync(
  require("node:path").join(
    __dirname,
    "../src/app/components/StayTimeSettings.tsx",
  ),
  "utf8",
);
const jsx = (type, props) => ({ type, props: props || {} });
const nodes = (value) =>
  !value || typeof value !== "object"
    ? []
    : Array.isArray(value)
      ? value.flatMap(nodes)
      : [value, ...nodes(value.props?.children)];

function harness(options = {}) {
  const slots = [],
    effects = [],
    listeners = {},
    failures = {},
    batches = [];
  let cursor = 0,
    access = 0;
  const mocks = {
    react: {
      useState(initial) {
        const slot = cursor++;
        if (!(slot in slots))
          slots[slot] = typeof initial === "function" ? initial() : initial;
        return [
          slots[slot],
          (value) => {
            slots[slot] =
              typeof value === "function" ? value(slots[slot]) : value;
          },
        ];
      },
      useRef(initial) {
        const slot = cursor++;
        return (slots[slot] ||= { current: initial });
      },
      useEffect(fn) {
        const slot = cursor++;
        if (!(slot in slots)) {
          slots[slot] = true;
          effects.push(fn);
        }
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "lucide-react": {},
    "../firebase": { db: {} },
    "../auth": {
      requireAccess: async (area) => {
        assert.equal(area, "manager");
        access++;
        if (options.denied) throw Error("Account is not authorized.");
      },
    },
    "./ui/async-action": { AsyncForm: "form", AsyncButton: "button" },
    "firebase/firestore": {
      doc: (_db, collection, id) => collection + "/" + id,
      onSnapshot: (ref, next, failed) => {
        listeners[ref] = next;
        failures[ref] = failed;
        return () => {};
      },
      serverTimestamp: () => "SERVER_TIMESTAMP",
      writeBatch() {
        const writes = [];
        batches.push(writes);
        return {
          set: (ref, data, settings) => writes.push({ ref, data, settings }),
          commit: async () => {
            if (options.failed) throw Error("Offline");
            if (options.wait) await options.wait;
          },
        };
      },
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(
    transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      Error,
      console: { error() {} },
      require(name) {
        assert.ok(name in mocks, name);
        return mocks[name];
      },
    },
  );
  const Page = module.exports.default;
  function render() {
    cursor = 0;
    const result = nodes(Page());
    effects.splice(0).forEach((fn) => fn());
    return result;
  }
  function publish(collection, data) {
    listeners[collection + "/general"]({
      exists: () => Boolean(data),
      data: () => data,
    });
  }
  render();
  const fields = () => render().filter((node) => node.type === "input");
  const change = (index, value) =>
    fields()[index].props.onChange({ target: { value } });
  const submit = () =>
    render()
      .find((node) => node.type === "form")
      .props.onSubmit();
  return {
    render,
    fields,
    change,
    submit,
    publish,
    failures,
    batches,
    get access() {
      return access;
    },
  };
}

function load(h) {
  h.publish("systemSettings", {
    checkInTime: "14:00",
    checkOutTime: "11:00",
    resortName: "Keep this name",
  });
  h.publish("publicSettings", { checkInTime: "15:30", checkOutTime: "12:00" });
}

test("stay-time editor loads public times and preserves an unsaved edit during live updates", () => {
  const h = harness();
  load(h);
  assert.deepEqual(
    h.fields().map((node) => node.props.value),
    ["15:30", "12:00"],
  );
  h.change(0, "16:00");
  h.publish("publicSettings", { checkInTime: "17:00", checkOutTime: "10:00" });
  assert.deepEqual(
    h.fields().map((node) => node.props.value),
    ["16:00", "12:00"],
  );
  assert.equal(h.batches.length, 0);
});

test("saving merges only stay times into both existing documents and prevents repeated submits", async () => {
  let finish;
  const h = harness({
    wait: new Promise((resolve) => {
      finish = resolve;
    }),
  });
  load(h);
  h.change(0, "16:00");
  const first = h.submit();
  await h.submit();
  assert.equal(h.access, 1);
  assert.equal(h.batches.length, 1);
  assert.equal(
    h.fields().every((node) => node.props.disabled),
    true,
  );
  const writes = JSON.parse(JSON.stringify(h.batches[0]));
  assert.deepEqual(
    writes.map((write) => write.ref),
    ["systemSettings/general", "publicSettings/general"],
  );
  for (const write of writes) {
    assert.deepEqual(write.settings, { merge: true });
    assert.deepEqual(write.data, {
      checkInTime: "16:00",
      checkOutTime: "12:00",
      updatedAt: "SERVER_TIMESTAMP",
    });
  }
  finish();
  await first;
  assert.ok(
    h
      .render()
      .some(
        (node) =>
          node.props.role === "status" &&
          node.props.children.startsWith("Stay times saved"),
      ),
  );
});

test("invalid times, identical times and unauthorized accounts never write settings", async () => {
  for (const value of ["", "25:00", "12:00"]) {
    const h = harness();
    load(h);
    h.change(0, value);
    await h.submit();
    assert.equal(h.batches.length, 0);
    assert.ok(h.render().some((node) => node.props.role === "alert"));
  }
  const h = harness({ denied: true });
  load(h);
  h.change(0, "16:00");
  await h.submit();
  assert.equal(h.batches.length, 0);
  assert.ok(
    h
      .render()
      .some((node) => node.props.children === "Account is not authorized."),
  );
});

test("failed loads block saving; failed commits show errors and permit retry", async () => {
  const broken = harness();
  broken.failures["publicSettings/general"](Error("Denied"));
  await broken.submit();
  assert.equal(broken.batches.length, 0);
  assert.ok(broken.render().some((node) => node.props.role === "alert"));
  const options = { failed: true },
    h = harness(options);
  load(h);
  h.change(1, "10:00");
  await h.submit();
  assert.ok(h.render().some((node) => node.props.children === "Offline"));
  assert.equal(
    h.fields().some((node) => node.props.disabled),
    false,
  );
  options.failed = false;
  await h.submit();
  assert.equal(h.batches.length, 2);
  assert.ok(
    h
      .render()
      .some(
        (node) =>
          node.props.role === "status" &&
          node.props.children.startsWith("Stay times saved"),
      ),
  );
});
