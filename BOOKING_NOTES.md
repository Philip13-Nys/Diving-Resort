# Walk-in bookings and commissions

This implementation uses the existing Firebase client SDK and works with the
current Firebase plan. Login, billing configuration, Cloud Functions and deployed
security rules were not changed.

## Data connection

- Online bookings remain in `customeraccount-ce2ae/Bookings`.
- New Walk-ins are saved as full records in `admin-80f41/reservations`.
  The customer booking form already reads that collection when it checks room
  availability. This avoids requiring a separate Customer-project login for
  staff to create a booking.
- Walk-in receipts are in `admin-80f41/Payments`, saved in the same transaction as
  the reservation. Staff booking/payment readers merge these records with the
  existing Customer-project records. Updates use the original record's project.
- Staff availability also includes legacy reservations and deduplicates linked
  online/reservation records. Changes are observed with Firestore listeners.

New records include the online-compatible `roomId` (room-type document ID),
`roomName` (room-type name), `roomCount`, `totalPrice`, `reservationFeePercent`,
`reservationFee`, `amountPaid`, `remainingBalance` and lowercase statuses.
Additional aliases keep existing staff screens compatible.

Physical room document IDs and numbers are stored separately as
`assignedRoomIds` and `assignedRoomNumbers`. Multi-room bookings reserve the actual
rooms for the entire stay. Checkout is exclusive for date availability. Today's
arrival is saved as `checked-in`; future arrivals are `confirmed`. Checked-out and
cancelled bookings do not hold future inventory. Cleaning/maintenance still
blocks a physical room until its status is made available.

Walk-in prices use the same room-type base price, add-on prices, configured
reservation-fee percentage and whole-peso fee rounding as the inspected customer
booking form. The confirmation screen displays the fee. Save re-reads the prices
and asks for a refreshed review if the quoted total changed.

## Commission Report

The Admin report reads both booking sources, including existing Walk-ins in the
Customer project's Bookings collection. It uses the saved `commissionerName` and
`commissionAmount`, groups by commissioner, and provides booking-level details,
six-month trends and CSV export. Filters use the **check-in month**. Cancelled and
rejected bookings are excluded. Missing commission fields mean no recorded
commission; no percentage or staff attribution is invented. Legacy commissions
without a name appear as “Unassigned commissioner”. Invalid amounts are flagged.
Recorded commission is not a payout ledger.

## Concurrency limits and compatibility

A transaction lock at `admin-80f41/BookingLocks/{roomTypeId}` coordinates the staff
Walk-in writers. Retrying the same draft uses the same reservation/payment IDs,
so an uncertain network response does not immediately create another record.
Payment failure rolls back the reservation as well. The read-only rules check
confirmed that the deployed Admin rules allow these operations; no rules were
edited or published. If those rules are tightened later, the staff account will
need permissions for reservations, payments and the lock documents.

Only the staff system was changed, as requested. The customer module's own pages
are unchanged: its final booking form reads Admin reservations, but some other
customer availability views currently read only Customer Bookings. Its existing
availability calculation and direct booking writes do not participate in the
staff lock. Therefore a simultaneous new online booking and Walk-in cannot be
guaranteed conflict-free across both projects. A complete cross-site guarantee
requires changing the customer writer to a shared allocation protocol too.

## Verification

```powershell
npm run test:bookings
npm run build
```

The normal test command runs pure booking/commission tests and explicitly skips
integration tests without an emulator. For local Firestore integration tests:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8092'
npm run test:bookings
```

Integration tests use only `demo-resort-walkin-admin` and
`demo-resort-walkin-customer`, reject non-local emulator hosts, and clear only
those demo namespaces. No live guest records are created by the tests.
