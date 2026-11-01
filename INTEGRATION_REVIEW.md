# Staff system integration review — 2026-11-01

## Scope and result

Reviewed the Admin, Manager and Receptionist routes, their page data sources and mutation handlers, shared booking helpers, authentication, Firebase configuration, upload integration, report/export code, notification navigation, shared UI controls, existing Functions source and deployment workflows. The separate customer application was not modified, consistent with your instruction. This is a substantial local integration pass, not certification that every production workflow is correct.

No paid service, API, subscription, dependency, billing upgrade, deployment or production-data migration was added or executed. Existing visual classes, colors and principal layouts remain. Previously requested loading buttons and the removal of the duplicate Manager Bookings page remain.

## Connections and corrections

- Authentication: route boundaries load the real Users profile before mounting protected pages. Role/disabled checks are also performed by the new booking, payment, guest, maintenance and backup operations. Managers can use receptionist workflows; receptionists cannot enter management/admin areas. Active/Inactive remains login presence; Disabled denies access. Staff is a personnel-only role without a portal. Logout consistently uses the existing presence updater.
- Accounts/personnel: duplicate usernames are checked; account-creation failures attempt Auth cleanup; secondary Auth signs out; self-deletion/access removal is blocked. Manager Staff Profiles now edits the same Staff collection as Admin instead of modifying login accounts.
- Booking sources: staff displays combine online Bookings and independent staff reservations, normalize status aliases, and avoid linked mirror duplicates. Valid legacy staff reservations are included.
- Synchronization: active pages subscribe to dependent records. Booking/payment display reads reuse shared listener snapshots; transactional writes use fresh reads. Listener failures produce a visible warning. This is not unlimited/free-quota-proof synchronization: collection sizes and concurrent users still affect Firebase read usage.
- Booking lifecycle: confirmation assigns actual rooms; check-in validates dates/status; checkout validates payments; editing preserves the latest recorded payment amount, recalculates nights and balance aliases, and checks availability. Opening Reservations no longer performs a sequential-ID migration. Room inventory changes are guarded against active reservations.
- Payments: GCash review uses the receipt's actual project; verify/reject are mutually exclusive transactions. Centavo arithmetic prevents floating-point balance errors. In-person receipt IDs persist across retries. Cancellation/overpayment are rejected. Pending and rejected payments are excluded from collection summaries.
- Maintenance: saving/resolving/removing requests updates room condition in the same staff-project transaction. Multiple open requests keep the room unavailable until all are resolved.
- Guests: Add Guest creates a Guests profile, not an incomplete/fake booking. Both guest screens use the same aggregation; contact edits overlay history, while payment totals derive from recorded amounts. No-email guests without matching identifying details are kept separate.
- Rooms/calendar: the Book room action opens Walk-in with the selected room type; room-management availability includes online and staff data; calendar separates physical assignments from unassigned bookings. Multi-room occupied counts use actual room IDs.
- Reports: manager templates query real records; date filtering applies; CSV exports quote values safely; Excel exports SpreadsheetML XML; PDF uses the browser print/save-as-PDF dialog. Report history remains in the current session. Sales Analytics now calculates real booking values, channels and room-night metrics. Financial collection summaries use receipts; expenses/profit are marked unavailable instead of fabricated.
- Notifications: booking notifications open a matching search; inquiry links identify their inquiry; receptionist header search opens matching reservations. Read markers are scoped to the signed-in account on that browser.
- Settings/uploads: private/public general settings save as one batch; QR uploads reuse the existing Cloudinary helper; image limits align; package price/discount validation added.
- Audit/backups: previously disconnected sample screens now have Admin routes/menu entries. Audit shows real ActivityLogs with filtering, pagination and CSV export. Backup exports known staff/customer collections and inquiry replies to local JSON, preserves timestamps, and restores only missing staff documents after confirmation. No scheduled backup service is represented as active.
- Configuration: startup gives a visible configuration error rather than a blank screen. CI workflows map six Firebase build values from repository secrets; .env.example lists the required variables.

## Verification actually performed

