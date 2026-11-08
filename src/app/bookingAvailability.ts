export type BookingRecord = Record<string, any>;

const permanentReferences = new Map<string, string>();
export function rememberRecordReference(
  id: string,
  prefix: string,
  reference: string,
) {
  for (const alias of [
    id,
    `${prefix}-${id}`,
    `BK-${id}`,
    `CBR-${id}`,
    `RCP-${id}`,
  ])
    permanentReferences.set(`${prefix}:${alias}`, reference);
}

// Display only: never use these references as Firestore document paths.
export function displayRecordId(value: unknown, prefix = "BK"): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const remembered = permanentReferences.get(`${prefix}:${raw}`);
  if (remembered) return remembered;
  if (/^[A-Z]{2,6}-[A-Z0-9-]{1,16}$/.test(raw)) return raw;
  const source = raw.replace(/^(?:BK|CBR|RCP|GST)-/, "");
  const aliased = permanentReferences.get(`${prefix}:${source}`);
  if (aliased) return aliased;
  let hash = 14695981039346656037n;
  for (const character of source) {
    hash ^= BigInt(character.codePointAt(0)!);
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return `${prefix}-${hash.toString(36).toUpperCase().padStart(13, "0")}`;
}
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
        [r.roomNumber, r.number, r.roomNo, r.room, r.roomId, r.id].find(
          (value) =>
            value != null &&
            String(value).trim() !== "" &&
            !/^0+$/.test(String(value).trim()),
        ) ?? r.id,
      ).trim(),
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
  // Explicit physical assignments take precedence over legacy display labels.
  // Old records may share a placeholder room number (for example "0").
  const explicit = [...new Set(ids)].filter((id) =>
    rooms.some((room) => room.id === id),
  );
  if (explicit.length) return explicit;
  ids.length = 0;
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
  if (ids.length) return [...new Set(ids)];
  for (const number of numbers) {
    const label = number.trim();
    if (!label || /^0+$/.test(label)) continue;
    const matches = rooms.filter(
      (room) =>
        String(room.roomNumber).trim() === label ||
        String(room.roomId || "").trim() === label,
    );
    // Ambiguous labels cannot identify a physical room. Type capacity is still
    // reserved by roomQuantity when no unique physical assignment is known.
    if (matches.length === 1) ids.push(matches[0].id);
  }
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
export const holdsRoom = (booking: BookingRecord) =>
  [
    "confirmed",
    "reserved",
    "approved",
    "checked-in",
    "checkedin",
    "occupied",
  ].includes(normalizeBookingValue(booking.status));
