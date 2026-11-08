import { useActivityAvailability } from "../app/useActivityAvailability";
import ServiceAddOnAvailability from "../app/components/ServiceAddOnAvailability";
import PackageBookingFields from "../app/components/PackageBookingFields";
import ActivitySchedulePicker, {
  type ActivitySchedule,
} from "../app/components/ActivitySchedulePicker";
import {
  assertActivityCapacity,
  bookingActivityReservations,
  activityEnabled,
  activityPolicy,
  hasAvailableActivitySession,
  activitySession,
} from "../app/activityAvailability";
import { ensureRecordReferences } from "../app/bookingStore";
import { displayRecordId } from "../app/bookingAvailability";
import { useSearchParams } from "react-router-dom";
import { useBookingInventory } from "../app/useBookingInventory";
import {
  typeAvailability,
  stayDates,
  moneyCents,
  localDate,
} from "../app/bookingAvailability";
import { saveWalkIn, walkInTotals } from "../app/saveWalkIn";
import { AsyncButton } from "../app/components/ui/async-action";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { collection, doc, getDocs, getDoc } from "firebase/firestore";
import { db } from "../app/firebase";
import { createActivityLog } from "../app/activitylogss";

type AddOn = {
  sourceId: string;
  itemType: string;
  [key: string]: any;
  id: string;
  name: string;
  price: number;
  category: "Service" | "Package";
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
  activitySchedules: Record<string, ActivitySchedule>;
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
  activitySchedules: {},
  commissionerName: "",
  commissionAmount: "",
  paymentMethod: "cash",
  downPayment: "",
  specialRequests: "",
});

