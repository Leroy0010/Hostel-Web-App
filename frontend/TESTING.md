# Leroy Hostels — Frontend Test Suite

This delivers a Vitest + React Testing Library test setup plus **132 tests
across 16 files** for the highest-value logic in the frontend: pure utils,
URL-synced filter hooks, the auth store, the axios interceptor (token
refresh pipeline), route guarding, and the booking/waitlist forms that
carry real business rules.

## 1. Install the new dependencies

From `frontend/`:

```bash
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  @vitest/coverage-v8 axios-mock-adapter
```

(These were added to `devDependencies` in the provided `package.json` —
`npm install` alone will also work once you merge that file in.)

## 2. New/changed files

```
vitest.config.ts                                          # new
package.json                                               # added test scripts + devDependencies
src/test/setup.ts                                           # jsdom polyfills, jest-dom matchers
src/test/test-utils.tsx                                     # renderWithProviders (Router + React Query)

src/hooks/useDebounce.test.ts
src/lib/axios.test.ts

src/components/routing/ProtectedRoute.test.tsx

src/features/auth/store/useAuthStore.test.ts

src/features/booking/utils/booking.utils.test.ts
src/features/booking/hooks/useBookingFilters.test.tsx
src/features/booking/components/BookingCard.test.tsx
src/features/booking/components/BookingStatusBadge.test.tsx
src/features/booking/components/PaymentCountdown.test.tsx
src/features/booking/components/ActionBookingForm.test.tsx

src/features/waitlist/utils/waitlist.utils.test.ts
src/features/waitlist/types/waitlist.types.test.ts
src/features/waitlist/components/WaitlistPositionBadge.test.tsx
src/features/waitlist/components/JoinWaitlistDialog.test.tsx

src/features/room/utils/room.utils.test.ts
src/features/room/hooks/useRoomFilters.test.tsx
```

Copy these into the matching paths in your project (they line up 1:1 with
your existing `src/` structure — nothing outside `src/` and the two root
config files was touched).

## 3. Run the tests

```bash
npm test              # single run (CI mode)
npm run test:watch    # watch mode while developing
npm run test:ui       # Vitest's browser UI
npm run test:coverage # coverage report in ./coverage (open coverage/index.html)
```

## 4. What's covered and why

| Area | What's tested | Why it mattered |
|---|---|---|
| `booking.utils.ts` / `waitlist.utils.ts` / `room.utils.ts` | Every label/color/format helper, edge cases (null dates, ordinal suffixes, academic-year rollover at the September boundary) | Pure functions with real branching logic that other components silently depend on |
| `useDebounce`, `useBookingFilters`, `useRoomFilters` | Timer behavior, URL param read/write, page-reset-on-filter-change, `ALL`/`0` sentinel stripping | These back every list/search page; a regression here breaks pagination and deep-linking silently |
| `useAuthStore` | Every action (`setAuth`, `setUser`, `updateAccessToken`, `clearAuth`, flags) | RBAC and session state for the whole app flow through this store |
| `axios.ts` interceptor | Envelope unwrapping, auth header injection, the 401 → silent-refresh → retry pipeline, refresh failure → forced logout, login-endpoint excluded from the refresh loop | This is the single riskiest piece of cross-cutting code — a subtle bug here logs every user out or infinite-loops requests |
| `ProtectedRoute` | All four render phases (bootstrapping, in-flight request, unauthenticated, wrong role, allowed) | Direct RBAC enforcement; a bug here is a security bug |
| `BookingCard`, `BookingStatusBadge`, `PaymentCountdown` | Rendering, navigation, conditional countdown display, live countdown ticking/expiry, unmount cleanup | Time-based UI is easy to get subtly wrong (off-by-one ticks, leaked intervals) |
| `ActionBookingForm` | Approve/reject toggle, conditional field swap, default vs custom grace period, required-reason validation, exact submit payload shape, cancel wiring | This is the manager approval workflow at the heart of the CSC 406 booking lifecycle — the highest-stakes form in the app |
| `JoinWaitlistDialog` + `joinWaitlistSchema` | Pre-filled room type, required-period validation, submit payload assembly (splitting the combined period key back into `academicYear`/`semester`), cancel/reset | Core to the waitlist feature described in your project memory |

## 5. Batch 2 (this update)

Adds **4 new test files, 28 new tests**, covering the components you asked
for next:

| File | Covers |
|---|---|
| `CreateBookingForm.test.tsx` | Period-combobox wiring into `academicYear`/`semester`, required-period validation, submit payload, `onSuccess(bookingId)`, server-error field mapping, conditional Cancel button |
| `SubmitPaymentForm.test.tsx` | Both-fields-required validation, "amount must be > 0" rule, exact submit payload, `onSuccess`, server-error field mapping, conditional Cancel button |
| `WaitlistCard.test.tsx` | Rendering, notified banner + status, "View hostel" navigation, leave-waitlist confirmation dialog (open → confirm → mutation call with correct payload) |
| `ManagerWaitlistTable.test.tsx` | Loading skeleton, error empty-state, empty empty-state, row rendering, notified indicator, room-type filter → page reset, remove-entry confirmation dialog |

