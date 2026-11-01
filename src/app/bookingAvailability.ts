export type BookingRecord = Record<string, any>;
export const normalizeBookingValue = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function dateOnly(value: any): string {
  if (value?.toDate) return localDate(value.toDate());
  if (value instanceof Date) return localDate(value);
  return String(value ?? "").slice(0, 10);
}
export function stayDates(start: string, end: string): string[] {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new Error("Select valid check-in and check-out dates.");
    const time = Date.parse(`${value}T00:00:00Z`);
    if (
      !Number.isFinite(time) ||
      new Date(time).toISOString().slice(0, 10) !== value
    )
      throw new Error("Select valid stay dates.");
    return time;
  };
  const first = parse(start),
    last = parse(end),
    count = (last - first) / 86400000;
  if (count < 1 || count > 365)
    throw new Error("A stay must be between 1 and 365 nights.");
  return Array.from({ length: count }, (_, i) =>
    new Date(first + i * 86400000).toISOString().slice(0, 10),
  );
}
export function activeBooking(booking: BookingRecord): boolean {
  return ![
    "cancelled",
    "canceled",
    "rejected",
    "completed",
    "checked-out",
  ].includes(normalizeBookingValue(booking.status));
}
export function roomQuantity(booking: BookingRecord): number {
  const quantity = Number(
    booking.roomCount ??
      booking.roomsBooked ??
      booking.roomQuantity ??
      booking.numberOfRooms ??
      booking.quantity ??
      1,
  );
  if (!Number.isInteger(quantity) || quantity < 1)
    throw new Error(
      "An existing booking has an invalid room count. Correct it before allocating rooms.",
    );
  return quantity;
}
export function mergeReservations(
  bookings: BookingRecord[],
  legacy: BookingRecord[],
): BookingRecord[] {
  const references = new Set(
    bookings.flatMap((b) =>
      [b.id, b.bookingId, b.bookingRef].filter(Boolean).map(String),
    ),
  );
  const seen = new Set<string>();
  return [
    ...bookings,
    ...legacy
      .filter((b) => {
        const link = String(b.bookingId || b.bookingRef || "");
        if (link && (references.has(link) || seen.has(link))) return false;
        if (link) seen.add(link);
        return true;
      })
      .map((b) => ({ ...b, id: `legacy-${b.id}` })),
  ];
}
export function normalizeInventory(
  records: BookingRecord[],
  types: BookingRecord[] = [],
): BookingRecord[] {
  return records.map((r) => {
    const rawType = r.type ?? r.roomTypeName ?? r.roomType ?? "";
    const typeName =
      typeof rawType === "object"
        ? String(rawType.name || "")
        : String(rawType);
    const type = types.find(
      (t) =>
        t.id === (r.roomTypeId ?? r.typeId) ||
        normalizeBookingValue(t.name) === normalizeBookingValue(typeName),
    );
    return {
      ...r,
      id: String(r.id),
      roomNumber: String(
        r.roomNumber ?? r.number ?? r.roomNo ?? r.room ?? r.roomId ?? r.id,
      ),
      type: type?.name || typeName,
      roomTypeId: String(type?.id ?? r.roomTypeId ?? r.typeId ?? ""),
      rate: Number(r.rate ?? r.price ?? r.basePrice ?? type?.basePrice ?? 0),
      capacity: Number(
        r.capacity ??
          r.maxGuests ??
          r.pax ??
          type?.maxGuests ??
          type?.capacity ??
          2,
      ),
      status: normalizeBookingValue(r.status || "available"),
    };
  });
}
export function blockedRoom(room: BookingRecord): boolean {
  return (
    room.deleted === true ||
    room.isActive === false ||
    room.disabled === true ||
    [room.status, room.condition].some((value) =>
      /maintenance|cleaning|out-of-order|out-of-service|unavailable|damaged|inactive/.test(
        normalizeBookingValue(value),
      ),
    )
  );
}
export function assignedRoomIds(
  booking: BookingRecord,
  rooms: BookingRecord[],
): string[] {
  const ids: string[] = [
    ...(booking.assignedRoomIds || booking.roomIds || []),
    booking.physicalRoomId,
  ]
    .filter(Boolean)
    .map(String);
  // Online roomId identifies the TYPE; only treat it as a physical ID when it
  // actually matches a room document or its separate roomId alias.
  if (booking.roomId) {
    const physical = rooms.find(
      (r) =>
        (r.id === String(booking.roomId) ||
          r.roomId === String(booking.roomId)) &&
        String(booking.roomId) !== r.roomTypeId,
    );
    if (physical) ids.push(physical.id);
  }
  const numbers = [
    ...(booking.assignedRoomNumbers || booking.roomNumbers || []),
    booking.roomNumber,
    booking.roomName,
    booking.room,
  ]
    .filter(Boolean)
    .map(String);
  for (const room of rooms)
    if (numbers.includes(room.roomNumber)) ids.push(room.id);
  return [...new Set(ids)].filter((id) => rooms.some((r) => r.id === id));
}
export function matchesRoomType(
  booking: BookingRecord,
  type: BookingRecord,
  rooms: BookingRecord[],
): boolean {
  const name = normalizeBookingValue(type.name ?? type.type);
  const id = String(type.id ?? type.roomTypeId ?? "");
  if (
    [booking.roomTypeId, booking.typeId, booking.roomId].some(
      (value) => id && String(value ?? "") === id,
    )
  )
    return true;
  if (
    [
      booking.roomType,
      booking.roomTypeName,
      booking.roomName,
      booking.type,
    ].some((value) => name && normalizeBookingValue(value) === name)
  )
    return true;
  return assignedRoomIds(booking, rooms).some((roomId) =>
    rooms.some(
      (r) =>
        r.id === roomId &&
        (r.roomTypeId === id || normalizeBookingValue(r.type) === name),
    ),
  );
}
const covers = (booking: BookingRecord, date: string) =>
  activeBooking(booking) &&
  dateOnly(booking.checkIn) <= date &&
  date < dateOnly(booking.checkOut);

