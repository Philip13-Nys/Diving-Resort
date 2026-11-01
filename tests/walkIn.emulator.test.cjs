const { test, before, beforeEach, after } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-ts.cjs");
const host = process.env.FIRESTORE_EMULATOR_HOST;
const integration = host ? test : test.skip;
const project = "demo-resort-walkin-admin";
const customerProject = "demo-resort-walkin-customer";
const arrival = new Date();
arrival.setDate(arrival.getDate() + 7);
const departure = new Date(arrival);
departure.setDate(departure.getDate() + 2);
const dateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
let sdk,
  db,
  customerDb,
  saveWalkIn,
  apps = [];
const input = {
  firstName: "Test",
  lastName: "Guest",
  email: "test@example.invalid",
  phone: "09123456789",
  checkIn: dateString(arrival),
  checkOut: dateString(departure),
  pax: 2,
  selectedRoomType: "deluxe",
  roomQuantity: 1,
  selectedAddOns: [],
  commissionerName: "Ana",
  commissionAmount: "25.50",
  paymentMethod: "card",
  downPayment: "50",
  specialRequests: "",
};
async function rules(projectId, content) {
  const response = await fetch(
    `http://${host}/emulator/v1/projects/${projectId}:securityRules`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: { files: [{ name: "firestore.rules", content }] },
      }),
    },
  );
  assert.equal(response.ok, true, await response.text());
}
const open =
  "rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if true; } } }";
