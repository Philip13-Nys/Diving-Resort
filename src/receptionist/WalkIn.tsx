import { useEffect, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db, customerDb } from "../app/firebase";
import { createActivityLog } from "../app/activitylogss";

type Room = {
  id: string;
  roomNumber: string;
  type: string;
  capacity: number;
  rate: number;
  floor: number;
  status: string;
};

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string;
  nights: number;
  pax: number;
  selectedRoom: string;
  paymentMethod: string;
  downPayment: string;
  specialRequests: string;
};

const initialForm = (): FormData => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  checkIn: new Date().toLocaleDateString("en-CA"),
  nights: 1,
  pax: 2,
  selectedRoom: "",
  paymentMethod: "cash",
  downPayment: "",
  specialRequests: "",
});

export default function WalkIn() {
  const [step, setStep] = useState(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState("");
  const [form, setForm] = useState<FormData>(initialForm);

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

        setRooms(loadedRooms);
      } catch (error) {
        console.error("Error loading rooms:", error);
        alert("Failed to load rooms. Please refresh the page.");
      } finally {
        setLoadingRooms(false);
      }
    };

    loadRooms();
  }, []);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const selectedRoom = rooms.find((room) => room.id === form.selectedRoom);

  const availableRooms = rooms.filter(
    (room) =>
      room.status.toLowerCase() === "available" && room.capacity >= form.pax,
  );

  const total = selectedRoom ? selectedRoom.rate * form.nights : 0;

  const payment = Number(form.downPayment || 0);
  const balance = total - payment;

  const checkoutDate = new Date(`${form.checkIn}T12:00:00`);

  checkoutDate.setDate(checkoutDate.getDate() + Number(form.nights));

  const checkOut = [
    checkoutDate.getFullYear(),
    String(checkoutDate.getMonth() + 1).padStart(2, "0"),
    String(checkoutDate.getDate()).padStart(2, "0"),
  ].join("-");

  const handleSubmit = async () => {
    if (submitting) return;

    if (!selectedRoom) {
      alert("Please select a room.");
      setStep(2);
      return;
    }

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

    if (!Number.isInteger(form.nights) || form.nights < 1) {
      alert("Number of nights must be at least 1.");
      setStep(2);
      return;
    }

    if (!Number.isInteger(form.pax) || form.pax < 1) {
      alert("Number of guests must be at least 1.");
      setStep(2);
      return;
    }

    if (form.pax > selectedRoom.capacity) {
      alert("The selected room cannot accommodate this many guests.");
      setStep(2);
      return;
    }

    const checkInDate = new Date(`${form.checkIn}T12:00:00`);

    if (!form.checkIn || Number.isNaN(checkInDate.getTime())) {
      alert("Please enter a valid check-in date.");
      setStep(2);
      return;
    }

    if (!Number.isFinite(payment) || payment < 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    if (payment > total) {
      alert("Down payment cannot be greater than the total.");
      return;
    }

    setSubmitting(true);

    const roomRef = doc(db, "rooms", selectedRoom.id);

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

      guests: form.pax,
      nights: form.nights,
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

    let roomReserved = false;
    let bookingCreated = false;

    try {
      // Reserve the room in the admin database.
      await runTransaction(db, async (transaction) => {
        const roomSnapshot = await transaction.get(roomRef);

        if (!roomSnapshot.exists()) {
          throw new Error("ROOM_NOT_FOUND");
        }

        const currentStatus = String(
          roomSnapshot.data().status ?? "Available",
        ).toLowerCase();

        if (currentStatus !== "available") {
          throw new Error("ROOM_UNAVAILABLE");
        }

        transaction.update(roomRef, {
          status: "Occupied",
          updatedAt: serverTimestamp(),
        });
      });

      roomReserved = true;

      // Create exactly one booking in the customer database.
      await addDoc(collection(customerDb, "Bookings"), bookingData);

      bookingCreated = true;

      // Record the activity.
      await createActivityLog({
        action: "Walk-in Booking Created",
        details: `Walk-in booking created for ${bookingData.guestName} - Room ${bookingData.roomNumber}`,
      });

      setRooms((previous) =>
        previous.map((room) =>
          room.id === selectedRoom.id ? { ...room, status: "Occupied" } : room,
        ),
      );

      setBookingReference(bookingRef);
      setSuccess(true);
    } catch (error) {
      console.error("Error creating walk-in booking:", error);

      // Restore room status if booking creation failed.
      if (roomReserved && !bookingCreated) {
        try {
          await runTransaction(db, async (transaction) => {
            const latestRoom = await transaction.get(roomRef);

            if (
              latestRoom.exists() &&
              String(latestRoom.data().status ?? "").toLowerCase() ===
                "occupied"
            ) {
              transaction.update(roomRef, {
                status: "Available",
                updatedAt: serverTimestamp(),
              });
            }
          });
        } catch (rollbackError) {
          console.error("Room rollback failed:", rollbackError);

          alert(
            "Booking failed and the room status could not be restored. Please check the room in the admin dashboard.",
          );
          return;
        }
      }

      if (error instanceof Error && error.message === "ROOM_UNAVAILABLE") {
        setRooms((previous) =>
          previous.map((room) =>
            room.id === selectedRoom.id
              ? { ...room, status: "Occupied" }
              : room,
          ),
        );

        setForm((previous) => ({
          ...previous,
          selectedRoom: "",
        }));

        setStep(2);

        alert("This room is no longer available. Please select another room.");
      } else if (error instanceof Error && error.message === "ROOM_NOT_FOUND") {
        alert("This room no longer exists. Please refresh the room list.");
      } else if (bookingCreated) {
        // The booking exists, but the activity log failed.
        setBookingReference(bookingRef);
        setSuccess(true);

        alert(
          "Booking was saved, but the activity log failed. Please check the activity logs.",
        );
      } else {
        alert(
          "Failed to create walk-in booking. Please check your connection and try again.",
        );
      }
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
            style={{
              fontFamily: "Georgia, serif",
              color: "#0a2e2e",
            }}
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
      {/* Step indicator */}
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
                style={{
                  color: step === item.n ? "#0a2e2e" : "#4a7a7a",
                }}
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
        {/* STEP 1: GUEST INFORMATION */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-5">
              <UserPlus className="w-6 h-6" style={{ color: "#0d7377" }} />

              <h2
                className="text-xl"
                style={{
                  fontFamily: "Georgia, serif",
                  color: "#0a2e2e",
                }}
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

        {/* STEP 2: ROOM SELECTION */}
        {step === 2 && (
          <div className="space-y-4">
            <h2
              className="text-xl mb-5"
              style={{
                fontFamily: "Georgia, serif",
                color: "#0a2e2e",
              }}
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
                  min={new Date().toLocaleDateString("en-CA")}
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
                  Number of Nights
                </label>

                <input
                  type="number"
                  min={1}
                  value={form.nights}
                  onChange={(e) =>
                    update("nights", Math.max(1, Number(e.target.value) || 1))
                  }
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
                  onChange={(e) => {
                    const pax = Math.max(1, Number(e.target.value) || 1);

                    setForm((previous) => ({
                      ...previous,
                      pax,
                      selectedRoom:
                        selectedRoom && selectedRoom.capacity < pax
                          ? ""
                          : previous.selectedRoom,
                    }));
                  }}
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
              Check-out: {checkOut}
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
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-medium"
                      style={{
                        background: "#f0f9f8",
                        color: "#0d7377",
                      }}
                    >
                      {room.roomNumber}
                    </div>

                    <div className="flex-1 min-w-0">
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

        {/* STEP 3: PAYMENT */}
        {step === 3 && (
          <div className="space-y-4">
            <h2
              className="text-xl mb-5"
              style={{
                fontFamily: "Georgia, serif",
                color: "#0a2e2e",
              }}
            >
              Payment
            </h2>

            <div className="p-4 rounded-xl" style={{ background: "#f0f9f8" }}>
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#4a7a7a" }}>Guest</span>
                <span style={{ color: "#0a2e2e" }}>
                  {form.firstName} {form.lastName}
                </span>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#4a7a7a" }}>Room</span>
                <span style={{ color: "#0a2e2e" }}>
                  {selectedRoom?.type} – Room {selectedRoom?.roomNumber}
                </span>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#4a7a7a" }}>Check-in</span>
                <span style={{ color: "#0a2e2e" }}>{form.checkIn}</span>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#4a7a7a" }}>Check-out</span>
                <span style={{ color: "#0a2e2e" }}>{checkOut}</span>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#4a7a7a" }}>Nights</span>
                <span style={{ color: "#0a2e2e" }}>× {form.nights}</span>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#4a7a7a" }}>Rate per night</span>
                <span style={{ color: "#0a2e2e" }}>
                  ₱{selectedRoom?.rate.toLocaleString()}
                </span>
              </div>

              <div
                className="flex justify-between font-medium border-t pt-3 mt-3"
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
                placeholder={`Full: ₱${total.toLocaleString()}`}
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
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                }}
              >
                <p className="text-sm" style={{ color: "#f97316" }}>
                  Partial payment: ₱{payment.toLocaleString()} paid. Balance of
                  ₱{balance.toLocaleString()} due at checkout.
                </p>
              </div>
            )}

            {payment >= total && total > 0 && (
              <div
                className="p-3 rounded-lg"
                style={{
                  background: "#e2f3f2",
                  color: "#0d7377",
                }}
              >
                <p className="text-sm">
                  Full payment: ₱{payment.toLocaleString()}. No remaining
                  balance.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <div className="flex justify-between">
        {step > 1 ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => setStep((previous) => previous - 1)}
            className="px-6 py-2.5 rounded-lg border text-sm disabled:opacity-50"
            style={{
              borderColor: "rgba(13,115,119,0.2)",
              color: "#4a7a7a",
            }}
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
              (step === 2 && (!form.selectedRoom || !selectedRoom))
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
                if (!selectedRoom) {
                  alert("Please select a room.");
                  return;
                }
              }

              setStep((previous) => previous + 1);
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
