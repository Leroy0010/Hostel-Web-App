# Leroy Hostels — Backend Test Suite (Batch 1)

> **Update:** you've now run this once — see section 6 below.
> **85 of 87 tests passed on the first try.** The 2 failures are fixed in
> this delivery (one pre-existing test unrelated to this batch, one real
> bug in my own test fixture). Re-run `mvn test` to confirm.

## ⚠️ Read this first: these tests were unverified when first written

Unlike the frontend session, **I could not execute `mvn test` in this
environment.** My sandbox's network access is restricted to a small
allow-list of domains (npm, PyPI, GitHub, Anthropic) and does not include
Maven Central, so `mvn` cannot resolve dependencies or compile here at all.

To compensate, I read every relevant source file (`BookingService`,
`WaitlistService`, `BookingExpiredSweeper`, their repositories, DTOs,
exceptions, and entity models) line-by-line before writing each test, to
match method signatures, field names, exception types/messages, and
constructor parameter order exactly. But I have **not compiled or run**
any of this, so please treat it the way you would a colleague's
unreviewed PR: run it, and paste back anything that fails — the same
loop we used for the frontend batches.

```bash
cd backend
mvn test
```

## 1. What changed

- **`pom.xml`** — added `spring-boot-starter-test` (test scope). The
  project already had several of Spring Boot 4's newer modular
  `*-test` starters (`spring-boot-starter-webmvc-test`,
  `spring-boot-starter-security-test`, etc.) but not the core one that
  brings in JUnit 5, Mockito, and AssertJ — which is what these unit
  tests need.
- **`src/test/java/.../testsupport/TestFixtures.java`** — shared
  factory methods (`student()`, `manager()`, `hostel()`, `room()`,
  `booking()`) for building minimally-valid entities in tests, so each
  test method stays focused on behavior instead of object wiring.
- Three new test classes (below).

## 2. Why these three files first

Per the project's own risk assessment (from prior sessions), these are
the three areas where a subtle bug has the widest blast radius:

| File                    | Why it's high-risk                                                                                                                                                                                                                                                          |
|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `BookingService`        | The entire booking state machine, period-scoped capacity checks, and semester-linearity rules live here. A bug lets two students double-book a bed, or silently skips a payment deadline.                                                                                   |
| `WaitlistService`       | `promoteNextInLine`'s four ordered guards plus its skip-and-recurse behavior is the most complex control flow in the codebase — exactly the kind of logic that's easy to get subtly wrong (e.g., stopping at the first ineligible candidate instead of draining the queue). |
| `BookingExpiredSweeper` | Runs unattended on a schedule. If one bad booking in a batch throws, does the rest of the batch still get processed? This can only be verified by testing the sweeper's own failure-isolation loop, not by testing `BookingService` alone.                                  |

All three are pure Mockito unit tests — no Spring context, no database.
This is deliberate: all three services use constructor injection
(`@RequiredArgsConstructor`), so they're natural units to test in
isolation, and skipping the Spring context keeps the suite fast and
avoids needing a running PostGIS instance for this first batch.

## 3. `BookingServiceTest.java` — what's covered

Organized with `@Nested` classes, one per public method:

- **`createBooking`** — happy path (persists PENDING, notifies manager);
  tolerates a hostel with no manager; malformed/non-consecutive/out-of-window
  academic year; SECOND semester without FIRST occupancy (and the
  positive case); FULL semester self-conflict; missing room; blocked
  room (`UNDER_MAINTENANCE`/`RESERVED`); duplicate active booking; room
  at capacity.
- **`cancelBooking`** — wrong-student guard; invalid source status
  (parametrized over every non-cancellable status); **PENDING cancel
  does NOT promote the waitlist** vs. **APPROVED cancel DOES** — this
  distinction (no slot was ever locked vs. a locked slot freed) is the
  crux of the waitlist-triggering contract and gets its own explicit
  pair of tests.
- **`submitPayment`** — wrong student; not-APPROVED; deadline already
  elapsed; happy path records the ref and notifies the manager.
