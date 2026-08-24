import { useEffect, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db, customerDb } from "../app/firebase";

type Room = {
  id: string;
  roomNumber: string;
  type: string;
  capacity: number;
  rate: number;
  floor: number;
  status: string;
};

export default function WalkIn() {
  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    checkIn: new Date().toISOString().split("T")[0],
    nights: 1,
    pax: 2,
    selectedRoom: "",
    paymentMethod: "cash",
    downPayment: "",
    specialRequests: "",
  });

  const [success, setSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState("");

  useEffect(() => {
    const loadRooms = async () => {
      try {
        setLoadingRooms(true);

        const snapshot = await getDocs(collection(db, "rooms"));

        const loadedRooms: Room[] = snapshot.docs.map((roomDoc) => {
          const data = roomDoc.data();

          return {
            id: roomDoc.id,
            roomNumber: String(
              data.roomNumber ?? data.number ?? data.roomNo ?? roomDoc.id,
            ),
            type: String(
              data.type ?? data.roomType ?? data.roomTypeName ?? "Room",
            ),
            capacity: Number(data.capacity ?? data.maxGuests ?? data.pax ?? 2),
            rate: Number(
              data.rate ??
                data.price ??
                data.pricePerNight ??
                data.nightlyRate ??
                0,
            ),
            floor: Number(data.floor ?? 1),
            status: String(data.status ?? "Available"),
          };
        });

        console.log("Rooms from admin database:", loadedRooms);

        setRooms(loadedRooms);
      } catch (error) {
        console.error("Error loading rooms:", error);
      } finally {
        setLoadingRooms(false);
      }
    };

    loadRooms();
  }, []);

  const update = (k: string, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const selectedRoom = rooms.find((room) => room.id === form.selectedRoom);

  const availableRooms = rooms.filter(
    (room) =>
      room.status.toLowerCase() === "available" && room.capacity >= form.pax,
  );

  const total = selectedRoom ? selectedRoom.rate * form.nights : 0;
  const balance = total - Number(form.downPayment || 0);
  const checkoutDate = new Date(form.checkIn);
  checkoutDate.setDate(checkoutDate.getDate() + Number(form.nights));
  const checkOut = checkoutDate.toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!selectedRoom) {
      alert("Please select a room.");
      return;
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      alert("Please enter the guest's first and last name.");
      return;
    }

    if (!form.phone.trim()) {
      alert("Please enter the guest's phone number.");
      return;
    }

    const payment = Number(form.downPayment || 0);

    if (payment < 0) {
      alert("Payment cannot be negative.");
      return;
    }

    if (payment > total) {
      alert("Down payment cannot be greater than the total.");
      return;
    }

    try {
      const bookingRef = `CBR-${new Date().getFullYear()}-${Math.floor(
        100000 + Math.random() * 900000,
      )}`;

      const bookingData = {
        bookingRef,

        guestName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),

        roomId: selectedRoom.id,
        roomNumber: selectedRoom.roomNumber,
        roomType: selectedRoom.type,

        guests: Number(form.pax),
        nights: Number(form.nights),

        checkIn: form.checkIn,
        checkOut,

        paymentMethod: form.paymentMethod,
        totalAmount: total,
        amountPaid: payment,
        balance,

        paymentStatus:
          payment >= total ? "Paid" : payment > 0 ? "Partial" : "Unpaid",

        bookingType: "Walk-in",
        status: "Confirmed",

        specialRequests: form.specialRequests.trim(),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(customerDb, "Bookings"), bookingData);

      await updateDoc(doc(db, "rooms", selectedRoom.id), {
        status: "Occupied",
        updatedAt: serverTimestamp(),
      });

      console.log("Walk-in booking created:", bookingData);

      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        setStep(1);

        setForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          checkIn: new Date().toISOString().split("T")[0],
          nights: 1,
          pax: 2,
          selectedRoom: "",
          paymentMethod: "cash",
          downPayment: "",
          specialRequests: "",
        });
      }, 3000);
    } catch (error) {
      console.error("Error creating walk-in booking:", error);

      alert("Failed to create walk-in booking. Please try again.");
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
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-4">
        {[
          { n: 1, label: "Guest Info" },
          { n: 2, label: "Room Selection" },
          { n: 3, label: "Payment" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all"
                style={{
                  background: step >= s.n ? "#0d7377" : "#e2f3f2",
                  color: step >= s.n ? "#fff" : "#4a7a7a",
                }}
              >
                {step > s.n ? <Check className="w-4 h-4" /> : s.n}
              </div>
              <span
                className="text-sm hidden sm:block"
                style={{ color: step === s.n ? "#0a2e2e" : "#4a7a7a" }}
              >
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className="flex-1 h-px"
                style={{
                  background: step > s.n ? "#0d7377" : "#e2f3f2",
                  minWidth: 24,
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
        {/* Step 1 */}
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
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: "First Name",
                  key: "firstName",
                  type: "text",
                  placeholder: "Albert",
                },
                {
                  label: "Last Name",
                  key: "lastName",
                  type: "text",
                  placeholder: "Cunag",
                },
                {
                  label: "Email",
                  key: "email",
                  type: "email",
                  placeholder: "albertcunag@email.com",
                },
                {
                  label: "Phone",
                  key: "phone",
                  type: "tel",
                  placeholder: "+63 917 000 0000",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    className="block text-sm mb-1"
                    style={{ color: "#4a7a7a" }}
                  >
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    value={
                      (form as Record<string, string | number>)[f.key] as string
                    }
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
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
                rows={2}
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

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2
              className="text-xl mb-5"
              style={{ fontFamily: "Georgia, serif", color: "#0a2e2e" }}
            >
              Room Selection
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  Number of Nights
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.nights}
                  onChange={(e) => update("nights", Number(e.target.value))}
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
                  Number of Guests
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.pax}
                  onChange={(e) => update("pax", Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {loadingRooms ? (
                <div
                  className="py-8 text-center text-sm"
                  style={{ color: "#4a7a7a" }}
                >
                  Loading available rooms...
                </div>
              ) : availableRooms.length === 0 ? (
                <div
                  className="py-8 text-center rounded-xl"
                  style={{
                    background: "#f0f9f8",
                    color: "#4a7a7a",
                  }}
                >
                  No available rooms for {form.pax} guest
                  {form.pax !== 1 ? "s" : ""}.
                </div>
              ) : (
                availableRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => update("selectedRoom", room.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all"
                    style={{
                      borderColor:
                        form.selectedRoom === room.id
                          ? "#0d7377"
                          : "rgba(13,115,119,0.15)",
                      background:
                        form.selectedRoom === room.id
                          ? "#e2f3f2"
                          : "transparent",
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-medium"
                      style={{
                        background: "#f0f9f8",
                        color: "#0d7377",
                      }}
                    >
                      {room.roomNumber}
                    </div>

                    <div className="flex-1">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#0a2e2e" }}
                      >
                        {room.type} – Room {room.roomNumber}
                      </p>

                      <p className="text-xs" style={{ color: "#4a7a7a" }}>
                        Up to {room.capacity} guests · Floor {room.floor}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#0d7377" }}
                      >
                        ₱{room.rate.toLocaleString()}/night
                      </p>

                      <p className="text-xs" style={{ color: "#4a7a7a" }}>
                        ₱{(room.rate * form.nights).toLocaleString()} total
                      </p>
                    </div>

                    {form.selectedRoom === room.id && (
                      <Check
                        className="w-5 h-5 flex-shrink-0"
                        style={{ color: "#0d7377" }}
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2
              className="text-xl mb-5"
              style={{ fontFamily: "Georgia, serif", color: "#0a2e2e" }}
            >
              Payment
            </h2>
            <div className="p-4 rounded-xl" style={{ background: "#f0f9f8" }}>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#4a7a7a" }}>
                  Room ({selectedRoom?.type})
                </span>
                <span style={{ color: "#0a2e2e" }}>
                  ₱{selectedRoom?.rate.toLocaleString()}/night
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#4a7a7a" }}>Nights</span>
                <span style={{ color: "#0a2e2e" }}>× {form.nights}</span>
              </div>
              <div
                className="flex justify-between font-medium border-t pt-2 mt-2"
                style={{ borderColor: "rgba(13,115,119,0.15)" }}
              >
                <span style={{ color: "#0a2e2e" }}>Total</span>
                <span style={{ color: "#0d7377" }}>
                  ₱{total.toLocaleString()}
                </span>
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
                {["cash", "card", "gcash"].map((m) => (
                  <button
                    key={m}
                    onClick={() => update("paymentMethod", m)}
                    className="flex-1 py-2.5 rounded-lg border text-sm capitalize transition-all"
                    style={{
                      borderColor:
                        form.paymentMethod === m
                          ? "#0d7377"
                          : "rgba(13,115,119,0.2)",
                      background:
                        form.paymentMethod === m ? "#e2f3f2" : "transparent",
                      color: form.paymentMethod === m ? "#0d7377" : "#4a7a7a",
                    }}
                  >
                    {m === "gcash"
                      ? "GCash"
                      : m.charAt(0).toUpperCase() + m.slice(1)}
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
                value={form.downPayment}
                onChange={(e) => update("downPayment", e.target.value)}
                placeholder={`Full: ₱${total.toLocaleString()}`}
                className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: "rgba(13,115,119,0.2)",
                  background: "#f0f9f8",
                  color: "#0a2e2e",
                }}
              />
            </div>
            {Number(form.downPayment) > 0 &&
              Number(form.downPayment) < total && (
                <div
                  className="p-3 rounded-lg"
                  style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}
                >
                  <p className="text-sm" style={{ color: "#f97316" }}>
                    Partial payment: ₱
                    {Number(form.downPayment).toLocaleString()} paid. Balance of
                    ₱{balance.toLocaleString()} due at checkout.
                  </p>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="px-6 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            Back
          </button>
        ) : (
          <div />
        )}
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 2 && !form.selectedRoom}
            className="px-6 py-2.5 rounded-lg text-sm text-white"
            style={{
              background:
                step === 2 && !form.selectedRoom ? "#a0c4c4" : "#0d7377",
            }}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-lg text-sm text-white"
            style={{ background: "#0d7377" }}
          >
            Confirm & Check In
          </button>
        )}
      </div>
    </div>
  );
}
