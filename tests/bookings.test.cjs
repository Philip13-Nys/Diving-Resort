const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-ts.cjs");
const rules = load("src/app/bookingAvailability.ts");
const { buildWalkInBooking, walkInTotals } = load("src/app/saveWalkIn.ts");
const { commissionRows, groupCommissions, commissionCsv } = load(
  "src/app/commissionReport.ts",
);
const plain = (value) => JSON.parse(JSON.stringify(value));
const type = { id: "deluxe", name: "Deluxe", basePrice: 100, maxGuests: 2 };
const rooms = rules.normalizeInventory(
  [1, 2, 3].map((i) => ({
    id: "r" + i,
    roomNumber: 100 + i,
    type: "Deluxe",
    status: "available",
  })),
  [type],
);
const start = "2026-12-01",
  end = "2026-12-03";
const online = {
  id: "online",
  roomId: "deluxe",
  roomName: "Deluxe",
  roomCount: 1,
  status: "pending",
  checkIn: start,
  checkOut: end,
};
const input = {
  firstName: "Test",
  lastName: "Guest",
  email: "test@example.invalid",
  phone: "09123456789",
  checkIn: start,
  checkOut: end,
  pax: 2,
  selectedRoomType: "deluxe",
  roomQuantity: 1,
  selectedAddOns: [],
  commissionerName: "Ana",
  commissionAmount: "25.50",
  paymentMethod: "cash",
  downPayment: "50",
  specialRequests: "",
};
const build = (changes = {}, today = start) =>
  buildWalkInBooking(
    { ...input, ...changes },
    type,
    rooms.slice(0, changes.roomQuantity || 1),
    [],
    5,
    "unique-id",
    { uid: "reception", name: "Receptionist" },
    today,
  );

