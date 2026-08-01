import { useState } from "react";
import { Check, UserPlus } from "lucide-react";

const AVAILABLE_ROOMS = [
  { id: "2", type: "Garden Room", capacity: 2, rate: 2500, floor: 1 },
  { id: "4", type: "Garden Room", capacity: 3, rate: 3000, floor: 1 },
  { id: "7", type: "Ocean View", capacity: 2, rate: 4200, floor: 2 },
  { id: "9", type: "Ocean View", capacity: 4, rate: 5500, floor: 2 },
  { id: "11", type: "Beachfront Suite", capacity: 2, rate: 6500, floor: 1 },
  { id: "13", type: "Dive Cabin", capacity: 2, rate: 3800, floor: 1 },
];

export default function WalkIn() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idType: "passport",
    idNumber: "",
    nights: 1,
    pax: 2,
    selectedRoom: "",
    paymentMethod: "cash",
    downPayment: "",
    specialRequests: "",
  });
  const [success, setSuccess] = useState(false);

  const update = (k: string, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const selectedRoom = AVAILABLE_ROOMS.find((r) => r.id === form.selectedRoom);
  const total = selectedRoom ? selectedRoom.rate * form.nights : 0;
  const balance = total - Number(form.downPayment || 0);

  const handleSubmit = () => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setStep(1);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        idType: "passport",
        idNumber: "",
        nights: 1,
        pax: 2,
        selectedRoom: "",
        paymentMethod: "cash",
        downPayment: "",
        specialRequests: "",
      });
    }, 3000);
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
            Booking ID: BK-{Date.now().toString().slice(-4)}
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
                  placeholder: "Juan",
                },
                {
                  label: "Last Name",
                  key: "lastName",
                  type: "text",
                  placeholder: "dela Cruz",
                },
                {
                  label: "Email",
                  key: "email",
                  type: "email",
                  placeholder: "juan@email.com",
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  ID Type
                </label>
                <select
                  value={form.idType}
                  onChange={(e) => update("idType", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none"
                  style={{
                    borderColor: "rgba(13,115,119,0.2)",
                    background: "#f0f9f8",
                    color: "#0a2e2e",
                  }}
                >
                  <option value="passport">Passport</option>
                  <option value="license">Driver's License</option>
                  <option value="national-id">National ID</option>
                  <option value="umid">UMID</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-sm mb-1"
                  style={{ color: "#4a7a7a" }}
                >
                  ID Number
                </label>
                <input
                  type="text"
                  value={form.idNumber}
                  onChange={(e) => update("idNumber", e.target.value)}
                  placeholder="ID Number"
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
              {AVAILABLE_ROOMS.filter((r) => r.capacity >= form.pax).map(
                (room) => (
                  <button
                    key={room.id}
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
                      style={{ background: "#f0f9f8", color: "#0d7377" }}
                    >
                      {room.id}
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "#0a2e2e" }}
                      >
                        {room.type} – Room {room.id}
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
                ),
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