- **`actionBooking`** — non-PENDING guard (parametrized); approve sets
  the payment deadline from the grace period (and defaults to 48h);
  **the race-safety re-check after acquiring the room lock** (approval
  rejected if a concurrent approval filled the last bed first); the
  bulk-auto-reject-stale-PENDING behavior fires only when approval fills
  the *last* bed, not before; rejecting without a reason throws; reject
  trims the stored reason but notifies with the raw one (matches source
  behavior exactly); reject **never** touches room capacity or the
  waitlist.
- **`checkIn`** — not-APPROVED guard; missing/blank payment ref guard;
  increments *physical* occupancy (distinct from period-capacity);
  sends the "other active bookings" reminder only when other bookings
  actually exist, and excludes the just-checked-in booking from that
  count; room-disappeared-under-lock edge case.
- **`checkOut`** — not-CHECKED_IN guard; decrements occupancy, flips
  status, and promotes the waitlist; occupancy never goes negative even
  if state was already inconsistent.
- **`expireApprovedBooking` / `expireWaitlistDraft`** (sweeper-invoked) —
  no-op when the booking has vanished or already been actioned by a
  human in the meantime (idempotency under race with the sweeper);
  happy path expires and promotes the waitlist / records the reason.
- **`getBookingById`** — owner can view; non-owner cannot; manager/admin
  can view anyone's.

## 4. `WaitlistServiceTest.java` — what's covered

- **`joinWaitlist`** — rejects joining when beds are still directly
  bookable (the core "don't queue if you can just book" invariant);
  duplicate-join guard; correct next-position assignment; missing
  student.
- **`leaveWaitlist`** / **`managerRemoveEntry`** — not-found guards;
  delete + position-compaction verified together (compaction must
  happen in the same call, not as an afterthought).
- **`promoteNextInLine`** — each guard isolated:
  - Guard 1 (room `UNDER_MAINTENANCE`/`RESERVED`) skips the *entire*
    promotion with zero side effects.
  - Guard 2 (SECOND semester without FIRST occupancy) likewise skips
    entirely, and a dedicated test confirms this guard is never even
    consulted for FIRST/FULL vacancies.
  - Guard 3 (candidate already has an active booking for this exact
    room+period) and Guard 4 (FULL-semester self-conflict) each skip
    *only that candidate* and recurse — tested by stubbing
    `findNextInLine` to return an ineligible candidate first, then an
    eligible one, and asserting the ineligible one is deleted +
    compacted while the eligible one is the one actually promoted.
  - Empty queue is a silent no-op.
  - Happy path: asserts the created draft's exact shape
    (`isWaitlistDraft=true`, `status=PENDING`, correct student/room,
    `pendingExpiresAt` in the future), both notifications, and the
    entry's removal + compaction.
  - Tolerates a hostel with no assigned manager.
- **`getWaitlistPeriodsDropdown`** — sanity check that repository
  projections map to the DTO correctly.

