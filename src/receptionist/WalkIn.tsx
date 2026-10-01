import { useEffect, useMemo, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db, customerDb } from "../app/firebase";
import { createActivityLog } from "../app/activitylogss";

type Room = {
  id: string;
  type: string;
  capacity: number;
  rate: number;
  status: string;
};

type RoomType = {
  id: string;
  name: string;
  capacity: number;
  rate: number;
};

type AddOn = {
  id: string;
  name: string;
  price: number;
  category: "Service" | "Package";
};

type Reservation = {
  roomType?: string;
  roomTypeName?: string;
  roomName?: string;
  roomTypeId?: string;
  roomId?: string;
  roomsBooked?: number;
  numberOfRooms?: number;
  quantity?: number;
  checkIn?: string;
  checkOut?: string;
  status?: string;
};

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  pax: number;
  selectedRoomType: string;
  roomQuantity: number;
  selectedAddOns: string[];
  commissionerName: string;
  commissionAmount: string;
  paymentMethod: string;
  downPayment: string;
  specialRequests: string;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const initialForm = (): FormData => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  checkIn: today(),
  checkOut: "",
  pax: 2,
  selectedRoomType: "",
  roomQuantity: 1,
  selectedAddOns: [],
  commissionerName: "",
  commissionAmount: "",
  paymentMethod: "cash",
  downPayment: "",
  specialRequests: "",
});