before(async () => {
  if (!host) return;
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host))
    throw new Error("Only a localhost emulator may be used.");
  sdk = require("firebase/firestore");
  const { initializeApp } = require("firebase/app");
  for (const projectId of [project, customerProject]) {
    const app = initializeApp(
      { projectId, apiKey: "emulator-only", appId: "emulator-only" },
      projectId,
    );
    apps.push(app);
    const store = sdk.getFirestore(app);
    const [hostname, port] = host.split(":");
    sdk.connectFirestoreEmulator(store, hostname, Number(port));
    if (projectId === project) db = store;
    else customerDb = store;
  }
  ({ saveWalkIn } = load("src/app/saveWalkIn.ts", {
    "./firebase": {
      db,
      customerDb,
      auth: { currentUser: { uid: "reception", displayName: "Receptionist" } },
    },
  }));
  await rules(project, open);
});
beforeEach(async () => {
  if (!host) return;
  await rules(project, open);
  await rules(customerProject, open);
  for (const projectId of [project, customerProject]) {
    const response = await fetch(
      `http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { method: "DELETE" },
    );
    assert.equal(response.ok, true);
  }
  await Promise.all([
    sdk.setDoc(sdk.doc(db, "Users/reception"), { name: "Receptionist" }),
    sdk.setDoc(sdk.doc(db, "roomTypes/deluxe"), {
      name: "Deluxe",
      maxGuests: 2,
      basePrice: 100,
    }),
    sdk.setDoc(sdk.doc(db, "rooms/room1"), {
      type: "Deluxe",
      roomNumber: 101,
      status: "available",
    }),
    sdk.setDoc(sdk.doc(db, "settings/reservationFee"), { percent: 5 }),
  ]);
});
after(async () => {
  if (!host) return;
  await Promise.all(apps.map((app) => require("firebase/app").deleteApp(app)));
});
integration(
  "real client transaction writes online-compatible booking, payment and commission together",
  async () => {
    const result = await saveWalkIn(input, 210, "booking-one");
    const booking = (
      await sdk.getDoc(sdk.doc(db, "reservations/booking-one"))
    ).data();
    const payment = (
      await sdk.getDoc(sdk.doc(db, "Payments/walkin-booking-one"))
    ).data();
    assert.equal(result.reference, booking.bookingRef);
    assert.equal(booking.roomId, "deluxe");
    assert.equal(booking.roomCount, 1);
    assert.deepEqual(booking.assignedRoomIds, ["room1"]);
    assert.equal(booking.totalPrice, 210);
    assert.equal(booking.commissionerName, "Ana");
    assert.equal(booking.commissionAmount, 25.5);
    assert.equal(payment.method, "card");
    assert.equal(payment.amount, 50);
    const { commissionRows } = load("src/app/commissionReport.ts");
    assert.equal(
      commissionRows(
        [{ ...booking, id: "booking-one" }],
        arrival.getMonth(),
        arrival.getFullYear(),
      )[0].commission,
      25.5,
    );
  },
);
integration(
  "retrying the same request creates one booking and one payment",
  async () => {
    const [first, second] = await Promise.all([
      saveWalkIn(input, 210, "retry"),
      saveWalkIn(input, 210, "retry"),
    ]);
    assert.equal(first.reference, second.reference);
    assert.equal(
      (await sdk.getDocs(sdk.collection(db, "reservations"))).size,
      1,
    );
    assert.equal((await sdk.getDocs(sdk.collection(db, "Payments"))).size, 1);
  },
);
integration(
  "two Walk-in clients competing for the last room cannot both commit",
  async () => {
    const results = await Promise.allSettled([
      saveWalkIn(input, 210, "first"),
      saveWalkIn(input, 210, "second"),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal(
      (await sdk.getDocs(sdk.collection(db, "reservations"))).size,
      1,
    );
  },
);
integration(
  "online pending reservations prevent a Walk-in from taking the final room",
  async () => {
    await sdk.setDoc(sdk.doc(customerDb, "Bookings/online"), {
      roomId: "deluxe",
      roomName: "Deluxe",
      roomCount: 1,
      status: "pending",
      checkIn: input.checkIn,
      checkOut: input.checkOut,
    });
    await assert.rejects(saveWalkIn(input, 210, "walkin"), /remain available/);
    assert.equal(
      (await sdk.getDocs(sdk.collection(customerDb, "Bookings"))).size,
      1,
    );
    assert.equal(
      (await sdk.getDocs(sdk.collection(db, "reservations"))).size,
      0,
    );
    assert.equal((await sdk.getDocs(sdk.collection(db, "Payments"))).size, 0);
  },
);
integration(
  "stale prices reject the transaction without creating a booking or payment",
  async () => {
    await sdk.updateDoc(sdk.doc(db, "roomTypes/deluxe"), { basePrice: 150 });
    await assert.rejects(
      saveWalkIn(input, 210, "stale-price"),
      /Prices have changed/,
    );
    assert.equal(
      (await sdk.getDocs(sdk.collection(db, "reservations"))).size,
      0,
    );
    assert.equal((await sdk.getDocs(sdk.collection(db, "Payments"))).size, 0);
  },
);
integration(
  "payment permission failure rolls back the entire Walk-in save",
  async () => {
    await rules(
      project,
      "rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read: if true; } match /reservations/{id} { allow write: if true; } match /BookingLocks/{id} { allow write: if true; } } }",
    );
    await assert.rejects(saveWalkIn(input, 210, "denied"));
    assert.equal(
      (await sdk.getDocs(sdk.collection(db, "reservations"))).size,
      0,
    );
    assert.equal((await sdk.getDocs(sdk.collection(db, "Payments"))).size, 0);
  },
);
integration(
  "Walk-ins work without a Customer-project login or customer booking-create permission",
  async () => {
    await rules(
      customerProject,
      "rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /Bookings/{id} { allow read: if true; allow create: if request.auth != null; allow update, delete: if true; } match /Payments/{id} { allow read, write: if true; } } }",
    );
    await saveWalkIn(input, 210, "staff-only");
    assert.equal(
      (await sdk.getDocs(sdk.collection(db, "reservations"))).size,
      1,
    );
    assert.equal(
      (await sdk.getDocs(sdk.collection(customerDb, "Bookings"))).size,
      0,
    );
    const store = load("src/app/bookingStore.ts", {
      "./firebase": { db, customerDb },
    });
    const snapshot = await store.getBookingSnapshot();
    assert.equal(snapshot.size, 1);
    assert.equal(snapshot.docs[0].data()._bookingStore, "staff");
    const reference = await store.getBookingRef("staff-only");
    assert.equal(reference.path, "reservations/staff-only");
    await sdk.updateDoc(reference, { status: "checked-out" });
    assert.equal(
      (await sdk.getDoc(sdk.doc(db, "reservations/staff-only"))).data().status,
      "checked-out",
    );
    assert.equal((await store.getPaymentSnapshot()).size, 1);
  },
);