const covers = (booking: BookingRecord, date: string) =>
  holdsRoom(booking) &&
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
      holdsRoom(b) &&
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
// A reservation holds capacity, but only check-in means the guest occupies it.
export function roomStatusOnDate(
  room: BookingRecord,
  booking: BookingRecord | undefined,
  date: string,
  today = localDate(),
) {
  if (blockedRoom(room)) return "maintenance";
  if (
    date === today &&
    ["occupied", "checked-in"].includes(normalizeBookingValue(room.status))
  )
    return "occupied";
  if (!booking) return "available";
  return [
    "checked-in",
    "checkedin",
    "checked-in-occupied",
    "occupied",
  ].includes(normalizeBookingValue(booking.status))
    ? "occupied"
    : "reserved";
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

export function bookingTotal(record: BookingRecord) {
  return (
    moneyCents(record.totalPrice ?? record.totalAmount ?? record.total ?? 0) /
    100
  );
}
export function bookingPaid(record: BookingRecord) {
  return moneyCents(record.amountPaid ?? record.paid ?? 0) / 100;
}
export function cancelled(record: BookingRecord) {
  return ["cancelled", "canceled", "rejected"].includes(
    normalizeBookingValue(record.status),
  );
}
export function paymentUpdate(booking: BookingRecord, amount: unknown) {
  if (cancelled(booking))
    throw new Error("Payments cannot be added to a cancelled booking.");
  const total = moneyCents(bookingTotal(booking));
  const paid = moneyCents(bookingPaid(booking));
  const received = moneyCents(amount);
  if (received <= 0) throw new Error("Enter a payment greater than zero.");
  if (received > total - paid)
    throw new Error("Payment exceeds the current remaining balance.");
  const balance = total - paid - received;
  return {
    amountPaid: (paid + received) / 100,
    paid: (paid + received) / 100,
    balance: balance / 100,
    remainingBalance: balance / 100,
    paymentStatus: balance === 0 ? "paid" : "partial",
  };
}
export function pendingPayment(record: BookingRecord) {
  const status = normalizeBookingValue(record.status);
  const verification = normalizeBookingValue(record.verificationStatus);
  return (
    ["pending", "pending-verification"].includes(status) &&
    !["verified", "rejected"].includes(verification)
  );
}
export function completedPayment(record: BookingRecord) {
  return (
    ["completed", "paid", "verified"].includes(
      normalizeBookingValue(record.status),
    ) &&
    !["pending", "rejected"].includes(
      normalizeBookingValue(record.verificationStatus),
    )
  );
}
export function salesSummary(records: BookingRecord[], now = new Date()) {
  const bookings = records.filter((record) => !cancelled(record));
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    return {
      key: dateOnly(date).slice(0, 7),
      month: date.toLocaleDateString("en-PH", {
        month: "short",
        year: "2-digit",
      }),
      revenue: 0,
    };
  });
  const types = new Map<
    string,
    { name: string; value: number; bookings: number }
  >();
  const channels = new Map<string, number>();
  let totalCents = 0,
    nights = 0,
    roomNights = 0,
    roomCents = 0;
  for (const booking of bookings) {
    const cents = moneyCents(bookingTotal(booking));
    totalCents += cents;
    const month = monthly.find(
      (item) =>
        item.key === dateOnly(booking.checkIn ?? booking.createdAt).slice(0, 7),
    );
    if (month) month.revenue = (Math.round(month.revenue * 100) + cents) / 100;
    const kind = normalizeBookingValue(booking.bookingType ?? booking.itemType);
    const activityOnly =
      ["service", "activity", "package"].includes(kind) ||
      (!booking.roomTypeName &&
        !booking.roomType &&
        !booking.roomName &&
        !booking.room &&
        (booking.serviceName || booking.packageName || booking.activityName));
    if (!activityOnly) {
      const name = String(
        booking.roomTypeName || booking.roomType || booking.roomName || "Other",
      );
      const roomValue =
        booking.roomSubtotal ?? booking.roomTotal ?? bookingTotal(booking);
      const group = types.get(name) ?? { name, value: 0, bookings: 0 };
      group.value =
        (Math.round(group.value * 100) + moneyCents(roomValue)) / 100;
      group.bookings++;
      types.set(name, group);
    }
    const channel =
      normalizeBookingValue(booking.bookingSource ?? booking.bookingType) ===
      "walk-in"
        ? "Walk-in"
        : "Online";
    channels.set(channel, (channels.get(channel) ?? 0) + 1);
    try {
      const length = stayDates(
        dateOnly(booking.checkIn),
        dateOnly(booking.checkOut),
      ).length;
      const quantity = roomQuantity(booking);
      nights += length;
      roomNights += length * quantity;
      roomCents += moneyCents(
        booking.roomSubtotal ??
          booking.roomTotal ??
          Number(booking.roomRate ?? 0) * length * quantity,
      );
    } catch {
      /* Activity-only or legacy records have no valid room stay. */
    }
  }
  return {
    totalRevenue: totalCents / 100,
    totalBookings: bookings.length,
    avgDailyRate: roomNights ? roomCents / 100 / roomNights : 0,
    avgStayDuration: bookings.length ? nights / bookings.length : 0,
    monthlyRevenue: monthly,
    roomTypeRevenue: [...types.values()],
    bookingChannels: [...channels].map(([name, count]) => ({
      name,
      value: Number(((100 * count) / bookings.length).toFixed(2)),
    })),
  };
}
