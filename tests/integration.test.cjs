const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-ts.cjs");
const values = load("src/app/bookingAvailability.ts");
const access = load("src/app/auth.ts");
const { validateTransition } = load("src/app/bookingOperations.ts");
const { aggregateGuests } = load("src/app/bookingStore.ts");
const { toCsv } = load("src/app/reportData.ts");
const { validateBackup } = load("src/app/localBackup.ts");

test("legacy zero room numbers cannot spread one walk-in across the entire resort", () => {
  const types = [
    { id: "deluxe", name: "Deluxe" },
    { id: "suite", name: "Suite" },
  ];
  const rooms = values.normalizeInventory(
    Array.from({ length: 25 }, (_, index) => ({
      id: `physical-${index}`,
      roomId: `R-${String(index + 1).padStart(3, "0")}`,
      roomNumber: 0,
      type: index < 5 ? "Deluxe" : "Suite",
      status: "available",
    })),
    types,
  );
  const booking = {
    id: "walkin",
    roomNumber: "0",
    assignedRoomNumbers: ["0"],
    assignedRoomIds: ["physical-0"],
    roomId: "deluxe",
    roomTypeId: "deluxe",
    roomCount: 1,
    status: "checked-in",
    checkIn: "2026-11-01",
    checkOut: "2026-11-06",
  };
  assert.equal(rooms[0].roomNumber, "R-001");
  assert.equal(new Set(rooms.map((room) => room.roomNumber)).size, 25);
  assert.deepEqual(values.assignedRoomIds(booking, rooms), ["physical-0"]);
  const map = values.roomBookingsOnDate(rooms, [booking], "2026-11-01");
  assert.equal(map.size, 1);
  assert.equal(
    values.typeAvailability(
      rooms,
      [booking],
      types[0],
      "2026-11-01",
      "2026-11-02",
    ).available,
    4,
  );
  assert.equal(
    values.typeAvailability(
      rooms,
      [booking],
      types[1],
      "2026-11-01",
      "2026-11-02",
    ).available,
    20,
  );
  const duplicates = rooms.map((room) => ({ ...room, roomNumber: "101" }));
  assert.deepEqual(
    values.assignedRoomIds({ roomNumber: "101" }, duplicates),
    [],
  );
  assert.deepEqual(values.assignedRoomIds({ roomNumber: "R-001" }, rooms), [
    "physical-0",
  ]);
  assert.deepEqual(
    values.assignedRoomIds(
      { assignedRoomIds: ["physical-0"], roomNumber: "101" },
      duplicates,
    ),
    ["physical-0"],
  );
});

test("room displays distinguish pending capacity, check-in, future stays and saved occupancy", () => {
  const day = "2026-11-01";
  const rooms = [1, 2, 3].map((id) => ({
    id: String(id),
    roomNumber: String(id),
    roomTypeId: "suite",
    type: "Suite",
    status: "available",
  }));
  const booking = {
    id: "booking",
    roomTypeId: "suite",
    roomCount: 2,
    status: "pending",
    checkIn: day,
    checkOut: "2026-11-03",
  };
  const statuses = (records) => {
    const map = values.roomBookingsOnDate(rooms, records, day);
    return rooms.map((room) =>
      values.roomStatusOnDate(room, map.get(room.id), day, day),
    );
  };
  assert.deepEqual(statuses([booking]), ["reserved", "reserved", "available"]);
  assert.deepEqual(statuses([{ ...booking, status: "checked-in" }]), [
    "occupied",
    "occupied",
    "available",
  ]);
  assert.deepEqual(statuses([{ ...booking, checkIn: "2026-11-02" }]), [
    "available",
    "available",
    "available",
  ]);
  assert.deepEqual(statuses([{ ...booking, status: "checked-out" }]), [
    "available",
    "available",
    "available",
  ]);
  assert.equal(
    values.roomStatusOnDate(
      { ...rooms[0], status: "Occupied" },
      undefined,
      day,
      day,
    ),
    "occupied",
  );
  assert.equal(
    values.roomStatusOnDate(
      { ...rooms[0], status: "Occupied" },
      undefined,
      "2026-11-02",
      day,
    ),
    "available",
  );
});