**Infra fix bundled in this batch:** `src/test/setup.ts` now polyfills the
Pointer Capture API (`hasPointerCapture`/`setPointerCapture`/
`releasePointerCapture`), which jsdom doesn't implement. Radix UI's
`Select` primitive calls `hasPointerCapture` on trigger click, so any test
that opens a real (non-mocked) Radix `<Select>` — like the room-type
filter in `ManagerWaitlistTable` — would throw
`TypeError: target.hasPointerCapture is not a function` without it. This
also means you can now drive real Radix `Select` dropdowns directly in
future tests instead of always mocking them.

Also re-added `src/lib/axios.test.ts`, which didn't make it into your last
copy-over (your `axios.ts` is byte-identical to what it was tested
against, so this is a drop-in — no source changes needed).

### The `JoinWaitlistDialog` fix, confirmed

Your fix (`errors.selectedPeriodKey` now driving the period field's
`FieldError`, replacing the old `errors.academicYear` reference) is
correct and the existing test suite still passes against it unchanged.
One nuance worth knowing: `selectedPeriodKey` has no `defaultValue` in
`useForm`, so on first submit its value is `undefined`, not `""`. Zod's
`.string().min(1, "Please select a period")` fails the *type* check
before it ever reaches `.min()`, so the message a user actually sees today
is still the generic `"Invalid input: expected string, received
undefined"` rather than your friendly copy. If you want the friendly
message to show up, add `selectedPeriodKey: undefined` → `''` in
`defaultValues` (i.e. default it to an empty string instead of leaving it
unset). Not blocking — flagging since it's a one-line fix and the tests
already pin the current (generic-message) behavior, so they'll tell you
immediately if that changes.

**Same pattern, different file:** `CreateBookingForm.tsx` has the same
`selectedPeriodKey`-controlled-but-`errors.academicYear`-displayed wiring
that `JoinWaitlistDialog` used to have. It wasn't in scope for this batch,
but `CreateBookingForm.test.tsx`'s "blocks submission" test asserts on
`getByRole('alert')` rather than specific text for this exact reason — so
it won't need touching if/when you apply the same fix there.

## 6. Notes on test design choices

- **`renderWithProviders`** wraps components in `QueryClientProvider` +
  `MemoryRouter` so hooks like `useQuery`/`useNavigate` work without
  per-test boilerplate. Use it for anything under `src/features/**` or
  `src/components/**`.
- **Radix-based primitives** (the custom `Combobox`) are mocked to a plain
  `<select>` in `JoinWaitlistDialog.test.tsx`. This is deliberate: the
  Combobox itself isn't the unit under test, and portal/popper-based
  widgets are expensive and flaky to drive through jsdom. The mock
  preserves the exact `onValueChange(value: string)` contract so the
  dialog's own wiring logic is still fully exercised.
- **Framer Motion animations are not disabled** — a couple of tests
  (`ActionBookingForm`) `await`/`waitFor` around `AnimatePresence`
  enter/exit transitions rather than mocking `framer-motion` outright, so
  the tests also catch cases where a field never becomes reachable/
  removable due to animation state, matching real user experience.
- Time-based components (`PaymentCountdown`, debounce, academic-year
  rollover) use `vi.useFakeTimers()` / `vi.setSystemTime()` rather than
  real waits, so the suite stays fast and deterministic.

## 7. Batch 3 (this update) — Room feature

Adds **5 new test files, 26 new tests**:

| File | Covers |
|---|---|
| `AvailablePeriodsBadge.test.tsx` | Compact vs. full mode, empty state, singular vs. plural period count, unknown-semester fallback formatting |
| `DetailedRoomCard.test.tsx` | Rendering (room #, type, floor, capacity, price), navigation, broken-image fallback |
| `RoomPreviewCard.test.tsx` | Rendering, empty-availability state, navigation |
| `AmenityManager.test.tsx` | Inline delete (no confirm), collapsed-by-default replace form, pre-population from existing amenities, add/remove rows via `useFieldArray`, required-label validation, exact submit payload, form collapse on success |

**Infra fix bundled in this batch:** `src/test/setup.ts` now stubs
`window.scrollTo` (also missing in jsdom), which some interactions —
e.g. focus management after removing a `useFieldArray` row in
`AmenityManager` — call incidentally and which otherwise just spams
"Not implemented" warnings in the test output.

### Design notes specific to this batch

- `AmenityManager`'s `ImageUpload` sub-component (used for optional amenity
  icons) was **not** mocked — none of the written tests need to drive a
  file upload, so it's exercised as-is with a stub `onUploadImage`. If you
  add icon-upload assertions later, treat `ImageUpload` the same way the
  Combobox is treated elsewhere in this suite (see the design notes in
  section 6): mock it only if driving the real file input becomes brittle.
- The replace-form tests intentionally query on the visible row inputs
  (`getAllByPlaceholderText`) rather than by index/id, since row identity
  in a `useFieldArray` list is exactly what's being tested (pre-population,
  add, remove).

## 9. Batch 4 (this update) — Complaint feature, room forms, dashboard dispatch, MSW integration