export function typeAvailability(
  rooms: BookingRecord[],
  bookings: BookingRecord[],
  type: BookingRecord,
  start: string,
  end: string,
) {
  const dates = stayDates(start, end);
  const pool = rooms.filter(
    (r) =>
      !blockedRoom(r) &&
      (r.roomTypeId === type.id ||
        normalizeBookingValue(r.type) === normalizeBookingValue(type.name)),
  );
  const relevant = bookings.filter(
    (b) =>
      (!type.excludeBookingId || b.id !== type.excludeBookingId) &&
      activeBooking(b) &&
      matchesRoomType(b, type, rooms),
  );
  const held = new Set<string>();
  let available = pool.length;
  for (const date of dates) {
    const assigned = new Set<string>();
    let unassigned = 0;
    for (const booking of relevant.filter((b) => covers(b, date))) {
      const ids = assignedRoomIds(booking, rooms).filter((id) =>
        pool.some((r) => r.id === id),
      );
      ids.forEach((id) => {
        assigned.add(id);
        held.add(id);
      });
      unassigned += Math.max(0, roomQuantity(booking) - ids.length);
    }
    // Do not subtract a room's Occupied flag a second time when its booking
    // already accounts for that room. Untracked occupancy still blocks today.
    const occupied =
      date <= localDate()
        ? pool.filter((r) => ["occupied", "checked-in"].includes(r.status))
            .length
        : 0;
    available = Math.min(
      available,
      pool.length - Math.max(assigned.size + unassigned, occupied),
    );
  }
  const candidates = pool
    .filter(
      (r) =>
        !held.has(r.id) &&
        !(
          start <= localDate() && ["occupied", "checked-in"].includes(r.status)
        ),
    )
    .sort(
      (a, b) =>
        b.capacity - a.capacity ||
        a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }),
    );
  available = Math.max(0, Math.min(available, candidates.length));
  return { available, candidates, inventory: pool.length };
}
export function allocateRooms(
  rooms: BookingRecord[],
  bookings: BookingRecord[],
  type: BookingRecord,
  start: string,
  end: string,
  quantity: number,
  guests: number,
): BookingRecord[] {
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !Number.isInteger(guests) ||
    guests < 1
  )
    throw new Error("Enter valid room and guest counts.");
  const result = typeAvailability(rooms, bookings, type, start, end);
  if (quantity > result.available)
    throw new Error(
      `Only ${result.available} room(s) remain available for these dates. Please select again.`,
    );
  const selected = result.candidates.slice(0, quantity);
  if (selected.reduce((sum, r) => sum + r.capacity, 0) < guests)
    throw new Error("The selected rooms cannot accommodate this many guests.");
  return selected;
}
// Type-only online bookings reserve capacity, not every room of that type.
// This projection is for the availability screen; it never writes an assignment.
export function roomBookingsOnDate(
  rooms: BookingRecord[],
  bookings: BookingRecord[],
  date: string,
): Map<string, BookingRecord> {
  const result = new Map<string, BookingRecord>();
  const active = bookings
    .filter((b) => covers(b, date))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const booking of active)
    for (const id of assignedRoomIds(booking, rooms)) result.set(id, booking);
  for (const booking of active) {
    let remaining = Math.max(
      0,
      roomQuantity(booking) - assignedRoomIds(booking, rooms).length,
    );
    for (const room of rooms) {
      if (!remaining) break;
      if (
        result.has(room.id) ||
        blockedRoom(room) ||
        !matchesRoomType(
          booking,
          { id: room.roomTypeId, name: room.type },
          rooms,
        )
      )
        continue;
      result.set(room.id, booking);
      remaining--;
    }
  }
  return result;
}
export function bookingRoomLabel(booking: BookingRecord): string {
  const numbers = booking.assignedRoomNumbers || booking.roomNumbers;
  return Array.isArray(numbers) && numbers.length
    ? numbers.join(", ")
    : String(
        booking.roomNumber ||
          booking.roomName ||
          booking.roomTypeName ||
          booking.roomType ||
          "",
      );
}
export function moneyCents(value: unknown): number {
  const number = Number(value);
  const cents = Math.round(number * 100);
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(number * 100 - cents) > 0.000001
  )
    throw new Error("Enter a valid amount with at most two decimal places.");
  return cents;
}