test("shared collection listeners replay snapshots and stop only after the last subscriber", async () => {
  let starts = 0,
    stops = 0,
    reads = 0,
    emit;
  const store = load("src/app/bookingStore.ts", {
    "firebase/firestore": {
      collection: (_, path) => path,
      onSnapshot: (_, next) => {
        starts++;
        emit = next;
        return () => stops++;
      },
      getDocs: async () => {
        reads++;
        return { docs: [] };
      },
    },
  });
  const seen = [],
    fail = (error) => {
      throw error;
    };
  const offA = store.watchRecords(
    "customer:Bookings",
    (s) => seen.push(s),
    fail,
  );
  const offB = store.watchRecords(
    "customer:Bookings",
    (s) => seen.push(s),
    fail,
  );
  assert.equal(starts, 1);
  const snapshot = { docs: [{ id: "booking" }] };
  emit(snapshot);
  assert.deepEqual(seen, [snapshot, snapshot]);
  assert.equal(await store.readDisplayRecords("customer:Bookings"), snapshot);
  assert.equal(reads, 0);
  const offC = store.watchRecords(
    "customer:Bookings",
    (s) => seen.push(s),
    fail,
  );
  await Promise.resolve();
  assert.equal(seen.length, 3);
  const offD = store.watchRecords(
    "customer:Bookings",
    (s) => seen.push(s),
    fail,
  );
  offD();
  await Promise.resolve();
  assert.equal(seen.length, 3);
  offA();
  offB();
  assert.equal(stops, 0);
  offC();
  offC();
  assert.equal(stops, 1);
  const offE = store.watchRecords("customer:Bookings", () => {}, fail);
  assert.equal(starts, 2);
  offC();
  assert.equal(stops, 1);
  offE();
  assert.equal(stops, 2);
});

test("shared listener failures reach subscribers and prevent stale display reads", async () => {
  let reject, received;
  const store = load("src/app/bookingStore.ts", {
    "firebase/firestore": {
      collection: (_, path) => path,
      onSnapshot: (_, next, error) => {
        next({ docs: [] });
        reject = error;
        return () => {};
      },
    },
  });
  const off = store.watchRecords(
    "admin:rooms",
    () => {},
    (error) => {
      received = error;
    },
  );
  const failure = new Error("permission-denied");
  reject(failure);
  assert.equal(received, failure);
  await assert.rejects(store.readDisplayRecords("admin:rooms"), failure);
  off();
});

test("customer notifications share deterministic IDs and preserve destinations and error policies", async () => {
  const writes = [];
  let fail = false;
  const { customerNotifier } = load("src/app/activitylogss.ts", {
    "firebase/firestore": {
      doc: (_, collection, id) => `${collection}/${id}`,
      serverTimestamp: () => "server-time",
      setDoc: async (...args) => {
        if (fail) throw new Error("offline");
        writes.push(args);
      },
    },
  });
  const event = {
    customerId: "user",
    eventId: "event.1",
    title: "Updated",
    message: "Saved",
    targetPath: "/bookings",
  };
  for (const type of ["booking", "payment", "inquiry"]) {
    assert.equal(await customerNotifier(type)(event), true);
    assert.equal(writes.at(-1)[0], "Notifications/user_event%2E1");
    assert.equal(writes.at(-1)[1].type, type);
    assert.equal(writes.at(-1)[1].targetPath, "/bookings");
    assert.deepEqual(writes.at(-1)[2], { merge: true });
  }
  assert.equal(
    await customerNotifier("booking")({ ...event, customerId: "" }),
    false,
  );
  assert.equal(writes.length, 3);
  fail = true;
  await assert.rejects(customerNotifier("payment", true)(event), /offline/);
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(await customerNotifier("booking")(event), false);
  } finally {
    console.error = original;
  }
});

