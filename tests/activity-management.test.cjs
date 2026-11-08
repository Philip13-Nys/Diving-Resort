const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
const { transformSync } = require("esbuild");
const load = require("./load-ts.cjs");
const jsx = (type, props) => ({ type, props: props || {} });
const nodes = (value) =>
  !value || typeof value !== "object"
    ? []
    : Array.isArray(value)
      ? value.flatMap(nodes)
      : [value, ...nodes(value.props?.children)];
function harness(denied = false) {
  const slots = [],
    effects = [],
    writes = [],
    alerts = [];
  let cursor = 0;
  const params = new URLSearchParams("action=add");
  const mocks = {
    react: {
      useState(initial) {
        const i = cursor++;
        if (!(i in slots))
          slots[i] = typeof initial === "function" ? initial() : initial;
        return [
          slots[i],
          (value) => {
            slots[i] = typeof value === "function" ? value(slots[i]) : value;
          },
        ];
      },
      useEffect(fn, deps) {
        const i = cursor++;
        if (
          !slots[i] ||
          deps.some((value, index) => value !== slots[i][index])
        ) {
          slots[i] = deps;
          effects.push(fn);
        }
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "lucide-react": {},
    "react-router-dom": { useSearchParams: () => [params, () => {}] },
    "../app/useBookingInventory": { useRecordRevision: () => 0 },
    "../app/useActivityAvailability": {
      useActivityAvailability: () => ({
        catalog: [],
        occupied: [],
        loading: false,
        error: "",
      }),
    },
    "../app/activityAvailability": load("src/app/activityAvailability.ts"),
    "../app/serviceConfiguration": {
      saveServiceConfiguration: async (kind, id, data) => {
        if (denied) throw Error("Not authorized");
        writes.push({ ref: id ? kind + "/" + id : kind, data });
        return { id: id || "new" };
      },
    },
    "../app/auth": {
      requireAccess: async () => {
        await Promise.resolve();
        if (denied) throw Error("Not authorized");
      },
    },
    "../app/components/ActivityAvailabilityFields": {
      default: "availability-fields",
      PackageActivityLinks: "package-links",
      ActivityAvailabilitySummary: "availability-summary",
    },
    "../app/components/ui/async-action": {
      AsyncButton: "button",
      AsyncForm: "form",
    },
    "../app/components/ui/card": { Card: "card" },
    "../app/components/ui/button": { Button: "button" },
    "../app/firebase": { db: {} },
    "../app/activitylogss": { createActivityLog: async () => {} },
    "firebase/firestore": {
      collection: (_db, name) => name,
      doc: (_db, name, id) => name + "/" + id,
      getDocs: async () => ({ docs: [] }),
      serverTimestamp: () => "SERVER_TIMESTAMP",
      addDoc: async (ref, data) => {
        writes.push({ ref, data });
        return { id: "new" };
      },
      updateDoc: async (ref, data) => writes.push({ ref, data }),
      deleteDoc: async () => {},
    },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(
    path.join(__dirname, "../src/manager/ServicesManagement.tsx"),
    "utf8",
  );
  vm.runInNewContext(
    transformSync(source, { loader: "tsx", format: "cjs", jsx: "automatic" })
      .code,
    {
      module,
      exports: module.exports,
      Error,
      URLSearchParams,
      console: { error() {}, log() {} },
      alert: (message) => alerts.push(message),
      FormData: class {
        constructor(form) {
          assert.ok(
            form,
            "FormData must be captured before awaiting authorization",
          );
          this.form = form;
        }
        get(key) {
          return this.form[key] ?? "";
        }
        getAll(key) {
          return this.form[key] || [];
        }
      },
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
  render();
  async function submit(data) {
    const event = { preventDefault() {}, currentTarget: data };
    const pending = render()
      .find((node) => node.type === "form")
      .props.onSubmit(event);
    event.currentTarget = null;
    await pending;
  }
  return { render, writes, alerts, submit };
}
const input = {
  name: "Banana boat",
  category: "Water Activities",
  description: "A group ride",
  price: "1000",
  status: "active",
  activityCapacity: "8",
  activityDuration: "30",
  activityOpensAt: "08:00",
  activityClosesAt: "17:00",
  activityDays: ["0", "1", "2", "3", "4", "5", "6"],
};

test("service creation preserves entered scheduling fields across async authorization", async () => {
  const h = harness();
  await h.submit(input);
  assert.deepEqual(h.alerts, []);
  assert.equal(h.writes[0].ref, "services");
  assert.deepEqual(JSON.parse(JSON.stringify(h.writes[0].data.availability)), {
    capacity: 8,
    durationMinutes: 30,
    opensAt: "08:00",
    closesAt: "17:00",
    days: [0, 1, 2, 3, 4, 5, 6],
  });
  assert.equal(h.writes[0].data.maxParticipants, 8);
  assert.equal(h.writes[0].data.duration, "30 minutes");
});

test("package creation needs no schedule/capacity and keeps descriptive inclusions", async () => {
  const h = harness();
  h.render()
    .find(
      (node) =>
        node.type === "button" && node.props.children === "Service Packages",
    )
    .props.onClick();
  assert.equal(
    h
      .render()
      .some(
        (node) =>
          node.type === "availability-fields" || node.type === "package-links",
      ),
    false,
  );
  await h.submit({
    name: "Family package",
    services: "Banana boat, Snorkeling",
    packagePrice: "1500",
    originalPrice: "2000",
    discount: "25",
  });
  assert.equal(h.writes[0].ref, "packages");
  assert.equal(h.writes[0].data.serviceIds, undefined);
  assert.equal(h.writes[0].data.availability, undefined);
  assert.equal(h.writes[0].data.duration, undefined);
  assert.equal(h.writes[0].data.maxParticipants, undefined);
  assert.deepEqual(
    [...h.writes[0].data.services],
    ["Banana boat", "Snorkeling"],
  );
  assert.equal(h.writes[0].data.packagePrice, 1500);
});

test("invalid availability and unauthorized manager sessions cannot save service configuration", async () => {
  const invalid = harness();
  await invalid.submit({ ...input, activityCapacity: "2.5" });
  assert.equal(invalid.writes.length, 0);
  assert.match(invalid.alerts[0], /participant capacity/);
  const denied = harness(true);
  await denied.submit(input);
  assert.equal(denied.writes.length, 0);
  assert.match(denied.alerts[0], /Not authorized/);
});

test("manager can explicitly configure equipment units without treating people as inventory", async () => {
  const h = harness();
  await h.submit({
    ...input,
    activityCapacityType: "units",
    activityParticipantsPerUnit: "5",
    activityCapacity: "3",
  });
  assert.deepEqual(h.alerts, []);
  assert.equal(h.writes[0].data.availability.capacityType, "units");
  assert.equal(h.writes[0].data.availability.capacity, 3);
  assert.equal(h.writes[0].data.availability.participantsPerUnit, 5);
  assert.equal(h.writes[0].data.maxParticipants, 15);
});
