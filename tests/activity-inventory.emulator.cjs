const test = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-ts.cjs");
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host) {
  test(
    "activity inventory emulator tests require explicit local emulator",
    { skip: true },
    () => {},
  );
} else {
  assert.equal(
    host,
    "127.0.0.1:8788",
    "These tests must only access the isolated local activity emulator.",
  );
  const { initializeApp, deleteApp } = require("firebase/app");
  const sdk = require("firebase/firestore");
  const adminApp = initializeApp(
    { projectId: "demo-activity-admin" },
    "activity-admin-tests",
  );
  const customerApp = initializeApp(
    { projectId: "demo-activity-customer" },
    "activity-customer-tests",
  );
  const db = sdk.getFirestore(adminApp),
    customerDb = sdk.getFirestore(customerApp);
  sdk.connectFirestoreEmulator(db, "127.0.0.1", 8788);
  sdk.connectFirestoreEmulator(customerDb, "127.0.0.1", 8788);
  let unavailableRead = false;
  const inventory = load("src/app/activityInventory.ts", {
    "./firebase": { db, customerDb },
    "./auth": { requireAccess: async () => ({ uid: "test-receptionist" }) },
    "firebase/firestore": {
      ...sdk,
      getDocFromServer: (reference) => {
        if (unavailableRead) throw Error("Unknown network outcome");
        return sdk.getDocFromServer(reference);
      },
    },
    "./bookingStore": {
      getBookingSnapshot: async () => {
        const [online, walkin] = await Promise.all([
          sdk.getDocs(sdk.collection(customerDb, "Bookings")),
          sdk.getDocs(sdk.collection(db, "reservations")),
        ]);
        return {
          docs: [
            ...online.docs.map((document) => ({
              id: document.id,
              data: () => ({ ...document.data(), _bookingStore: "customer" }),
            })),
            ...walkin.docs.map((document) => ({
              id: document.id,
              data: () => ({ ...document.data(), _bookingStore: "staff" }),
            })),
          ],
        };
      },
    },
  });
  const values = load("src/app/activityAvailability.ts");
  const registry = () => sdk.doc(db, "BookingLocks", "activityInventory");
  let number = 0;
  async function fixture() {
    const id = "snorkel-" + ++number;
    const service = {
      id,
      itemType: "service",
      name: "Snorkeling " + number,
      status: "active",
      availability: {
        capacity: 5,
        opensAt: "08:00",
        closesAt: "12:00",
        durationMinutes: 60,
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    };
    await sdk.setDoc(sdk.doc(db, "services", id), service);
    const booking = (store, suffix, participants = 3) => ({
      id: "booking-" + number + "-" + suffix,
      _bookingStore: store,
      status: "pending",
      bookingType: "service",
      itemType: "service",
      itemId: id,
      bookingDate: "2099-11-10",
      bookingTime: "08:00",
      checkIn: "2099-11-10",
      checkOut: "2099-11-10",
      participants,
      guests: participants,
    });
    const ref = (booking) =>
      sdk.doc(
        booking._bookingStore === "customer" ? customerDb : db,
        booking._bookingStore === "customer" ? "Bookings" : "reservations",
        booking.id,
      );
    return { id, service, booking, ref };
  }
  test.beforeEach(async () => {
    unavailableRead = false;
    await sdk.deleteDoc(registry());
  });
  test.after(async () => {
    await Promise.all([sdk.terminate(db), sdk.terminate(customerDb)]);
    await Promise.all([deleteApp(adminApp), deleteApp(customerApp)]);
  });

  test("concurrent online and walk-in confirmations cannot exceed shared participant capacity", async () => {
    const f = await fixture(),
      online = f.booking("customer", "online"),
      walkin = f.booking("staff", "walkin");
    await Promise.all([
      sdk.setDoc(f.ref(online), online),
      sdk.setDoc(f.ref(walkin), walkin),
    ]);
    const results = await Promise.allSettled([
      inventory.holdActivityPlaces(online),
      inventory.holdActivityPlaces(walkin),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.match(
      results.find((result) => result.status === "rejected").reason.message,
      /enough available places/,
    );
    const allocations = (await sdk.getDoc(registry())).data().allocations;
    assert.equal(
      Object.values(allocations)
        .flatMap((value) => value.requests)
        .reduce((sum, request) => sum + request.participants, 0),
      3,
    );
  });

  test("confirmed and held allocations do not double count; cancellation immediately frees places", async () => {
    const f = await fixture(),
      first = f.booking("customer", "first"),
      second = f.booking("staff", "second");
    await Promise.all([
      sdk.setDoc(f.ref(first), first),
      sdk.setDoc(f.ref(second), second),
    ]);
    const hold = await inventory.holdActivityPlaces(first);
    await sdk.updateDoc(f.ref(first), {
      status: "confirmed",
      activityReservations: hold.requests,
    });
    await inventory.finishActivityHold(hold, true);
    await assert.rejects(
      inventory.holdActivityPlaces(second),
      /enough available places/,
    );
    await sdk.updateDoc(f.ref(first), { status: "cancelled" });
    const next = await inventory.holdActivityPlaces(second);
    assert.equal(next.requests[0].participants, 3);
    assert.equal(
      Object.keys((await sdk.getDoc(registry())).data().allocations).length,
      1,
    );
  });

  test("failed confirmation releases its own hold while an uncertain outcome remains reserved", async () => {
    const f = await fixture(),
      first = f.booking("customer", "failed");
    await sdk.setDoc(f.ref(first), first);
    const hold = await inventory.holdActivityPlaces(first);
    await inventory.reconcileActivityHold(hold, f.ref(first));
    assert.equal(
      Object.keys((await sdk.getDoc(registry())).data().allocations).length,
      0,
    );
    const retry = await inventory.holdActivityPlaces(first);
    unavailableRead = true;
    await assert.rejects(
      inventory.reconcileActivityHold(retry, f.ref(first)),
      /Unknown network outcome/,
    );
    unavailableRead = false;
    assert.equal(
      (await sdk.getDoc(registry())).data().allocations[retry.key].state,
      "held",
    );
    await inventory.finishActivityHold(hold, false);
    assert.equal(
      (await sdk.getDoc(registry())).data().allocations[retry.key].token,
      retry.token,
    );
  });

  test("packages require no inventory hold; separately booked room services still reserve places", async () => {
    const f = await fixture();
    const bundle = {
      id: "bundle-" + number,
      itemType: "package",
      name: "Sea package",
      status: "active",
      serviceIds: [f.id],
      availability: { ...f.service.availability, capacity: 10 },
    };
    await sdk.setDoc(sdk.doc(db, "packages", bundle.id), bundle);
    const direct = {
      ...f.booking("customer", "package"),
      bookingType: "package",
      itemType: "package",
      itemId: bundle.id,
    };
    const room = {
      id: "room-" + number,
      _bookingStore: "staff",
      status: "pending",
      bookingType: "walk-in",
      checkIn: "2099-11-10",
      checkOut: "2099-11-12",
      addOns: [
        {
          id: f.id,
          type: "service",
          bookingDate: "2099-11-10",
          bookingTime: "08:00",
          participants: 3,
        },
      ],
    };
    await Promise.all([
      sdk.setDoc(f.ref(direct), direct),
      sdk.setDoc(f.ref(room), room),
    ]);
    assert.equal(await inventory.holdActivityPlaces(direct), null);
    assert.equal(
      (await inventory.holdActivityPlaces(room)).requests[0].participants,
      3,
    );
  });
  async function unitsFixture() {
    const f = await fixture();
    f.service.price = 100;
    f.service.availability = {
      ...f.service.availability,
      capacity: 3,
      capacityType: "units",
      participantsPerUnit: 5,
    };
    await sdk.setDoc(sdk.doc(db, "services", f.id), f.service);
    return f;
  }
  const configuration = load("src/app/serviceConfiguration.ts", {
    "./firebase": { db, customerDb },
    "./auth": { requireAccess: async () => ({ uid: "manager" }) },
  });
  test("simultaneous two-unit requests compete for three physical units independently of people", async () => {
    const f = await unitsFixture();
    const bookings = ["customer", "staff"].map((store) => ({
      ...f.booking(store, store, 8),
      quantity: 2,
    }));
    await Promise.all(
      bookings.map((booking) => sdk.setDoc(f.ref(booking), booking)),
    );
    const results = await Promise.allSettled(
      bookings.map((booking) => inventory.holdActivityPlaces(booking)),
    );
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const requests = Object.values(
      (await sdk.getDoc(registry())).data().allocations,
    ).flatMap((entry) => entry.requests);
    assert.equal(
      requests.reduce((sum, entry) => sum + entry.quantity, 0),
      2,
    );
    assert.equal(requests[0].participants, 8);
  });
  test("editing unit quantities replaces the original allocation and cancellation releases it", async () => {
    const f = await unitsFixture(),
      booking = { ...f.booking("customer", "edit", 5), quantity: 1 };
    await sdk.setDoc(f.ref(booking), booking);
    const first = await inventory.holdActivityPlaces(booking);
    await sdk.updateDoc(f.ref(booking), {
      status: "confirmed",
      activityReservations: first.requests,
    });
    await inventory.finishActivityHold(first, true);
    const edit = await inventory.holdActivityPlaces({
      ...booking,
      status: "confirmed",
      quantity: 3,
    });
    await sdk.updateDoc(f.ref(booking), {
      quantity: 3,
      activityReservations: edit.requests,
    });
    await inventory.finishActivityHold(edit, true);
    assert.equal(
      (await sdk.getDoc(registry())).data().allocations[edit.key].requests[0]
        .quantity,
      3,
    );
    await sdk.updateDoc(f.ref(booking), { status: "cancelled" });
    await inventory.releaseClosedActivityPlaces(edit.key);
    const next = { ...f.booking("staff", "after", 5), quantity: 3 };
    assert.equal(
      (await inventory.holdActivityPlaces(next)).requests[0].quantity,
      3,
    );
  });
  test("manager configuration reads actual allocations and rejects unsafe changes", async () => {
    const f = await unitsFixture(),
      booking = { ...f.booking("customer", "protected", 8), quantity: 2 };
    await sdk.setDoc(f.ref(booking), booking);
    const hold = await inventory.holdActivityPlaces(booking);
    await sdk.updateDoc(f.ref(booking), {
      status: "confirmed",
      activityReservations: hold.requests,
    });
    await inventory.finishActivityHold(hold, true);
    await assert.rejects(
      configuration.saveServiceConfiguration("services", f.id, {
        ...f.service,
        availability: { ...f.service.availability, capacity: 1 },
      }),
      /below 2/,
    );
    await assert.rejects(
      configuration.saveServiceConfiguration("services", f.id, {
        ...f.service,
        availability: {
          ...f.service.availability,
          capacityType: "participants",
        },
      }),
      /Cannot change/,
    );
    await configuration.saveServiceConfiguration("services", f.id, {
      ...f.service,
      availability: { ...f.service.availability, capacity: 4 },
    });
    assert.equal(
      (await sdk.getDoc(sdk.doc(db, "services", f.id))).data().availability
        .capacity,
      4,
    );
    assert.equal((await sdk.getDoc(f.ref(booking))).data().quantity, 2);
  });
  test("a concurrent capacity reduction and confirmation cannot jointly exceed the saved capacity", async () => {
    const f = await unitsFixture(),
      old = { ...f.booking("customer", "old", 5), quantity: 1 };
    await sdk.setDoc(f.ref(old), old);
    const hold = await inventory.holdActivityPlaces(old);
    await sdk.updateDoc(f.ref(old), {
      status: "confirmed",
      activityReservations: hold.requests,
    });
    await inventory.finishActivityHold(hold, true);
    const next = { ...f.booking("staff", "new", 8), quantity: 2 };
    await sdk.setDoc(f.ref(next), next);
    const results = await Promise.allSettled([
      configuration.saveServiceConfiguration("services", f.id, {
        ...f.service,
        availability: { ...f.service.availability, capacity: 2 },
      }),
      inventory.holdActivityPlaces(next),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const capacity = (await sdk.getDoc(sdk.doc(db, "services", f.id))).data()
      .availability.capacity;
    const used = Object.values(
      (await sdk.getDoc(registry())).data().allocations,
    )
      .flatMap((entry) => entry.requests)
      .filter((entry) => entry.resourceKey === "service:" + f.id)
      .reduce((sum, entry) => sum + entry.quantity, 0);
    assert.ok(used <= capacity, used + " reserved vs " + capacity + " total");
  });

  test("an uncertain edit keeps the old session and quantity reserved until it commits", async () => {
    const f = await unitsFixture(),
      old = { ...f.booking("customer", "edit-safe", 5), quantity: 3 };
    await sdk.setDoc(f.ref(old), old);
    const confirmed = await inventory.holdActivityPlaces(old);
    await sdk.updateDoc(f.ref(old), {
      status: "confirmed",
      activityReservations: confirmed.requests,
    });
    await inventory.finishActivityHold(confirmed, true);
    const proposal = {
      ...old,
      status: "confirmed",
      quantity: 1,
      bookingTime: "09:00",
    };
    const edit = await inventory.holdActivityPlaces(proposal);
    const other = { ...f.booking("staff", "competing", 5), quantity: 1 };
    await sdk.setDoc(f.ref(other), other);
    await assert.rejects(
      inventory.holdActivityPlaces(other),
      /enough available places/,
    );
    await inventory.finishActivityHold(edit, false);
    assert.equal(
      (await sdk.getDoc(registry())).data().allocations[edit.key].requests[0]
        .quantity,
      3,
    );
    const retry = await inventory.holdActivityPlaces(proposal);
    await sdk.updateDoc(f.ref(old), {
      quantity: 1,
      bookingTime: "09:00",
      activityReservations: retry.requests,
    });
    await inventory.finishActivityHold(retry, true);
    const next = await inventory.holdActivityPlaces({ ...other, quantity: 3 });
    assert.equal(next.requests[0].quantity, 3);
  });

  test("manager can save packages without schedule fields and edit old package metadata", async () => {
    const reference = await configuration.saveServiceConfiguration(
      "packages",
      undefined,
      {
        name: "Unscheduled package",
        packagePrice: 100,
        status: "active",
        services: ["Descriptive inclusion"],
      },
    );
    assert.equal((await sdk.getDoc(reference)).data().availability, undefined);
    await sdk.updateDoc(reference, {
      availability: { capacity: 0 },
      serviceIds: ["old-link"],
    });
    await configuration.saveServiceConfiguration("packages", reference.id, {
      name: "Updated package",
      packagePrice: 150,
    });
    const saved = (await sdk.getDoc(reference)).data();
    assert.equal(saved.packagePrice, 150);
    assert.equal(saved.name, "Updated package");
    assert.equal(saved.availability.capacity, 0);
  });
}