const nightsBetween = (start: string, end: string) => {
  if (!start || !end) return 0;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

const money = (value: number) =>
  `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

const activeReservation = (r: Reservation) =>
  !["cancelled", "canceled", "rejected", "completed"].includes(
    String(r.status ?? "").toLowerCase(),
  );

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart < bEnd && bStart < aEnd;

export default function WalkIn() {
  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState("");
  const [form, setForm] = useState<FormData>(initialForm);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const nights = nightsBetween(form.checkIn, form.checkOut);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingRooms(true);

        const [
          roomsSnap,
          typesSnap,
          bookingsSnap,
          reservationsSnap,
          servicesSnap,
          packagesSnap,
        ] = await Promise.all([
          getDocs(collection(db, "rooms")),
          getDocs(collection(db, "roomTypes")),
          getDocs(collection(customerDb, "Bookings")),
          getDocs(collection(db, "reservations")),
          getDocs(collection(db, "services")),
          getDocs(collection(db, "packages")),
        ]);

        const loadedRooms: Room[] = roomsSnap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            type: String(
              x.type ?? x.roomType ?? x.roomTypeName ?? x.name ?? "",
            ),
            capacity: Number(x.capacity ?? x.maxGuests ?? x.pax ?? 2),
            rate: Number(
              x.rate ??
                x.price ??
                x.pricePerNight ??
                x.nightlyRate ??
                x.basePrice ??
                0,
            ),
            status: String(x.status ?? "Available"),
          };
        });

        const loadedTypes: RoomType[] = typesSnap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            name: String(x.name ?? x.type ?? x.roomType ?? "Room"),
            capacity: Number(x.maxGuests ?? x.capacity ?? x.pax ?? 2),
            rate: Number(
              x.basePrice ?? x.rate ?? x.price ?? x.pricePerNight ?? 0,
            ),
          };
        });

        const loadedReservations: Reservation[] = [
          ...bookingsSnap.docs.map((d) => d.data() as Reservation),
          ...reservationsSnap.docs.map((d) => d.data() as Reservation),
        ];

        const loadAddOns = (
          docs: typeof servicesSnap.docs,
          category: "Service" | "Package",
        ): AddOn[] =>
          docs
            .map((d) => {
              const x = d.data();
              return {
                id: `${category.toLowerCase()}-${d.id}`,
                name: String(x.name ?? x.title ?? category),
                price: Number(
                  x.price ?? x.rate ?? x.amount ?? x.packagePrice ?? 0,
                ),
                category,
              };
            })
            .filter((x) => x.price >= 0);

        setRooms(loadedRooms);
        setRoomTypes(loadedTypes);
        setReservations(loadedReservations);
        setAddOns([
          ...loadAddOns(servicesSnap.docs, "Service"),
          ...loadAddOns(packagesSnap.docs, "Package"),
        ]);
      } catch (error) {
        console.error("Error loading walk-in data:", error);
        alert("Failed to load booking data. Please refresh the page.");
      } finally {
        setLoadingRooms(false);
      }
    };

    load();
  }, []);

  const roomOptions = useMemo(() => {
    const end = form.checkOut;
    const start = form.checkIn;

    return roomTypes
      .map((type) => {
        const matchingRooms = rooms.filter(
          (r) => r.type.trim().toLowerCase() === type.name.trim().toLowerCase(),
        );

        const capacity =
          type.capacity || Math.max(0, ...matchingRooms.map((r) => r.capacity));

        const roomCount = matchingRooms.length;
        const unavailableByStatus = matchingRooms.filter(
          (r) =>
            !["available", "vacant"].includes(r.status.trim().toLowerCase()),
        ).length;

        const overlappingReservations = reservations.filter((r) => {
          if (!activeReservation(r) || !start || !end || nights < 1) {
            return false;
          }

          const reservedType = String(
            r.roomType ?? r.roomTypeName ?? r.roomName ?? "",
          )
            .trim()
            .toLowerCase();

          const matches =
            (r.roomTypeId && r.roomTypeId === type.id) ||
            reservedType === type.name.trim().toLowerCase();

          if (!matches) return false;

          const ci = String(r.checkIn ?? "").slice(0, 10);
          const co = String(r.checkOut ?? "").slice(0, 10);
          return ci && co && overlaps(start, end, ci, co);
        });

        const reservedCount = overlappingReservations.reduce(
          (sum, r) =>
            sum +
            Math.max(
              1,
              Number(r.roomsBooked ?? r.numberOfRooms ?? r.quantity ?? 1),
            ),
          0,
        );

        const legacyReservedIds = new Set(
          overlappingReservations.map((r) => r.roomId).filter(Boolean),
        );

        const legacyCount = reservations.filter((r) => {
          if (
            !activeReservation(r) ||
            !r.roomId ||
            !start ||
            !end ||
            nights < 1
          )
            return false;

          const ci = String(r.checkIn ?? "").slice(0, 10);
          const co = String(r.checkOut ?? "").slice(0, 10);
          if (!ci || !co || !overlaps(start, end, ci, co)) {
            return false;
          }

          const room = matchingRooms.find((x) => x.id === r.roomId);
          return Boolean(room) && !legacyReservedIds.has(r.roomId);
        }).length;

        const unavailable = Math.min(
          roomCount,
          unavailableByStatus + reservedCount + legacyCount,
        );

        return {
          ...type,
          capacity,
          roomCount,
          available: Math.max(0, roomCount - unavailable),
        };
      })
      .filter((t) => t.capacity >= form.pax);
  }, [
    roomTypes,
    rooms,
    reservations,
    form.checkIn,
    form.checkOut,
    form.pax,
    nights,
  ]);

  const selectedRoomType = roomOptions.find(
    (r) => r.id === form.selectedRoomType,
  );

  const selectedAddOns = addOns.filter((a) =>
    form.selectedAddOns.includes(a.id),
  );

  const roomTotal =
    (selectedRoomType?.rate ?? 0) * form.roomQuantity * Math.max(0, nights);

  const addOnTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);

  const total = roomTotal + addOnTotal;
  const payment = Number(form.downPayment || 0);
  const balance = total - payment;

  useEffect(() => {
    if (!form.selectedRoomType) return;
    const current = roomOptions.find((r) => r.id === form.selectedRoomType);
    if (!current || current.available < 1) {
      setForm((p) => ({
        ...p,
        selectedRoomType: "",
        roomQuantity: 1,
      }));
    } else if (form.roomQuantity > current.available) {
      setForm((p) => ({
        ...p,
        roomQuantity: current.available,
      }));
    }
  }, [roomOptions, form.selectedRoomType, form.roomQuantity]);

  const handleSubmit = async () => {
    if (submitting) return;

    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert("Please enter the guest's first and last name.");
      setStep(1);
      return;
    }
    if (!form.phone.trim()) {
      alert("Please enter the guest's phone number.");
      setStep(1);
      return;
    }
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      alert("Please enter a valid email address.");
      setStep(1);
      return;
    }
    if (!form.checkIn || !form.checkOut || nights < 1) {
      alert("Please select valid check-in and check-out dates.");
      setStep(2);
      return;
    }
    if (!selectedRoomType) {
      alert("Please select an available room type.");
      setStep(2);
      return;
    }
    if (
      !Number.isInteger(form.roomQuantity) ||
      form.roomQuantity < 1 ||
      form.roomQuantity > selectedRoomType.available
    ) {
      alert("Please select a valid number of rooms.");
      setStep(2);
      return;
    }
    if (
      form.pax < 1 ||
      form.pax > selectedRoomType.capacity * form.roomQuantity
    ) {
      alert("The selected rooms cannot accommodate this many guests.");
      setStep(2);
      return;
    }
    if (!Number.isFinite(payment) || payment < 0 || payment > total) {
      alert("Please enter a valid down payment not greater than the total.");
      setStep(3);
      return;
    }

    const commission = Number(form.commissionAmount || 0);
    if (!Number.isFinite(commission) || commission < 0) {
      alert("Please enter a valid commission amount.");
      setStep(3);
      return;
    }

    setSubmitting(true);

    const reference = `CBR-${new Date().getFullYear()}-${Math.floor(
      100000 + Math.random() * 900000,
    )}`;

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;

    const bookingData = {
      bookingRef: reference,

      // Keep both fields so existing pages can read either name.
      customerName: fullName,
      guestName: fullName,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),

      email: form.email.trim(),
      phone: form.phone.trim(),

      roomTypeId: selectedRoomType.id,
      roomType: selectedRoomType.name,
      roomName: selectedRoomType.name,
      roomsBooked: form.roomQuantity,
      numberOfRooms: form.roomQuantity,

      guests: form.pax,
      nights,
      checkIn: form.checkIn,
      checkOut: form.checkOut,

      addOns: selectedAddOns.map((a) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        price: a.price,
      })),
      addOnTotal,

      paymentMethod: form.paymentMethod,
      roomTotal,
      totalAmount: total,
      amountPaid: payment,
      balance,
      paymentStatus:
        payment >= total ? "Paid" : payment > 0 ? "Partial" : "Unpaid",

      commissionerName: form.commissionerName.trim(),
      commissionAmount: commission,

      bookingType: "Walk-in",
      status: "Confirmed",
      specialRequests: form.specialRequests.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      const [latestBookings, latestReservations] = await Promise.all([
        getDocs(collection(customerDb, "Bookings")),
        getDocs(collection(db, "reservations")),
      ]);

      const latest: Reservation[] = [
        ...latestBookings.docs.map((d) => d.data() as Reservation),
        ...latestReservations.docs.map((d) => d.data() as Reservation),
      ];

      const matchingRooms = rooms.filter(
        (r) =>
          r.type.trim().toLowerCase() ===
          selectedRoomType.name.trim().toLowerCase(),
      );

      const overlappingTypeReservations = latest.filter((r) => {
        if (!activeReservation(r)) return false;

        const ci = String(r.checkIn ?? "").slice(0, 10);
        const co = String(r.checkOut ?? "").slice(0, 10);
        if (!ci || !co || !overlaps(form.checkIn, form.checkOut, ci, co)) {
          return false;
        }

        const typeName = String(
          r.roomType ?? r.roomTypeName ?? r.roomName ?? "",
        )
          .trim()
          .toLowerCase();

        return (
          r.roomTypeId === selectedRoomType.id ||
          typeName === selectedRoomType.name.trim().toLowerCase()
        );
      });

      const reservedCount = overlappingTypeReservations.reduce(
        (sum, r) =>
          sum +
          Math.max(
            1,
            Number(r.roomsBooked ?? r.numberOfRooms ?? r.quantity ?? 1),
          ),
        0,
      );

      const latestAvailable = Math.max(0, matchingRooms.length - reservedCount);

      if (form.roomQuantity > latestAvailable) {
        alert(
          `Only ${latestAvailable} room(s) remain available for this type and dates. Please select again.`,
        );
        setReservations(latest);
        setStep(2);
        return;
      }

      const batch = writeBatch(customerDb);
      const bookingDocRef = doc(collection(customerDb, "Bookings"));
      batch.set(bookingDocRef, bookingData);

      if (payment > 0) {
        const paymentDocRef = doc(collection(customerDb, "Payments"));

        batch.set(paymentDocRef, {
          bookingId: bookingDocRef.id,
          bookingRef: reference,

          guest: fullName,
          customerName: fullName,

          room: selectedRoomType.name,
          roomName: selectedRoomType.name,

          amount: payment,
          method: form.paymentMethod.toLowerCase(),

          type: payment >= total ? "full" : "partial",

          status: "completed",
          verificationStatus: "verified",

          receiptNo: `RCP-${Date.now().toString().slice(-6)}`,
          referenceNumber: "",

          bookingType: "Walk-in",
          createdAt: serverTimestamp(),
        });
      }

      await batch.commit();

      await createActivityLog({
        action: "Walk-in Booking Created",
        details: `Walk-in booking created for ${fullName} - ${selectedRoomType.name} (${form.roomQuantity} room(s))`,
      });

      setBookingReference(reference);
      setSuccess(true);
    } catch (error) {
      console.error("Error creating walk-in booking:", error);
      alert(
        "Failed to create walk-in booking. Please check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "60vh" }}
      >
        <div className="text-center space-y-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ background: "#e2f3f2" }}
          >
            <Check className="w-10 h-10" style={{ color: "#0d7377" }} />
          </div>
          <h2
            className="text-2xl"
            style={{ fontFamily: "Georgia, serif", color: "#0a2e2e" }}
          >
            Walk-in Registered!
          </h2>
          <p style={{ color: "#4a7a7a" }}>
            Booking confirmed for {form.firstName} {form.lastName}
          </p>
          <p className="font-mono text-sm" style={{ color: "#0d7377" }}>
            Booking ID: {bookingReference}
          </p>
          <button
            type="button"
            onClick={() => {
              setSuccess(false);
              setStep(1);
              setForm(initialForm());
            }}
            className="px-6 py-2.5 rounded-lg text-sm text-white"
            style={{ background: "#0d7377" }}
          >
            Register Another Guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        {[
          { n: 1, label: "Guest Info" },
          { n: 2, label: "Room Selection" },
          { n: 3, label: "Payment" },
        ].map((item, index) => (
          <div key={item.n} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
                style={{
                  background: step >= item.n ? "#0d7377" : "#e2f3f2",
                  color: step >= item.n ? "#fff" : "#4a7a7a",
                }}
              >
                {step > item.n ? <Check className="w-4 h-4" /> : item.n}
              </div>
              <span
                className="text-sm hidden sm:block"
                style={{ color: step === item.n ? "#0a2e2e" : "#4a7a7a" }}
              >
                {item.label}
              </span>
            </div>
            {index < 2 && (
              <div
                className="flex-1 h-px"
                style={{
                  background: step > item.n ? "#0d7377" : "#e2f3f2",
                  minWidth: 12,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div
        className="bg-white rounded-xl border p-6"
        style={{ borderColor: "rgba(13,115,119,0.1)" }}
      >
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-5">
              <UserPlus className="w-6 h-6" style={{ color: "#0d7377" }} />
              <h2
                className="text-xl"
                style={{ fontFamily: "Georgia, serif", color: "#0a2e2e" }}
              >
                Guest Information
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  label: "First Name",
                  key: "firstName" as const,
                  type: "text",
                  placeholder: "Albert",
                },
                {
                  label: "Last Name",
                  key: "lastName" as const,
                  type: "text",
                  placeholder: "Cunag",
                },
                {
                  label: "Email",
                  key: "email" as const,
                  type: "email",
                  placeholder: "albertcunag@email.com",
                },
                {
                  label: "Phone",
                  key: "phone" as const,
                  type: "tel",
                  placeholder: "+63 917 000 0000",
                },
              ].map((field) => (
                <div key={field.key}>
                  <label
                    className="block text-sm mb-1"
                    style={{ color: "#4a7a7a" }}
                  >
                    {field.label}
                    {field.key !== "email" && (
                      <span className="text-red-500"> *</span>
                    )}
                  </label>
                  <input
                    type={field.type}
                    value={form[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.key !== "email"}
                    className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                    style={{
                      borderColor: "rgba(13,115,119,0.2)",
                      background: "#f0f9f8",
                      color: "#0a2e2e",
                    }}
                  />
                </div>
              ))}
            </div>
            <div>
              <label
                className="block text-sm mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Special Requests
              </label>
              <textarea
                value={form.specialRequests}
                onChange={(e) => update("specialRequests", e.target.value)}
                rows={3}
                placeholder="Any dietary needs, accessibility requirements, etc."
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none resize-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2
              className="text-xl mb-5"
              style={{ fontFamily: "Georgia, serif", color: "#0a2e2e" }}
            >
              Room Selection
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={form.checkIn}
                  min={today()}
                  onChange={(e) => update("checkIn", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  Check-out Date
                </label>
                <input
                  type="date"
                  value={form.checkOut}
                  min={form.checkIn || today()}
                  onChange={(e) => update("checkOut", e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  Number of Guests
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.pax}
                  onChange={(e) =>
                    update("pax", Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                />
              </div>
            </div>

            <div className="text-sm" style={{ color: "#4a7a7a" }}>
              Number of Nights: {nights > 0 ? nights : "Select valid dates"}
            </div>

            <div className="space-y-2">
              {loadingRooms ? (
                <div
                  className="py-8 text-center text-sm"
                  style={{ color: "#4a7a7a" }}
                >
                  Loading available rooms...
                </div>
              ) : nights < 1 ? (
                <div
                  className="py-8 text-center rounded-xl"
                  style={{ background: "#f0f9f8", color: "#4a7a7a" }}
                >
                  Select a check-in and check-out date to view availability.
                </div>
              ) : roomOptions.length === 0 ? (
                <div
                  className="py-8 text-center rounded-xl"
                  style={{ background: "#f0f9f8", color: "#4a7a7a" }}
                >
                  No room types can accommodate {form.pax} guest(s).
                </div>
              ) : (
                roomOptions.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    disabled={room.available < 1}
                    onClick={() => {
                      update("selectedRoomType", room.id);
                      update("roomQuantity", 1);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all disabled:opacity-50"
                    style={{
                      borderColor:
                        form.selectedRoomType === room.id
                          ? "#0d7377"
                          : "rgba(13,115,119,0.15)",
                      background:
                        form.selectedRoomType === room.id
                          ? "#e2f3f2"
                          : "transparent",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-medium"
                      style={{ background: "#f0f9f8", color: "#0d7377" }}
                    >
                      {room.available}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#0a2e2e" }}
                      >
                        {room.name}
                      </p>
                      <p className="text-xs" style={{ color: "#4a7a7a" }}>
                        Up to {room.capacity} guests · {room.available} room(s)
                        available
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#0d7377" }}
                      >
                        {money(room.rate)}/night
                      </p>
                      <p className="text-xs" style={{ color: "#4a7a7a" }}>
                        {money(room.rate * nights)}/room
                      </p>
                    </div>
                    {form.selectedRoomType === room.id && (
                      <Check
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: "#0d7377" }}
                      />
                    )}
                  </button>
                ))
              )}
            </div>

            {selectedRoomType && (
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  Number of Rooms
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedRoomType.available}
                  value={form.roomQuantity}
                  onChange={(e) =>
                    update(
                      "roomQuantity",
                      Math.min(
                        selectedRoomType.available,
                        Math.max(1, Number(e.target.value) || 1),
                      ),
                    )
                  }
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                />
                <p className="text-xs mt-1" style={{ color: "#4a7a7a" }}>
                  Maximum: {selectedRoomType.available} available room(s)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-medium" style={{ color: "#0a2e2e" }}>
                Optional Services & Packages
              </h3>
              {addOns.length === 0 ? (
                <p className="text-xs" style={{ color: "#4a7a7a" }}>
                  No services or packages available.
                </p>
              ) : (
                addOns.map((item) => {
                  const checked = form.selectedAddOns.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer"
                      style={{
                        borderColor: checked
                          ? "#0d7377"
                          : "rgba(13,115,119,0.15)",
                        background: checked ? "#e2f3f2" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          update(
                            "selectedAddOns",
                            e.target.checked
                              ? [...form.selectedAddOns, item.id]
                              : form.selectedAddOns.filter(
                                  (id) => id !== item.id,
                                ),
                          )
                        }
                      />
                      <span
                        className="flex-1 text-sm"
                        style={{ color: "#0a2e2e" }}
                      >
                        {item.name}{" "}
                        <span className="text-xs" style={{ color: "#4a7a7a" }}>
                          ({item.category})
                        </span>
                      </span>
                      <span className="text-sm" style={{ color: "#0d7377" }}>
                        {money(item.price)}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2
              className="text-xl mb-5"
              style={{ fontFamily: "Georgia, serif", color: "#0a2e2e" }}
            >
              Payment
            </h2>

            <div className="p-4 rounded-xl" style={{ background: "#f0f9f8" }}>
              {[
                ["Guest", `${form.firstName} ${form.lastName}`],
                ["Room Type", selectedRoomType?.name ?? "—"],
                ["Number of Rooms", String(form.roomQuantity)],
                ["Check-in", form.checkIn],
                ["Check-out", form.checkOut],
                ["Nights", `× ${nights}`],
                ["Guests", String(form.pax)],
                ["Rate per Night", money(selectedRoomType?.rate ?? 0)],
                ["Room Charges", money(roomTotal)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm mb-2">
                  <span style={{ color: "#4a7a7a" }}>{label}</span>
                  <span style={{ color: "#0a2e2e" }}>{value}</span>
                </div>
              ))}

              {selectedAddOns.map((a) => (
                <div key={a.id} className="flex justify-between text-sm mb-2">
                  <span style={{ color: "#4a7a7a" }}>{a.name}</span>
                  <span style={{ color: "#0a2e2e" }}>{money(a.price)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#4a7a7a" }}>Add-ons</span>
                <span style={{ color: "#0a2e2e" }}>{money(addOnTotal)}</span>
              </div>
              <div
                className="flex justify-between font-medium border-t pt-3 mt-3"
                style={{ borderColor: "rgba(13,115,119,0.15)" }}
              >
                <span style={{ color: "#0a2e2e" }}>Total</span>
                <span style={{ color: "#0d7377" }}>{money(total)}</span>
              </div>
            </div>

            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ borderColor: "rgba(13,115,119,0.15)" }}
            >
              <h3 className="text-sm font-medium" style={{ color: "#0a2e2e" }}>
                Commission (Optional)
              </h3>
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  Commissioner Name
                </label>
                <input
                  type="text"
                  value={form.commissionerName}
                  onChange={(e) => update("commissionerName", e.target.value)}
                  placeholder="Enter commissioner name"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  Commission Amount (₱)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.commissionAmount}
                  onChange={(e) => update("commissionAmount", e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Payment Method
              </label>
              <div className="flex gap-3">
                {["cash", "card", "gcash"].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => update("paymentMethod", method)}
                    className="flex-1 py-2.5 rounded-lg border text-sm capitalize transition-all"
                    style={{
                      borderColor:
                        form.paymentMethod === method
                          ? "#0d7377"
                          : "rgba(13,115,119,0.2)",
                      background:
                        form.paymentMethod === method
                          ? "#e2f3f2"
                          : "transparent",
                      color:
                        form.paymentMethod === method ? "#0d7377" : "#4a7a7a",
                    }}
                  >
                    {method === "gcash"
                      ? "GCash"
                      : method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                className="block text-sm mb-1"
                style={{ color: "#4a7a7a" }}
              >
                Down Payment (₱)
              </label>
              <input
                type="number"
                min={0}
                max={total}
                value={form.downPayment}
                onChange={(e) => update("downPayment", e.target.value)}
                placeholder={`Full: ${money(total)}`}
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>

            {payment > 0 && payment < total && (
              <div
                className="p-3 rounded-lg"
                style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
              >
                <p className="text-sm" style={{ color: "#f97316" }}>
                  Partial payment: {money(payment)} paid. Balance of{" "}
                  {money(balance)} due at checkout.
                </p>
              </div>
            )}
            {payment >= total && total > 0 && (
              <div
                className="p-3 rounded-lg"
                style={{ background: "#e2f3f2", color: "#0d7377" }}
              >
                <p className="text-sm">
                  Full payment: {money(payment)}. No remaining balance.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        {step > 1 ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => setStep((p) => p - 1)}
            className="px-6 py-2.5 rounded-lg border text-sm disabled:opacity-50"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            type="button"
            disabled={
              submitting ||
              (step === 2 &&
                (!selectedRoomType || nights < 1 || form.roomQuantity < 1))
            }
            onClick={() => {
              if (step === 1) {
                if (!form.firstName.trim() || !form.lastName.trim()) {
                  alert("Please enter the guest's name.");
                  return;
                }
                if (!form.phone.trim()) {
                  alert("Please enter the guest's phone number.");
                  return;
                }
                if (
                  form.email.trim() &&
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
                ) {
                  alert("Please enter a valid email.");
                  return;
                }
              }
              if (step === 2) {
                if (nights < 1) {
                  alert("Please select valid check-in and check-out dates.");
                  return;
                }
                if (!selectedRoomType) {
                  alert("Please select an available room type.");
                  return;
                }
              }
              setStep((p) => p + 1);
            }}
            className="px-6 py-2.5 rounded-lg text-sm text-white disabled:opacity-50"
            style={{ background: "#0d7377" }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg text-sm text-white disabled:opacity-50"
            style={{ background: "#0d7377" }}
          >
            {submitting ? "Processing..." : "Confirm & Check In"}
          </button>
        )}
      </div>
    </div>
  );
}