This closes out every item from the previous "suggested next batch." Adds
**14 new test files, 99 new tests** (285 total across 38 files).

### Complaint feature (previously untouched — now fully covered)

| File | Covers |
|---|---|
| `complaint.utils.test.ts` | Status/category labels & colors, terminal-status check, relative date formatting, net-score color tiers |
| `useComplaintFilters.test.tsx` | Same URL-sync pattern as `useBookingFilters` — status/page read-write, `ALL`/`0` sentinel stripping |
| `ComplaintStatusBadge.test.tsx`, `ComplaintCategoryBadge.test.tsx` | Rendering, active-vs-terminal pulsing indicator, icon-only mode |
| `ComplaintCard.test.tsx` | Rendering, signed net-score display, conditional attachment count, navigation |
| `ReactionBar.test.tsx` | Upvote/downvote wiring, pressed state per `currentUserVote`, disabled states (mocked hook — UI behavior only) |
| `complaint.hooks.test.tsx` | **The real `useReactToComplaint` hook** against a live `QueryClient` + `axios-mock-adapter`: optimistic increment, toggle-off, downvote→upvote switch, and rollback-on-error — this is the "hook-level test with real cache" pattern the project memory called for, mirrored from how `ReactionBar`'s optimistic updates were originally scoped |
| `UpdateComplaintStatusForm.test.tsx` | Pre-population, real Radix `Select` interaction, submit, server-error mapping, no-details fallback message |
| `AttachmentManager.test.tsx` | `canManage` gating, image-vs-file rendering split, add/remove flow, URL validation |
| `CreateComplaintForm.test.tsx` | Dependent hostel→room comboboxes (room selector disabled until a hostel is picked), pre-filled-room mode hides the room selector entirely, category select, payload assembly, server-error mapping |

### Room forms (the two pieces left from the room feature)

| File | Covers |
|---|---|
| `CreateRoomForm.test.tsx` | Required-image validation driven through the **real** `ImageUpload` file input (not mocked — `userEvent.upload` against the actual hidden `<input type="file">`), room-type select, amenities `useFieldArray`, full submit payload, server-error mapping |
| `UpdateRoomForm.test.tsx` | Pre-population from an existing `RoomDto`, **patch semantics** (empty payload when nothing changed; only the touched field(s) included otherwise), the independent status-update sub-form, form reset when the `room` prop changes |

### Dashboard discriminated-union dispatch

| File | Covers |
|---|---|
| `DashboardPage.test.tsx` | Unauthenticated → `Home`; ADMIN/MANAGER/STUDENT → the matching dashboard component (the other two never render); error state + retry; background-refetch dimming. The three role components themselves are mocked here — this file only verifies dispatch, not their internals. |

### MSW-backed booking lifecycle integration test

`BookingDetailPage.lifecycle.test.tsx` + `bookingLifecycle.msw-handlers.ts`

This is a genuine integration test — no hooks or API functions are mocked.
MSW intercepts the real HTTP calls that `apiClient` makes, backed by a
single mutable in-memory `BookingDto`. One test walks that one booking
through **PENDING → APPROVED → payment submitted → CHECKED_IN**, switching
the authenticated role between student and manager via the live
`useAuthStore` (not remounting the page — the store update alone
re-renders it, same as production). A second test covers the rejection
branch instead. Because nothing is mocked below the network layer, this
test would have caught the `.env`-overridden `VITE_API_BASE_URL` mismatch
it initially tripped on — see the note below.

**Two non-obvious things worth knowing if you extend this test:**

1. **`apiClient.defaults.baseURL` must drive the MSW handler URLs, not a
   hardcoded `http://localhost:8080/api`.** This project's `.env` sets
   `VITE_API_BASE_URL` to a LAN IP, so a hardcoded base URL in the handler
   file silently never matches and every request falls through as
   "unhandled" (which manifests as a confusing "Booking not found" empty
   state, not an obvious network error). The handler factory reads
   `apiClient.defaults.baseURL` for exactly this reason.
2. **Several UI transitions are wrapped in `AnimatePresence`** (the action
   panel, the reject-reason field). Assertions on their disappearance need
   `waitFor`, not a synchronous `queryByRole(...).not.toBeInTheDocument()`,
   or they'll intermittently see the mid-exit-animation DOM. Assertions on
   their *appearance* likewise need `findBy*` rather than `getBy*`.

## 10. What's left, if you want to keep going

At this point every feature module (auth, booking, waitlist, room,
complaint, dashboard) has both unit coverage and at least one integration-
style test. Remaining gaps, roughly in order of value:

- Review feature (`CreateReviewForm`, star rating) — small, only referenced
  so far as a dependency of `BookingDetailPage`
- Hostel feature (`Hostels`/`HostelsDetailsPage`, hostel CRUD forms)
- Notifications feature, if one exists beyond what's already covered
- A second MSW integration test for the waitlist promotion flow (join →
  manager removes a bed → next-in-line notified), mirroring the pattern
  established here
- Raising `vitest run --coverage` and backfilling any files coverage
  reveals are still untouched

Otherwise — frontend testing is in a solid, comprehensive state. Ready to
move to the backend whenever you upload it.