test("payment arithmetic is exact in centavos and preserves both balance aliases", () => {
  const result = values.paymentUpdate(
    { totalPrice: 0.3, amountPaid: 0.1 },
    0.2,
  );
  assert.equal(result.amountPaid, 0.3);
  assert.equal(result.balance, 0);
  assert.equal(result.remainingBalance, 0);
  assert.equal(result.paymentStatus, "paid");
});
test("payments reject overpayment, cancelled bookings, negative and fractional-cent amounts", () => {
  for (const amount of [0, -1, 100.01, 0.001, Infinity, NaN])
    assert.throws(() => values.paymentUpdate({ total: 100 }, amount));
  assert.throws(() =>
    values.paymentUpdate({ total: 100, status: "Cancelled" }, 1),
  );
});
test("pending and rejected receipts do not count as collections", () => {
  assert.equal(
    values.completedPayment({ status: "pending_verification" }),
    false,
  );
  assert.equal(
    values.completedPayment({
      status: "completed",
      verificationStatus: "rejected",
    }),
    false,
  );
  assert.equal(
    values.pendingPayment({
      status: "pending_verification",
      verificationStatus: "pending",
    }),
    true,
  );
  assert.equal(values.pendingPayment({ status: "completed" }), false);
});
test("sales combines both channels, excludes cancelled values, and divides room revenue by room nights", () => {
  const summary = values.salesSummary(
    [
      {
        totalPrice: 420,
        roomSubtotal: 400,
        checkIn: "2026-11-01",
        checkOut: "2026-11-03",
        roomCount: 2,
        bookingSource: "Walk-in",
      },
      {
        totalPrice: 100,
        roomSubtotal: 100,
        checkIn: "2026-11-01",
        checkOut: "2026-11-02",
      },
      { totalPrice: 999, status: "cancelled" },
    ],
    new Date(2026, 10, 1),
  );
  assert.equal(summary.totalRevenue, 520);
  assert.equal(summary.totalBookings, 2);
  assert.equal(summary.avgDailyRate, 100);
  assert.deepEqual(
    summary.bookingChannels.map((c) => c.value),
    [50, 50],
  );
});
test("route roles fail closed, allow manager reception work, and keep personnel-only accounts out", () => {
  assert.equal(access.canEnter("Receptionist", "admin"), false);
  assert.equal(access.canEnter("Manager", "receptionist"), true);
  assert.equal(access.canEnter("Staff", "receptionist"), false);
  assert.equal(access.accountAllowed({ status: "Inactive" }), true);
  assert.equal(access.accountAllowed({ status: "Disabled" }), false);
});
test("check-in and check-out reject invalid sequence, dates and unpaid balances", () => {
  assert.throws(() => validateTransition({ status: "pending" }, "checked-in"));
  assert.throws(() =>
    validateTransition(
      { status: "confirmed", checkIn: "2026-11-05", checkOut: "2026-11-06" },
      "checked-in",
      "2026-11-01",
    ),
  );
  assert.throws(() =>
    validateTransition(
      { status: "checked-in", total: 100, amountPaid: 99 },
      "checked-out",
    ),
  );
  assert.doesNotThrow(() =>
    validateTransition(
      { status: "checked-in", total: 100, amountPaid: 100 },
      "checked-out",
    ),
  );
  assert.throws(() =>
    validateTransition({ status: "checked-in" }, "cancelled"),
  );
});
test("guest profiles overlay all booking history without creating fake bookings", () => {
  const guests = aggregateGuests(
    [
      {
        id: "a",
        customerName: "Old",
        customerEmail: "a@example.invalid",
        amountPaid: 50,
        checkIn: "2026-10-01",
      },
      {
        id: "b",
        customerName: "Old",
        customerEmail: "A@example.invalid",
        amountPaid: 25,
        checkIn: "2026-11-01",
      },
      {
        id: "c",
        customerEmail: "a@example.invalid",
        amountPaid: 999,
        status: "cancelled",
      },
    ],
    [
      {
        id: "profile",
        identityKey: "email:a@example.invalid",
        name: "Corrected",
        email: "new@example.invalid",
      },
    ],
  );
  assert.equal(guests.length, 1);
  assert.equal(guests[0].visits, 2);
  assert.equal(guests[0].totalSpent, 75);
  assert.equal(guests[0].name, "Corrected");
});
test("same-name guests without shared contact details are not merged", () => {
  const guests = aggregateGuests(
    [
      { id: "a", customerName: "Sam" },
      { id: "b", customerName: "Sam" },
    ],
    [],
  );
  assert.equal(guests.length, 2);
});
test("CSV handles quotes, commas, newlines and spreadsheet formulas", () => {
  const csv = toCsv([['A, "B"', "=SUM(A1)", "line\nline", 1234.5]]);
  assert.ok(csv.includes('"A, ""B"""'));
  assert.ok(csv.includes('"\'=SUM(A1)"'));
  assert.ok(csv.includes('"1234.5"'));
});
test("backup parser rejects unknown collections and malformed document paths", () => {
  for (const path of ["Users/../x", "Secrets/x", "rooms//x", "rooms/a/extra"])
    assert.throws(() =>
      validateBackup({
        version: 1,
        records: [{ store: "staff", path, data: {} }],
      }),
    );
  assert.doesNotThrow(() =>
    validateBackup({
      version: 1,
      records: [{ store: "staff", path: "rooms/a", data: {} }],
    }),
  );
});