- 43 automated checks passed, zero failures/skips, including 15 integration tests against a localhost Firestore emulator with demo project IDs.
- Coverage includes last-room competition between Walk-in clients, idempotent Walk-in retry, online reservations blocking Walk-ins, stale-price rejection, payment-write rollback, wrong-project payment review, concurrent verify/reject, editing after newer payments, physical-room assignment, unpaid-checkout rejection, maintenance blocking, standalone guest persistence and disabled-account rejection.
- Pure tests cover date/room quantity rules, commission records/CSV, currency precision, roles, status transitions, guest aggregation and backup path validation.
- Frontend TypeScript check passed.
- Production Vite build passed (2,608 modules). Bundle-size warning remains; no build error.
- git diff --check passed.
- Static inspection found 190 page buttons wired to handlers, submit behavior or child links. This is a wiring check, not proof that all interactions succeed.
- Browser smoke testing was attempted. Chrome browser connector was unavailable and the in-app browser timed out connecting to the localhost preview. No authenticated visual or end-to-end browser workflow was successfully verified.
- No live booking/payment/account writes, actual Cloudinary upload, real notification delivery, backup restore, or production security-rule deployment was performed.

## Remaining issues and limits — do not treat these as solved

1. **Server-side authorization remains a release blocker.** Client route/operation checks do not secure a permissive Firestore database. Earlier inspection found broadly permissive deployed rules. They were not deployed or changed in this pass. Username login currently queries Users before authentication, and staff Auth belongs to a different project from customer bookings. Secure rules require a coordinated identity/login design across the two projects; simply locking either project would break existing workflows. See Firebase's [rules guidance](https://firebase.google.com/docs/firestore/security/rules-conditions).
2. **Cross-project consistency is not atomic.** Online booking status and staff physical-room status cannot commit in one transaction across Firebase projects. Mirror failures are reported for manual reconciliation. The customer app does not participate in the staff reservation lock, so simultaneous online/Walk-in creation cannot be fully serialized by changes in this repository alone. See [transaction scope](https://firebase.google.com/docs/firestore/manage-data/transactions).
3. Pricing Rules stores free-text periods/multipliers but the customer booking formula does not consume those rules. Automatic seasonal pricing was not enabled: doing so only for staff would violate the existing online-price parity requirement. Base prices and reservation-fee settings remain connected. Define machine-readable effective dates/precedence and update both booking writers before activating these rules.
4. Expenses/refunds and full profit accounting have no reliable ledger in this project. No fabricated expense/profit values are presented. Booking values and collected payments are different metrics; legacy data can still disagree and requires reconciliation.
5. No complete security audit trail exists: ActivityLogs records application operations that explicitly log events, not every Auth failure or every direct database write. Retention and automatic critical-event alerts were not invented.
6. Local backups are not disaster recovery. They exclude Auth credentials/accounts, image binaries, unknown collections/subcollections and Firebase configuration/rules. Restore is additive and not atomic across the whole file; it preserves existing records, skips Users and does not restore customer-project documents. Background schedules, compression, encryption and paid storage choices are explicitly not configured. Export/restore browser behavior still needs manual verification.
7. Notification delivery still depends on customer-project rules and a real customer UID; Walk-ins without a customer UID cannot receive customer-account notifications. Read markers do not sync between devices. Some customer pages do not read staff reservations.
8. Account deletion removes the Users profile, not the Firebase Auth identity. Removing another user's Auth identity requires Firebase Console/admin tooling. No paid backend was added. Existing server Functions/AI source was left untouched and is not required by these integrations.
9. Some original loaders still report failures to the console instead of dedicated per-page error panels. Server enforcement of uniqueness for all legacy CRUD paths, comprehensive UI testing, production permission validation, and full audit coverage remain unfinished. Do not describe this system as fully production-verified.

## Configuration required

Local .env uses the six names in .env.example. CI requires secrets VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, CUSTOMER_FIREBASE_API_KEY, CUSTOMER_FIREBASE_AUTH_DOMAIN, CUSTOMER_FIREBASE_PROJECT_ID. The CUSTOMER names avoid case-insensitive GitHub secret-name collisions with the existing lower-case-s environment aliases. Firebase Hosting deployment still requires its pre-existing service-account secret. Existing Firebase Auth/Firestore and Cloudinary upload configuration must work within the user's current plans. No credentials were printed or embedded in this report.

## Files changed in this pass

- .env.example
- .github/workflows/deploy.yml
- .github/workflows/firebase-hosting-merge.yml
- .github/workflows/firebase-hosting-pull-request.yml
- package.json
- src/app/App.tsx
- src/app/RequireRole.tsx
- src/app/activitylogss.ts
- src/app/auth.ts
- src/app/bookingOperations.ts
- src/app/bookingStore.ts
- src/app/components/AdminLayout.tsx
- src/app/components/AuditLogs.tsx
- src/app/components/BackupManagement.tsx
- src/app/components/Dashboard.tsx
- src/app/components/ManagerDashboard.tsx
- src/app/components/PaymentConfiguration.tsx
- src/app/components/ReceptionistDashboard.tsx
- src/app/components/SalesReports.tsx
- src/app/components/StaffProfiles.tsx
- src/app/components/SystemSettings.tsx
- src/app/components/UserRoleManagement.tsx
- src/app/localBackup.ts
- src/app/login.tsx
- src/app/maintenanceOperations.ts
- src/app/reportData.ts
- src/app/routes.tsx
- src/app/saveWalkIn.ts
- src/main.tsx
- src/manager/ActivityLogs.tsx
- src/manager/GuestRecords.tsx
- src/manager/MaintenanceManagement.tsx
- src/manager/ManagerLayout.tsx
- src/manager/ManagersDashboard.tsx
- src/manager/ManagersStaffProfiles.tsx
- src/manager/PricingManagement.tsx
- src/manager/ReceptionistDashboards.tsx
- src/manager/Reports.tsx
- src/manager/RoomManagement.tsx
- src/manager/SalesAnalytics.tsx
- src/manager/ServicesManagement.tsx
- src/receptionist/CalendarView.tsx
- src/receptionist/CustomerReservations.tsx
- src/receptionist/Guests.tsx
- src/receptionist/Inquiries.tsx
- src/receptionist/Payments.tsx
- src/receptionist/ReceptionistLayout.tsx
- src/receptionist/ReceptionistsDashboard.tsx
- src/receptionist/Reports.tsx
- src/receptionist/RoomAvailability.tsx
- src/receptionist/WalkIn.tsx
- src/services/cloudinary.ts
- tests/integration.test.cjs
- tests/walkIn.emulator.test.cjs

The pre-existing .firebase/hosting.ZGlzdA.cache change is unrelated and was not edited for this review.

## File consolidation follow-up

Eight small helper files were consolidated without changing their behavior: accessPolicy and requireAccess into auth; recordValues into bookingAvailability; liveRecords and guestStore into bookingStore; useRecordRevision into useBookingInventory; exportData into reportData; paymentOperations into bookingOperations. All imports and test paths were updated. The 43 tests passed again with zero skips, TypeScript and production build passed, and no stale imports remain. Loading buttons and UI styling were unchanged. The limitations above still apply.

### Shared listener and notification cleanup

- Inventory, commission reports, and receptionist alerts now reuse bookingStore's collection listener registry. Guest display reads reuse available snapshots. Unsubscribing twice is harmless; queued cached callbacks are suppressed after unsubscribe.
- Booking, payment, and inquiry notifications now use the existing activitylogss module's shared writer, retaining their destinations and failure handling. No new files, services, dependencies, or page removals were needed.
- Added three regression tests to the existing integration test file for subscription sharing/lifecycle, listener errors, and notification persistence/error policies. Current run: 31 passed, 15 emulator tests skipped because the emulator was not running. TypeScript passed. No live database or browser end-to-end verification was performed for this cleanup.

### Occupancy display correction

Reception and manager availability now share date-specific status classification. Future reservations no longer change reception's current status. Admin manager totals count physical rooms instead of booking documents. Manager occupancy excludes pending/confirmed reservations; historical calculations use checked-in/completed stays and the shared room quantity aliases. Existing occupied flags remain authoritative for today; live database values were not inspected or reset. Added coverage for pending reservations, multi-room check-ins, future stays, checkout, and occupied flags. TypeScript passed; 32 tests passed and 15 emulator cases skipped. Browser verification remains outstanding.

### Confirmed all-rooms-occupied root cause

Read-only production inspection confirmed all 25 room records have roomNumber=0 and status=available. One checked-in staff booking has a valid assignedRoomIds entry plus assignedRoomNumbers=["0"]. The old assignedRoomIds helper expanded that shared label into every physical room. Explicit physical IDs now take precedence; zero/ambiguous legacy labels do not identify rooms. Inventory display falls back to existing R-xxx codes for invalid numbers. No production data was changed. Read-only execution of the corrected helpers against current records for 2026-11-01 yields 24 available / 1 occupied; Deluxe availability 4 and all other types 5. Regression coverage reproduces the 25-room collision. 33 tests passed, 15 emulator cases skipped; TypeScript and production build passed. Browser refresh remains to be verified.