const money = (value: number) =>
  `₱${value.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

export default function WalkIn() {
  const activityInventory = useActivityAvailability();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const {
    rooms,
    roomTypes,
    reservations,
    loading: inventoryLoading,
    error: inventoryError,
  } = useBookingInventory();
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState("");
  const [reservationFeePercent, setReservationFeePercent] = useState(5);
  const [saveError, setSaveError] = useState("");
  const [assignedNumbers, setAssignedNumbers] = useState<string[]>([]);
  const pendingSave = useRef<{ fingerprint: string; id: string } | null>(null);
  const loadingRooms = inventoryLoading || loadingPrices;
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingReference, setBookingReference] = useState("");
  const [form, setForm] = useState<FormData>(() => ({
    ...initialForm(),
    selectedRoomType: searchParams.get("roomType") || "",
  }));

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    pendingSave.current = null;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const nights = (() => {
    try {
      return stayDates(form.checkIn, form.checkOut).length;
    } catch {
      return 0;
    }
  })();

  useEffect(() => {
    let active = true;
    getDoc(doc(db, "settings", "reservationFee"))
      .then((snapshot) => {
        if (active) {
          setReservationFeePercent(Number(snapshot.data()?.percent ?? 5));
          setLoadingPrices(false);
        }
      })
      .catch(() => {
        if (active) {
          setPriceError(
            "Unable to load current prices. Refresh before creating a booking.",
          );
          setLoadingPrices(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    setAddOns(
      activityInventory.catalog
        .filter(
          (item) =>
            !item.status || ["active", "available"].includes(item.status),
        )
        .map((item) => ({
          ...item,
          sourceId: item.id,
          id: item.itemType + "-" + item.id,
          itemType: item.itemType,
          name: String(item.name || item.title || item.itemType),
          price: Number(
            item.itemType === "package"
              ? (item.packagePrice ?? item.price ?? item.rate ?? 0)
              : (item.price ?? item.rate ?? 0),
          ),
          category: item.itemType === "package" ? "Package" : "Service",
        })),
    );
  }, [activityInventory.catalog]);

  const roomOptions = useMemo(
    () =>
      roomTypes
        .map((type) => {
          const capacity = Number(
            type.maxGuests ?? type.capacity ?? type.pax ?? 2,
          );
          const rate = Number(
            type.basePrice ??
              type.rate ??
              type.price ??
              type.pricePerNight ??
              0,
          );
          const result =
            nights > 0
              ? typeAvailability(
                  rooms,
                  reservations,
                  type,
                  form.checkIn,
                  form.checkOut,
                )
              : { available: 0 };
          return {
            ...type,
            id: String(type.id),
            name: String(type.name),
            capacity,
            rate,
            available: result.available,
          };
        })
        .filter(
          (type) => type.capacity * Math.max(type.available, 1) >= form.pax,
        ),
    [
      rooms,
      roomTypes,
      reservations,
      form.checkIn,
      form.checkOut,
      form.pax,
      nights,
    ],
  );

  const selectedRoomType =
    roomOptions.find((type) => type.id === form.selectedRoomType) ||
    (() => {
      // Keep the original quote available for an idempotent retry after an
      // uncertain network failure, even if the committed booking filled the room.
      if (!pendingSave.current) return undefined;
      const type = roomTypes.find((item) => item.id === form.selectedRoomType);
      return type
        ? {
            ...type,
            id: String(type.id),
            name: String(type.name),
            capacity: Number(type.maxGuests ?? type.capacity ?? 2),
            rate: Number(type.basePrice ?? type.rate ?? type.price ?? 0),
            available: 0,
          }
        : undefined;
    })();

  const scheduleFor = (id: string): ActivitySchedule =>
    form.activitySchedules[id] || {
      bookingDate: form.checkIn,
      bookingTime: "",
      participants: 1,
    };
  const selectedAddOns = addOns
    .filter((item) => form.selectedAddOns.includes(item.id))
    .map((item) => ({
      ...item,
      price: item.price * scheduleFor(item.id).participants,
    }));
  const activityError = (() => {
    if (!form.selectedAddOns.length) return "";
    if (activityInventory.loading || activityInventory.error)
      return activityInventory.error || "Checking activity availability...";
    if (selectedAddOns.length !== form.selectedAddOns.length)
      return "A selected activity was removed. Choose another activity.";
    try {
      const addons = selectedAddOns.map((item) => ({
        id: item.sourceId,
        type: item.itemType,
        ...scheduleFor(item.id),
      }));
      const requests = bookingActivityReservations(
        { checkIn: form.checkIn, checkOut: form.checkOut, addOns: addons },
        activityInventory.catalog,
      );
      for (const item of selectedAddOns) {
        if (item.itemType === "package") continue;
        const selection = scheduleFor(item.id),
          resource = activityInventory.catalog.find(
            (resource) =>
              resource.id === item.sourceId &&
              resource.itemType === item.itemType,
          )!;
        const current = activitySession(
          resource,
          selection.bookingDate,
          selection.bookingTime,
          activityInventory.catalog,
          activityInventory.occupied,
        );
        if (current.error) return current.error;
      }
      assertActivityCapacity(
        requests,
        activityInventory.catalog,
        activityInventory.occupied,
      );
      return "";
    } catch (error) {
      return error instanceof Error
        ? error.message
        : "Choose valid activity sessions.";
    }
  })();

  const pricing = (() => {
    try {
      return {
        ...walkInTotals(
          selectedRoomType ? selectedRoomType.rate : 0,
          form.roomQuantity,
          nights,
          selectedAddOns,
          reservationFeePercent,
        ),
        error: "",
      };
    } catch (error) {
      return {
        roomTotal: 0,
        addOnTotal: 0,
        subtotal: 0,
        reservationFee: 0,
        total: 0,
        error: error instanceof Error ? error.message : "Invalid pricing.",
      };
    }
  })();
  const { roomTotal, addOnTotal, subtotal, reservationFee, total } = pricing;
  const payment = Number(form.downPayment || 0);
  const balance = Math.round((total - payment) * 100) / 100;

  useEffect(() => {
    if (submitting || pendingSave.current || !form.selectedRoomType) return;
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
  }, [roomOptions, form.selectedRoomType, form.roomQuantity, submitting]);

  const handleSubmit = async () => {
    if (submitting || loadingRooms) return;
    setSaveError("");
    if (inventoryError || priceError || pricing.error || activityError) {
      setSaveError(
        inventoryError || priceError || pricing.error || activityError,
      );
      return;
    }
    try {
      stayDates(form.checkIn, form.checkOut);
      if (form.checkIn < localDate())
        throw new Error("Check-in cannot be in the past.");
      if (!selectedRoomType) throw new Error("Select an available room type.");
      moneyCents(form.downPayment || 0);
      moneyCents(form.commissionAmount || 0);
      const fingerprint = JSON.stringify({ form, total });
      if (pendingSave.current?.fingerprint !== fingerprint)
        pendingSave.current = {
          fingerprint,
          id: doc(collection(db, "reservations")).id,
        };
      const request = pendingSave.current;
      setSubmitting(true);
      await ensureRecordReferences("BK", [request.id]);
      const result = await saveWalkIn({ ...form }, total, request.id);
      setBookingReference(result.reference);
      setAssignedNumbers(result.roomNumbers);
      setSuccess(true);
      pendingSave.current = null;
      // Logging failure is handled independently of the completed save.
      void createActivityLog({
        action: "Walk-in Booking Created",
        details:
          "Walk-in " +
          result.reference +
          " for " +
          form.firstName +
          " " +
          form.lastName +
          ". Rooms: " +
          result.roomNumbers.join(", "),
      });
    } catch (error) {
      if (
        !(error as { code?: string })?.code ||
        ["permission-denied", "invalid-argument"].includes(
          (error as { code?: string }).code || "",
        )
      )
        pendingSave.current = null;
      console.error("Error creating walk-in booking:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save the booking. Please try again.",
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
            {form.checkIn === localDate() ? "Checked in" : "Booking confirmed"}{" "}
            for {form.firstName} {form.lastName}
          </p>
          <p className="font-mono text-sm" style={{ color: "#0d7377" }}>
            Booking ID: {displayRecordId(bookingReference)}
          </p>
          <p className="mt-2 text-sm">Room(s): {assignedNumbers.join(", ")}</p>
          <AsyncButton
            type="button"
            onClick={() => {
              setSuccess(false);
              setStep(1);
              setForm(initialForm());
              setSaveError("");
            }}
            className="px-6 py-2.5 rounded-lg text-sm text-white"
            style={{ background: "#0d7377" }}
          >
            Register Another Guest
          </AsyncButton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {(inventoryError ||
        priceError ||
        pricing.error ||
        activityError ||
        saveError) && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
        >
          {saveError ||
            inventoryError ||
            priceError ||
            pricing.error ||
            activityError}
        </p>
      )}
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
                    disabled={submitting}
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
                disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
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
                  disabled={submitting}
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
                  <AsyncButton
                    key={room.id}
                    type="button"
                    disabled={submitting || room.available < 1}
                    onClick={() => {
                      update("selectedRoomType", room.id);
                      update(
                        "roomQuantity",
                        Math.max(1, Math.ceil(form.pax / room.capacity)),
                      );
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
                  </AsyncButton>
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
                  disabled={submitting}
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
                        disabled={
                          submitting ||
                          (!checked &&
                            (activityInventory.loading ||
                              Boolean(activityInventory.error) ||
                              !(item.itemType === "package"
                                ? activityEnabled(item)
                                : hasAvailableActivitySession(
                                    item,
                                    form.checkIn,
                                    form.checkOut,
                                    activityInventory.catalog,
                                    activityInventory.occupied,
                                  ))))
                        }
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
                        {item.itemType !== "package" && (
                          <ServiceAddOnAvailability
                            item={item}
                            firstDate={form.checkIn}
                            lastDate={form.checkOut}
                            catalog={activityInventory.catalog}
                            occupied={activityInventory.occupied}
                            selected={scheduleFor(item.id)}
                            loading={activityInventory.loading}
                            error={activityInventory.error}
                          />
                        )}
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

        {step === 2 && selectedAddOns.length > 0 && (
          <section className="mt-4 space-y-4 rounded-xl border p-4">
            <h3 className="text-sm font-semibold">
              Selected activities & packages
            </h3>
            {selectedAddOns.map((item) => {
              const resource = activityInventory.catalog.find(
                (resource) =>
                  resource.id === item.sourceId &&
                  resource.itemType === item.itemType,
              )!;
              return (
                <div key={item.id}>
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.itemType === "package" ? (
                    <PackageBookingFields
                      name={item.name}
                      value={scheduleFor(item.id)}
                      onChange={(value) =>
                        update("activitySchedules", {
                          ...form.activitySchedules,
                          [item.id]: value,
                        })
                      }
                      minDate={form.checkIn}
                      disabled={submitting}
                      showDate={false}
                    />
                  ) : (
                    <ActivitySchedulePicker
                      item={resource}
                      value={scheduleFor(item.id)}
                      onChange={(value) =>
                        update("activitySchedules", {
                          ...form.activitySchedules,
                          [item.id]: value,
                        })
                      }
                      catalog={activityInventory.catalog}
                      occupied={activityInventory.occupied}
                      loading={activityInventory.loading}
                      error={activityInventory.error}
                      minDate={form.checkIn}
                      maxDate={form.checkOut}
                      disabled={submitting}
                    />
                  )}
                </div>
              );
            })}
            {activityError && (
              <p role="status" className="text-xs text-amber-700">
                {activityError}
              </p>
            )}
          </section>
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
                ["Subtotal", money(subtotal)],
                [
                  "Reservation Fee (" + reservationFeePercent + "%)",
                  money(reservationFee),
                ],
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
                  disabled={submitting}
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
                  disabled={submitting}
                  type="number"
                  min={0}
                  step="0.01"
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
                  <AsyncButton
                    key={method}
                    type="button"
                    disabled={submitting}
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
                  </AsyncButton>
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
                disabled={submitting}
                type="number"
                min={0}
                max={total}
                step="0.01"
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
          <AsyncButton
            type="button"
            disabled={submitting}
            onClick={() => setStep((p) => p - 1)}
            className="px-6 py-2.5 rounded-lg border text-sm disabled:opacity-50"
            style={{ borderColor: "rgba(13,115,119,0.2)", color: "#4a7a7a" }}
          >
            Back
          </AsyncButton>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <AsyncButton
            type="button"
            disabled={
              submitting ||
              Boolean(
                inventoryError || priceError || pricing.error || activityError,
              ) ||
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
                if (nights < 1 || form.checkIn < localDate()) {
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
          </AsyncButton>
        ) : (
          <AsyncButton
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              loadingRooms ||
              Boolean(
                inventoryError || priceError || pricing.error || activityError,
              )
            }
            className="px-6 py-2.5 rounded-lg text-sm text-white disabled:opacity-50"
            style={{ background: "#0d7377" }}
          >
            {submitting
              ? "Processing..."
              : form.checkIn === localDate()
                ? "Confirm & Check In"
                : "Confirm Booking"}
          </AsyncButton>
        )}
      </div>
    </div>
  );
}
