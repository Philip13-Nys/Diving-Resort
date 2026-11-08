import { useActivityAvailability } from "../useActivityAvailability";
import {
  activityBookingKey,
  occupiedActivities,
  activityKind,
  activitySelections,
  type ActivityRecord,
} from "../activityAvailability";
import ActivitySchedulePicker, {
  type ActivitySchedule,
} from "./ActivitySchedulePicker";
import PackageBookingFields from "./PackageBookingFields";
export default function BookingActivityEditor({
  booking,
  onChange,
}: {
  booking: ActivityRecord;
  onChange: (booking: ActivityRecord) => void;
}) {
  const inventory = useActivityAvailability();
  const occupied = occupiedActivities(
    inventory.catalog,
    inventory.bookings,
    inventory.allocations,
    activityBookingKey({
      ...booking,
      _bookingStore:
        booking.bookingStore || booking._bookingStore || "customer",
    }),
  );
  const primary = ["service", "package", "activity"].includes(
    String(booking.itemType || booking.bookingType).toLowerCase(),
  );
  const selections = activitySelections(booking);
  if (!selections.length) return null;
  const disabled = ["cancelled", "checked-out", "completed"].includes(
    String(booking.status),
  );
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold">Activities & packages</h4>
      <p className="text-xs text-gray-500">
        Review the total when changing participants. Only standalone services
        require sessions and reserve inventory.
      </p>
      {selections.map((selection, index) => {
        const item = inventory.catalog.find(
          (item) =>
            item.id === selection.itemId.replace(/^(service|package)-/, "") &&
            activityKind(item) === selection.itemType,
        );
        if (!item)
          return (
            <p key={index} className="text-xs text-red-700">
              An activity could not be found in the catalog.
            </p>
          );
        const value: ActivitySchedule = {
          bookingDate: selection.bookingDate || booking.checkIn || "",
          bookingTime: selection.bookingTime || "",
          participants: selection.participants,
          ...(selection.quantity !== undefined
            ? { quantity: selection.quantity }
            : {}),
        };
        const update = (value: ActivitySchedule) => {
          if (primary && index === 0)
            onChange({
              ...booking,
              ...value,
              checkIn: value.bookingDate,
              checkOut: value.bookingDate,
              pax: value.participants,
              guests: value.participants,
            });
          else {
            const addonIndex = index - (primary ? 1 : 0),
              unitPrice = Number(
                item.itemType === "package"
                  ? (item.packagePrice ?? item.price)
                  : item.price,
              );
            onChange({
              ...booking,
              addOns: booking.addOns.map((addon: ActivityRecord, i: number) =>
                i === addonIndex
                  ? {
                      ...addon,
                      ...value,
                      unitPrice,
                      price: unitPrice * value.participants,
                    }
                  : addon,
              ),
            });
          }
        };
        return (
          <div key={index}>
            <p className="text-sm font-medium">{item.name}</p>
            {selection.itemType === "package" ? (
              <PackageBookingFields
                name={item.name}
                value={value}
                onChange={update}
                minDate={primary ? today : booking.checkIn || today}
                disabled={disabled}
                showDate={primary}
              />
            ) : (
              <ActivitySchedulePicker
                item={item}
                value={value}
                onChange={update}
                catalog={inventory.catalog}
                occupied={occupied}
                loading={inventory.loading}
                error={inventory.error}
                minDate={primary ? today : booking.checkIn || today}
                maxDate={primary ? undefined : booking.checkOut}
                disabled={disabled}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}
