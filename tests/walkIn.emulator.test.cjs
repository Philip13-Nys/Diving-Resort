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
    sdk.setDoc(sdk.doc(db, "Users/reception"), {
      name: "Receptionist",
      role: "Receptionist",
    }),
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
    sdk.setDoc(sdk.doc(db, "paymentSettings/gcash"), {
      downPaymentPercent: 50,
    }),
  ]);
});
after(async () => {
  if (!host) return;
  await Promise.all(apps.map((app) => require("firebase/app").deleteApp(app)));
});

integration(
  "permanent references are sequential, shared, and safe under concurrent assignment",
  async () => {
    const { ensureRecordReferences } = operations("src/app/bookingStore.ts");
    await Promise.all([
      ensureRecordReferences("BK", ["booking-a", "booking-b"]),
      ensureRecordReferences("BK", ["booking-b", "booking-c"]),
    ]);
    const references = await Promise.all(
      ["booking-a", "booking-b", "booking-c"].map((id) =>
        sdk.getDoc(sdk.doc(db, "DisplayReferences", `BK_${id}`)),
      ),
    );
    assert.deepEqual(references.map((item) => item.data().value).sort(), [
      "BK-001",
      "BK-002",
      "BK-003",
    ]);
    await ensureRecordReferences("BK", ["booking-a"]);
    assert.equal(
      (await sdk.getDoc(sdk.doc(db, "DisplayCounters/BK"))).data().last,
      3,
    );
    await ensureRecordReferences("RCP", ["receipt-a"]);
    assert.equal(
      (await sdk.getDoc(sdk.doc(db, "DisplayReferences/RCP_receipt-a"))).data()
        .value,
      "RCP-001",
    );
  },
);
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
  "online confirmed reservations prevent a Walk-in from taking the final room",
  async () => {
    await sdk.setDoc(sdk.doc(customerDb, "Bookings/online"), {
      roomId: "deluxe",
      roomName: "Deluxe",
      roomCount: 1,
      status: "confirmed",
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

function operations(file) {
  return load(file, {
    "./firebase": {
      db,
      customerDb,
      auth: { currentUser: { uid: "reception", displayName: "Receptionist" } },
    },
  });
}
integration(
  "staff GCash review updates the staff database and exact payment balances",
  async () => {
    await sdk.setDoc(sdk.doc(db, "reservations/receipt-booking"), {
      customerName: "Guest",
      status: "confirmed",
      totalPrice: 0.3,
      amountPaid: 0.1,
    });
    await sdk.setDoc(sdk.doc(db, "Payments/submission"), {
      bookingId: "receipt-booking",
      amount: 0.2,
      status: "pending_verification",
      verificationStatus: "pending",
    });
    const { reviewPayment } = operations("src/app/bookingOperations.ts");
    await reviewPayment("staff", "submission", "receipt-booking", true);
    const record = (
      await sdk.getDoc(sdk.doc(db, "reservations/receipt-booking"))
    ).data();
    assert.equal(record.amountPaid, 0.3);
    assert.equal(record.balance, 0);
    assert.equal(record.paymentStatus, "paid");
  },
);
integration(
  "concurrent verification and rejection can commit only one review",
  async () => {
    await sdk.setDoc(sdk.doc(customerDb, "Bookings/b"), {
      status: "confirmed",
      totalPrice: 100,
      amountPaid: 0,
    });
    await sdk.setDoc(sdk.doc(customerDb, "Payments/p"), {
      bookingId: "b",
      amount: 40,
      status: "pending_verification",
      verificationStatus: "pending",
    });
    const { reviewPayment } = operations("src/app/bookingOperations.ts");
    const result = await Promise.allSettled([
      reviewPayment("customer", "p", "b", true),
      reviewPayment("customer", "p", "b", false),
    ]);
    assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
    const payment = (
      await sdk.getDoc(sdk.doc(customerDb, "Payments/p"))
    ).data();
    const booking = (
      await sdk.getDoc(sdk.doc(customerDb, "Bookings/b"))
    ).data();
    assert.equal(booking.amountPaid, payment.status === "completed" ? 40 : 0);
  },
);
integration(
  "booking edits preserve payments recorded after the editor opened",
  async () => {
    await saveWalkIn(input, 210, "edit-booking");
    await sdk.updateDoc(sdk.doc(db, "reservations/edit-booking"), {
      amountPaid: 100,
    });
    const { changeBooking } = operations("src/app/bookingOperations.ts");
    await changeBooking(
      "edit-booking",
      "staff",
      "edit",
      { uid: "reception", name: "Receptionist" },
      {
        guest: "Updated",
        email: "",
        phone: "123",
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        pax: 2,
        amount: 210,
        paid: 50,
        room: "101",
        notes: "",
      },
    );
    const booking = (
      await sdk.getDoc(sdk.doc(db, "reservations/edit-booking"))
    ).data();
    assert.equal(booking.amountPaid, 100);
    assert.equal(booking.balance, 110);
    assert.equal(booking.nights, 2);
  },
);
integration(
  "online confirmation allocates a physical room without changing its room type",
  async () => {
    await sdk.setDoc(sdk.doc(customerDb, "Bookings/online"), {
      roomId: "deluxe",
      roomName: "Deluxe",
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: 2,
      status: "pending",
      totalPrice: 210,
      amountPaid: 105,
      paymentStatus: "partial",
    });
    const { changeBooking } = operations("src/app/bookingOperations.ts");
    await changeBooking("online", "customer", "confirmed", {
      uid: "reception",
      name: "Receptionist",
    });
    const booking = (
      await sdk.getDoc(sdk.doc(customerDb, "Bookings/online"))
    ).data();
    assert.equal(booking.roomId, "deluxe");
    assert.deepEqual(booking.assignedRoomIds, ["room1"]);
    assert.equal(booking.status, "confirmed");
  },
);
integration(
  "checkout rejects an unpaid balance and leaves booking and room intact",
  async () => {
    await sdk.setDoc(sdk.doc(db, "reservations/unpaid"), {
      bookingSource: "Walk-in",
      roomId: "deluxe",
      status: "checked-in",
      totalPrice: 100,
      amountPaid: 10,
      assignedRoomIds: ["room1"],
    });
    const { changeBooking } = operations("src/app/bookingOperations.ts");
    await assert.rejects(
      changeBooking("unpaid", "staff", "checked-out", {
        uid: "reception",
        name: "Receptionist",
      }),
      /remaining balance/,
    );
    assert.equal(
      (await sdk.getDoc(sdk.doc(db, "reservations/unpaid"))).data().status,
      "checked-in",
    );
  },
);
integration(
  "saving a standalone guest creates a profile, not a fake reservation",
  async () => {
    const { saveGuestProfile, getGuests } = operations(
      "src/app/bookingStore.ts",
    );
    await saveGuestProfile({
      name: "Guest",
      email: "guest@example.invalid",
      phone: "123",
    });
    assert.equal((await sdk.getDocs(sdk.collection(db, "Guests"))).size, 1);
    assert.equal(
      (await sdk.getDocs(sdk.collection(db, "reservations"))).size,
      0,
    );
    assert.equal((await getGuests())[0].visits, 0);
  },
);
integration(
  "disabled accounts cannot review payments even with an existing session",
  async () => {
    await sdk.updateDoc(sdk.doc(db, "Users/reception"), { status: "Disabled" });
    const { reviewPayment } = operations("src/app/bookingOperations.ts");
    await assert.rejects(reviewPayment("staff", "p", "b", true), /permission/);
  },
);

integration(
  "two online confirmations compete atomically for one physical room",
  async () => {
    await sdk.setDoc(sdk.doc(db, "paymentSettings/gcash"), {
      downPaymentPercent: 50,
    });
    for (const id of ["first-online", "second-online"])
      await sdk.setDoc(sdk.doc(customerDb, "Bookings", id), {
        userId: id,
        roomId: "deluxe",
        roomName: "Deluxe",
        roomCount: 1,
        guests: 2,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        status: "pending",
        requestVersion: 2,
        totalPrice: 210,
        amountPaid: 105,
        paymentStatus: "partial",
        addOns: [],
      });
    const { changeBooking } = operations("src/app/bookingOperations.ts");
    const result = await Promise.allSettled(
      ["first-online", "second-online"].map((id) =>
        changeBooking(id, "customer", "confirmed", {
          uid: "reception",
          name: "Receptionist",
        }),
      ),
    );
    assert.equal(
      result.filter((item) => item.status === "fulfilled").length,
      1,
    );
    assert.match(
      result.find((item) => item.status === "rejected").reason.message,
      /remain available/,
    );
    const records = await sdk.getDocs(sdk.collection(customerDb, "Bookings"));
    assert.equal(
      records.docs.filter((item) => item.data().status === "confirmed").length,
      1,
    );
  },
);

integration(
  "payment review releases a request for staff review but does not confirm it",
  async () => {
    await sdk.setDoc(sdk.doc(customerDb, "Bookings", "new-request"), {
      status: "pending-payment-verification",
      requestVersion: 2,
      totalPrice: 210,
      amountPaid: 0,
      paymentStatus: "pending_verification",
    });
    await sdk.setDoc(sdk.doc(customerDb, "Payments", "new-receipt"), {
      bookingId: "new-request",
      amount: 105,
      status: "pending",
      verificationStatus: "pending",
    });
    const { reviewPayment } = operations("src/app/bookingOperations.ts");
    await reviewPayment("customer", "new-receipt", "new-request", true);
    const record = (
      await sdk.getDoc(sdk.doc(customerDb, "Bookings", "new-request"))
    ).data();
    assert.equal(record.status, "pending");
    assert.equal(record.amountPaid, 105);
    assert.equal(record.paymentStatus, "partial");
    await assert.rejects(
      reviewPayment("customer", "new-receipt", "new-request", true),
      /already been reviewed/,
    );
  },
);

integration(
  "staff confirmation rejects a customer-supplied total that differs from the catalog",
  async () => {
    await sdk.setDoc(sdk.doc(db, "paymentSettings/gcash"), {
      downPaymentPercent: 50,
    });
    await sdk.setDoc(sdk.doc(customerDb, "Bookings", "tampered-quote"), {
      roomId: "deluxe",
      roomName: "Deluxe",
      roomCount: 1,
      guests: 2,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      status: "pending",
      requestVersion: 2,
      totalPrice: 1,
      amountPaid: 1,
      paymentStatus: "paid",
      addOns: [],
    });
    const { changeBooking } = operations("src/app/bookingOperations.ts");
    await assert.rejects(
      changeBooking("tampered-quote", "customer", "confirmed", {
        uid: "reception",
        name: "Receptionist",
      }),
      /differs from the resort catalog/,
    );
    assert.equal(
      (
        await sdk.getDoc(sdk.doc(customerDb, "Bookings", "tampered-quote"))
      ).data().status,
      "pending",
    );
  },
);

integration(
  "walk-in activity add-ons and online services share capacity through real booking writes",
  async () => {
    await sdk.setDoc(sdk.doc(db, "services/snorkel"), {
      name: "Snorkeling",
      status: "active",
      price: 100,
      maxParticipants: 5,
      availability: {
        capacity: 5,
        durationMinutes: 60,
        opensAt: "08:00",
        closesAt: "12:00",
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    });
    const activityInput = {
      ...input,
      selectedAddOns: ["service-snorkel"],
      activitySchedules: {
        "service-snorkel": {
          bookingDate: input.checkIn,
          bookingTime: "08:00",
          participants: 2,
        },
      },
    };
    await saveWalkIn(activityInput, 420, "walkin-activity");
    const walkin = (
      await sdk.getDoc(sdk.doc(db, "reservations/walkin-activity"))
    ).data();
    assert.equal(walkin.addOns[0].price, 200);
    assert.equal(walkin.addOns[0].unitPrice, 100);
    assert.equal(walkin.addOns[0].participants, 2);
    assert.equal(walkin.activityReservations[0].participants, 2);
    const onlineRef = sdk.doc(customerDb, "Bookings/activity-online");
    await sdk.setDoc(onlineRef, {
      bookingType: "service",
      itemType: "service",
      itemId: "snorkel",
      serviceId: "snorkel",
      itemName: "Snorkeling",
      status: "pending",
      bookingDate: input.checkIn,
      bookingTime: "08:00",
      checkIn: input.checkIn,
      checkOut: input.checkIn,
      participants: 4,
      guests: 4,
      totalPrice: 400,
      amountPaid: 200,
      paymentStatus: "partial",
      requestVersion: 2,
    });
    const { changeBooking } = operations("src/app/bookingOperations.ts");
    const actor = { uid: "reception", name: "Receptionist" };
    await assert.rejects(
      changeBooking("activity-online", "customer", "confirmed", actor),
      /enough available places/,
    );
    assert.equal((await sdk.getDoc(onlineRef)).data().status, "pending");
    await sdk.updateDoc(onlineRef, { bookingTime: "09:00" });
    await changeBooking("activity-online", "customer", "confirmed", actor);
    assert.equal((await sdk.getDoc(onlineRef)).data().status, "confirmed");
    const lock = (
      await sdk.getDoc(sdk.doc(db, "BookingLocks/activityInventory"))
    ).data();
    assert.equal(
      lock.allocations["staff_walkin-activity"].requests[0].participants,
      2,
    );
    assert.equal(
      lock.allocations["customer_activity-online"].requests[0].participants,
      4,
    );
    await changeBooking("activity-online", "customer", "edit", actor, {
      guest: "Activity Guest",
      checkIn: input.checkIn,
      checkOut: input.checkIn,
      bookingDate: input.checkIn,
      bookingTime: "09:00",
      pax: 3,
      amount: 300,
      addOns: [],
    });
    assert.equal(
      (await sdk.getDoc(onlineRef)).data().activityReservations[0].participants,
      3,
    );
    await changeBooking("activity-online", "customer", "cancelled", actor);
    const afterCancel = (
      await sdk.getDoc(sdk.doc(db, "BookingLocks/activityInventory"))
    ).data();
    assert.equal(
      afterCancel.allocations["customer_activity-online"],
      undefined,
    );
    assert.equal(
      afterCancel.allocations["staff_walkin-activity"].requests[0].participants,
      2,
    );
  },
);

integration(
  "physical service units persist through walk-in, online confirmation, modification and cancellation",
  async () => {
    await sdk.setDoc(sdk.doc(db, "services/boat"), {
      name: "Banana boat",
      status: "active",
      price: 100,
      maxParticipants: 15,
      availability: {
        capacity: 3,
        capacityType: "units",
        participantsPerUnit: 5,
        durationMinutes: 60,
        opensAt: "08:00",
        closesAt: "12:00",
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    });
    const activityInput = {
      ...input,
      selectedAddOns: ["service-boat"],
      activitySchedules: {
        "service-boat": {
          bookingDate: input.checkIn,
          bookingTime: "08:00",
          participants: 2,
          quantity: 2,
        },
      },
    };
    await saveWalkIn(activityInput, 420, "walkin-units");
    const walkin = (
      await sdk.getDoc(sdk.doc(db, "reservations/walkin-units"))
    ).data();
    assert.equal(walkin.addOns[0].quantity, 2);
    assert.equal(walkin.addOns[0].participants, 2);
    assert.equal(walkin.addOns[0].price, 200);
    assert.equal(walkin.activityReservations[0].quantity, 2);
    const online = sdk.doc(customerDb, "Bookings/online-units");
    await sdk.setDoc(online, {
      bookingType: "service",
      itemType: "service",
      itemId: "boat",
      serviceId: "boat",
      itemName: "Banana boat",
      status: "pending",
      bookingDate: input.checkIn,
      bookingTime: "08:00",
      checkIn: input.checkIn,
      checkOut: input.checkIn,
      participants: 2,
      quantity: 2,
      guests: 2,
      totalPrice: 200,
      amountPaid: 100,
      paymentStatus: "partial",
      requestVersion: 2,
    });
    const { changeBooking } = operations("src/app/bookingOperations.ts"),
      actor = { uid: "reception", name: "Receptionist" };
    await assert.rejects(
      changeBooking("online-units", "customer", "confirmed", actor),
      /enough available places/,
    );
    await sdk.updateDoc(online, { bookingTime: "09:00" });
    await changeBooking("online-units", "customer", "confirmed", actor);
    const current = (await sdk.getDoc(online)).data();
    await assert.rejects(
      changeBooking("online-units", "customer", "edit", actor, {
        ...current,
        guest: "Unit Guest",
        pax: 2,
        amount: 200,
        bookingTime: "08:00",
        quantity: 3,
      }),
      /enough available places/,
    );
    await changeBooking("walkin-units", "staff", "cancelled", actor);
    await changeBooking("online-units", "customer", "edit", actor, {
      ...current,
      guest: "Unit Guest",
      pax: 2,
      amount: 200,
      bookingTime: "08:00",
      quantity: 3,
    });
    const updated = (await sdk.getDoc(online)).data();
    assert.equal(updated.quantity, 3);
    assert.equal(updated.participants, 2);
    assert.equal(updated.totalPrice, 200);
    const allocations = (
      await sdk.getDoc(sdk.doc(db, "BookingLocks/activityInventory"))
    ).data().allocations;
    assert.equal(allocations["customer_online-units"].requests[0].quantity, 3);
    assert.equal(allocations["staff_walkin-units"], undefined);
  },
);

integration(
  "removing all activities during a room modification releases its old allocation",
  async () => {
    await sdk.setDoc(sdk.doc(db, "services/snorkel"), {
      name: "Snorkeling",
      status: "active",
      price: 100,
      availability: {
        capacity: 5,
        durationMinutes: 60,
        opensAt: "08:00",
        closesAt: "12:00",
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    });
    const activityInput = {
      ...input,
      selectedAddOns: ["service-snorkel"],
      activitySchedules: {
        "service-snorkel": {
          bookingDate: input.checkIn,
          bookingTime: "08:00",
          participants: 2,
        },
      },
    };
    await saveWalkIn(activityInput, 420, "remove-addons");
    assert.ok(
      (await sdk.getDoc(sdk.doc(db, "BookingLocks/activityInventory"))).data()
        .allocations["staff_remove-addons"],
    );
    const { changeBooking } = operations("src/app/bookingOperations.ts");
    await changeBooking(
      "remove-addons",
      "staff",
      "edit",
      { uid: "reception", name: "Receptionist" },
      {
        guest: "Test Guest",
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        pax: 2,
        amount: 210,
        addOns: [],
      },
    );
    const booking = (
      await sdk.getDoc(sdk.doc(db, "reservations/remove-addons"))
    ).data();
    assert.deepEqual(booking.addOns, []);
    assert.deepEqual(booking.activityReservations, []);
    assert.equal(
      (await sdk.getDoc(sdk.doc(db, "BookingLocks/activityInventory"))).data()
        .allocations["staff_remove-addons"],
      undefined,
    );
  },
);

integration(
  "packages save, confirm and edit without schedules, service links or inventory limits",
  async () => {
    await sdk.setDoc(sdk.doc(db, "packages/family"), {
      name: "Family package",
      packagePrice: 50,
      status: "active",
      services: ["Snorkeling"],
      serviceIds: ["snorkel"],
      availability: { capacity: 0 },
    });
    const withPackage = {
      ...input,
      selectedAddOns: ["package-family"],
      activitySchedules: {
        "package-family": {
          bookingDate: input.checkIn,
          bookingTime: "",
          participants: 2,
        },
      },
    };
    await saveWalkIn(withPackage, 315, "walkin-package");
    const walkin = (
      await sdk.getDoc(sdk.doc(db, "reservations/walkin-package"))
    ).data();
    assert.equal(walkin.addOns[0].participants, 2);
    assert.equal(walkin.addOns[0].price, 100);
    assert.equal(walkin.addOns[0].bookingTime, "");
    assert.equal(
      (
        await sdk.getDoc(sdk.doc(db, "BookingLocks/activityInventory"))
      ).exists(),
      false,
    );
    const online = sdk.doc(customerDb, "Bookings/online-package");
    await sdk.setDoc(online, {
      bookingType: "package",
      itemType: "package",
      itemId: "family",
      packageId: "family",
      itemName: "Family package",
      status: "pending",
      bookingDate: input.checkIn,
      checkIn: input.checkIn,
      checkOut: input.checkIn,
      participants: 2,
      guests: 2,
      totalPrice: 100,
      amountPaid: 50,
      paymentStatus: "partial",
      requestVersion: 2,
    });
    const { changeBooking } = operations("src/app/bookingOperations.ts"),
      actor = { uid: "reception", name: "Receptionist" };
    await changeBooking("online-package", "customer", "confirmed", actor);
    assert.equal((await sdk.getDoc(online)).data().status, "confirmed");
    await changeBooking("online-package", "customer", "edit", actor, {
      guest: "Package Guest",
      pax: 3,
      amount: 150,
      bookingDate: input.checkIn,
      checkIn: input.checkIn,
      checkOut: input.checkIn,
      addOns: [],
    });
    const edited = (await sdk.getDoc(online)).data();
    assert.equal(edited.participants, 3);
    assert.equal(edited.bookingTime, "");
    assert.equal(edited.totalPrice, 150);
    assert.deepEqual(edited.activityReservations, []);
  },
);