**One easy-to-miss setup detail if you extend this file:**
`draftExpiryHours` is populated via `@Value` in production, which means
it is **not** part of `WaitlistService`'s constructor
(`@RequiredArgsConstructor` only picks up `final` fields). A plain
`new WaitlistService(...)` in a unit test leaves it at `0`. The test
class sets it explicitly via `ReflectionTestUtils.setField(...)` in
`@BeforeEach` — without that, the "`pendingExpiresAt` is in the future"
assertions would be flaky (they'd compute a deadline of "now `+ 0`
hours", which is already in the past by the time the assertion runs).

## 5. `BookingExpiredSweeperTest.java` — what's covered

- Both sweeps are genuine no-ops when nothing is expired.
- Every booking/draft found is individually passed to
  `BookingService.expireApprovedBooking` / `.expireWaitlistDraft`.
- **Failure isolation**: one booking's mutation throwing does not
  prevent the sibling bookings in the same batch from still being
  processed — this is the sweeper's entire reason for existing as a
  separate class rather than inline logic in `BookingService`, so it
  gets direct coverage rather than being assumed.
- Both sweeps run on every `sweep()` invocation regardless of the
  other's results.
- The query timestamp passed to the repository is genuinely "now" at
  call time (captured and bounded rather than asserted exactly, to
  avoid clock-precision flakiness).

## 6. Batch 1 results — first real `mvn test` run

You ran it. Here's what happened: **85 of 87 tests passed on the first try**
— every `BookingServiceTest` and `BookingExpiredSweeperTest` case, plus 9 of
10 `WaitlistServiceTest` cases. Two failures, both now fixed:

### 1. `HostelBackendApplicationTests.contextLoads` — pre-existing, not from this batch

This test tries to boot the **full** Spring context, which means Liquibase
tries to connect to a real PostgreSQL+PostGIS instance
(`hibernate.ddl-auto=validate` requires the schema to already exist). That
database isn't available in CI/sandbox environments, so the connection
fails with `UnknownHostException: postgres`.

**Fix applied:** excluded the persistence-layer autoconfiguration
(`DataSourceAutoConfiguration`, `HibernateJpaAutoConfiguration`,
`LiquibaseAutoConfiguration`) from just this test via
`@SpringBootTest(properties = {"spring.autoconfigure.exclude=..."})`. This
keeps the test doing what a context-loads smoke test is actually for —
verifying bean wiring, security config, MVC setup — without silently
turning it into a database integration test that only works on machines
with Postgres running locally. If you want an actual database-backed
context test later, that should be a separate Testcontainers-backed test,
not this one.

### 2. `WaitlistServiceTest.guard3_skipsDuplicateCandidateAndRecurses` — a real bug in my test fixture

```
Wanted 1 time:
-> decrementPositionsAfter(hostelId, SINGLE, "2026/2027", "FIRST", 1)
But was 2 times
```

This was **my mistake, not a source bug**: I gave both the ineligible and
eligible waitlist entries `position = 1` in the test. Since
`skipCandidateAndRecurse` calls `decrementPositionsAfter(..., entry's own
position)` once per entry removed, and both entries in my fixture reported
position 1, the two (correct, distinct) calls looked identical to
Mockito's verification — hence "wanted 1 time, was 2".

**Fix applied:** gave the eligible candidate `position = 2` (reflecting
that it was genuinely second in the queue before the ineligible one
ahead of it got removed), in both `guard3` and the identically-structured
`guard4` test. This is purely a test-fixture correction — no production
code or test assertions changed, and the two `decrementPositionsAfter`
calls are now individually verifiable.

**Net takeaway:** the business logic in `BookingService`, `WaitlistService`,
and `BookingExpiredSweeper` behaved exactly as read from source on the
first real run. That's a good sign for both the source code and how
closely the tests were built against it.

## 7. Suggested next batch

Once you've run this batch and reported back any failures, reasonable
next steps, roughly in priority order:

- **RBAC / security tests** — a `@WebMvcTest` or full `@SpringBootTest`
  slice verifying the JWT filter chain and endpoint authorization rules
  (mirrors what `ProtectedRoute.test.tsx` covers on the frontend).
- **Controller-level `MockMvc` tests** for `BookingController` and
  `WaitlistController` — request validation, status codes, and
  `GlobalExceptionHandler`'s mapping of each custom exception to the
  right HTTP status.
- **Repository/integration tests with Testcontainers** — the partial
  unique indexes, PostGIS geography columns, and the pessimistic-lock
  queries (`findByIdForUpdate`) can only be verified against a real
  PostgreSQL+PostGIS instance, not mocked. This would need a
  `docker.io`/`ghcr.io`-hosted Testcontainers image, which may hit the
  same network restriction I ran into here — worth confirming your own
  CI environment has that access before investing in this direction.
- **`RoomService`** unit tests (`recalculateRoomStatus`'s status-flip
  rules, amenity replace-all semantics) — smaller in scope but still
  business-rule-bearing.

Let me know how the `mvn test` run goes.