test("online type IDs reserve capacity without reserving every physical room", () => {
  assert.equal(
    rules.typeAvailability(rooms, [online], type, start, end).available,
    2,
  );
  assert.equal(rules.roomBookingsOnDate(rooms, [online], start).size, 1);
});
test("online and Walk-in quantities are counted together", () => {
  const walkin = {
    ...online,
    id: "walkin",
    roomId: undefined,
    roomTypeId: "deluxe",
    roomCount: 2,
    assignedRoomIds: ["r1", "r2"],
    status: "checked-in",
  };
  assert.equal(
    rules.typeAvailability(rooms, [online, walkin], type, start, end).available,
    0,
  );
  assert.equal(
    rules.roomBookingsOnDate(rooms, [online, walkin], start).size,
    3,
  );
});
test("non-overlapping reservations are counted by night, not summed across a stay", () => {
  const sequential = [
    { ...online, id: "a", checkOut: "2026-12-02" },
    { ...online, id: "b", checkIn: "2026-12-02" },
  ];
  assert.equal(
    rules.typeAvailability(rooms, sequential, type, start, end).available,
    2,
  );
});
test("checkout is exclusive and cancelled/checked-out records release capacity", () => {
  assert.equal(
    rules.typeAvailability(
      rooms,
      [{ ...online, checkOut: start }],
      type,
      start,
      end,
    ).available,
    3,
  );
  for (const status of [
    "Cancelled",
    "canceled",
    "Rejected",
    "Checked Out",
    "completed",
  ])
    assert.equal(
      rules.typeAvailability(rooms, [{ ...online, status }], type, start, end)
        .available,
      3,
    );
});
test("linked legacy reservations are deduplicated, including cancelled primary bookings", () => {
  const merged = rules.mergeReservations(
    [{ ...online, status: "cancelled" }],
    [{ ...online, id: "mirror", bookingId: "online", status: "reserved" }],
  );
  assert.equal(merged.length, 1);
  assert.equal(
    rules.typeAvailability(rooms, merged, type, start, end).available,
    3,
  );
});
test("legacy physical-room reservations block that physical room", () => {
  const legacy = {
    ...online,
    roomId: "r2",
    roomName: "",
    roomTypeId: undefined,
  };
  const selected = rules.allocateRooms(rooms, [legacy], type, start, end, 2, 4);
  assert.ok(selected.every((room) => room.id !== "r2"));
});
test("maintenance, cleaning and deleted rooms cannot be allocated", () => {
  const blocked = rooms.map((room, i) => ({
    ...room,
    ...(i === 0
      ? { status: "Cleaning" }
      : i === 1
        ? { condition: "maintenance" }
        : { deleted: true }),
  }));
  assert.equal(
    rules.typeAvailability(blocked, [], type, start, end).available,
    0,
  );
  assert.throws(() => rules.allocateRooms(blocked, [], type, start, end, 1, 2));
});
test("four guests can occupy two two-person rooms, with stable physical IDs", () => {
  const selected = rules.allocateRooms(rooms, [], type, start, end, 2, 4);
  assert.equal(selected.length, 2);
  assert.throws(() => rules.allocateRooms(rooms, [], type, start, end, 1, 4));
});
test("edits can exclude their own allocation and other room types do not interfere", () => {
  const booking = { ...online, assignedRoomIds: ["r1"], id: "self" };
  assert.equal(
    rules.typeAvailability(
      rooms,
      [booking],
      { ...type, excludeBookingId: "self" },
      start,
      end,
    ).available,
    3,
  );
  assert.equal(
    rules.typeAvailability(
      rooms,
      [{ ...online, roomId: "garden", roomName: "Garden" }],
      type,
      start,
      end,
    ).available,
    3,
  );
});
test("stay validation rejects impossible dates and same-day/reversed stays", () => {
  for (const [a, b] of [
    ["2026-02-30", end],
    [end, start],
    [start, start],
  ])
    assert.throws(() => rules.stayDates(a, b));
  assert.equal(rules.stayDates(start, end).length, 2);
});
test("Walk-in stores customer-compatible aliases and separate physical assignment", () => {
  const booking = build();
  assert.equal(booking.roomId, type.id);
  assert.equal(booking.roomName, type.name);
  assert.equal(booking.roomCount, 1);
  assert.equal(booking.numberOfRooms, 1);
  assert.deepEqual(plain(booking.assignedRoomIds), ["r1"]);
  assert.equal(booking.totalPrice, booking.totalAmount);
  assert.equal(booking.remainingBalance, booking.balance);
  assert.equal(booking.customerEmail, input.email);
});
test("today checks in and future arrival remains confirmed, never prematurely occupied", () => {
  assert.equal(build().status, "checked-in");
  assert.equal(build({}, "2026-11-30").status, "confirmed");
  assert.throws(() => build({}, "2026-12-02"), /past/);
});
test("Walk-in pricing matches online reservation fee rounding and adds services once", () => {
  const result = walkInTotals(100.25, 2, 2, [{ price: 10.5 }], 5);
  assert.equal(result.roomTotal, 401);
  assert.equal(result.subtotal, 411.5);
  assert.equal(result.reservationFee, 21);
  assert.equal(result.total, 432.5);
  assert.equal(build().totalPrice, 210);
  assert.equal(build().remainingBalance, 160);
});
test("payments and commissions validate cents, limits and commissioner identity", () => {
  assert.equal(build().commissionAmount, 25.5);
  for (const changes of [
    { downPayment: "211" },
    { downPayment: "0.001" },
    { commissionerName: "" },
    { commissionAmount: "300" },
    { commissionAmount: "-1" },
    { pax: 1.5 },
    { paymentMethod: "bitcoin" },
  ])
    assert.throws(() => build(changes));
  assert.equal(build({ downPayment: "210" }).paymentStatus, "paid");
  assert.equal(build({ downPayment: "0" }).paymentStatus, "unpaid");
});
test("commission report connects Walk-in fields, groups names and excludes cancellations", () => {
  const records = [
    { ...build(), id: "first" },
    {
      ...build({ commissionerName: "ana", commissionAmount: "10" }),
      id: "second",
    },
    { ...build(), id: "cancelled", status: "Cancelled" },
    { ...build(), id: "next-month", checkIn: "2027-01-01" },
    { ...online, id: "no-commission" },
  ];
  const rows = commissionRows(records, 11, 2026),
    groups = groupCommissions(rows);
  assert.equal(rows.length, 2);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].commission, 35.5);
  assert.equal(groups[0].bookings, 2);
  assert.equal(rows[0].source, "Walk-in");
  assert.equal(rows[0].room, "101");
});
test("old Walk-in commissions, missing names and year boundaries are supported", () => {
  const rows = commissionRows(
    [
      {
        id: "old",
        status: "Confirmed",
        checkIn: "2025-12-31",
        commissionAmount: 50,
        totalAmount: 1000,
      },
    ],
    11,
    2025,
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].commissioner, "Unassigned commissioner");
  assert.equal(
    commissionRows(
      [{ ...build(), id: "bad", commissionAmount: "bad" }],
      11,
      2026,
    ).length,
    0,
  );
});
test("CSV preserves commas/quotes, exports actual commission totals and escapes formulas", () => {
  const rows = commissionRows(
    [
      {
        ...build({
          commissionerName: '=HYPERLINK("x")',
          lastName: "Guest, Jr.",
        }),
        id: "csv",
      },
    ],
    11,
    2026,
  );
  const csv = commissionCsv(rows, "December 2026");
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes("Guest, Jr."));
  assert.ok(csv.includes('"25.50"'));
  assert.ok(csv.includes("\r\n"));
});
test("staff booking views combine sources, label the store and skip mirrored duplicates", () => {
  const { mergeBookingDocuments } = load("src/app/bookingStore.ts");
  const document = (id, data) => ({ id, ref: { id }, data: () => data });
  const customer = document("online", {
    ...online,
    bookingRef: "CBR-ONLINE",
    status: "Confirmed",
    paymentStatus: "Paid",
  });
  const staff = document("staff", build());
  const mirror = document("mirror", { ...build(), bookingRef: "CBR-ONLINE" });
  const docs = mergeBookingDocuments(
    [customer],
    [staff, mirror, document("legacy", { status: "reserved" })],
  );
  assert.equal(docs.length, 2);
  assert.equal(docs[0].data()._bookingStore, "customer");
  assert.equal(docs[0].data().status, "confirmed");
  assert.equal(docs[0].data().paymentStatus, "paid");
  assert.equal(docs[1].data()._bookingStore, "staff");
});
