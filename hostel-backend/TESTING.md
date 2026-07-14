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

| File | Why it's high-risk |
|---|---|
| `BookingService` | The entire booking state machine, period-scoped capacity checks, and semester-linearity rules live here. A bug lets two students double-book a bed, or silently skips a payment deadline. |
| `WaitlistService` | `promoteNextInLine`'s four ordered guards plus its skip-and-recurse behavior is the most complex control flow in the codebase — exactly the kind of logic that's easy to get subtly wrong (e.g., stopping at the first ineligible candidate instead of draining the queue). |
| `BookingExpiredSweeper` | Runs unattended on a schedule. If one bad booking in a batch throws, does the rest of the batch still get processed? This can only be verified by testing the sweeper's own failure-isolation loop, not by testing `BookingService` alone. |

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

## 7. Batch 2 (this update) — RBAC / JWT security

This is the "RBAC / security tests" item from the batch 1 suggestions.
Adds **4 new test classes, ~25 new tests**, all still pure unit tests
(no Spring context, no database) — same rationale as before: these
classes take their dependencies via plain constructor injection, so
they're natural units to test in isolation.

| File | Covers |
|---|---|
| `JwtTest.java` | The `Jwt` claims wrapper directly, using real `io.jsonwebtoken` claims/keys rather than mocks: expiry check both directions, subject→UUID parsing, role claim parsing, and a full `toString()` → re-parse round trip confirming the re-signed token is byte-for-byte verifiable. |
| `JwtServiceTest.java` | Token generation (correct claims embedded, password hash never leaks into the payload), refresh-token-outlives-access-token, and — the important half — **parse failure handling**: malformed token, wrong signing key, tampered payload, empty string. Uses a real `JwtConfig` POJO rather than mocking it, since the whole point is verifying the sign→parse round trip actually works cryptographically, not just that a mock was called. |
| `JwtAuthenticationFilterTest.java` | **The single filter that populates the `SecurityContextHolder` for every request in the app.** Every short-circuit path gets its own explicit "context stays empty" assertion: no header, wrong scheme, unparseable token, expired token, user deleted since token issue, deactivated account. Then the happy path: correct principal type, correct `ROLE_*` authority, null credentials (password hash never re-exposed), and — a subtle one — confirms the filter does **not** re-hit the database when an `Authentication` is already present in the context from an earlier filter. |
| `JwtConfigTest.java` | Small, on purpose: just confirms `getSecretKey()` derives a deterministic, HMAC-family key from the configured secret string (same secret → same key bytes; different secret → different key bytes) — this matters because horizontally-scaled instances sharing one secret must all derive an identical key. |

### A real behavioral finding, not a bug I introduced this time

While writing the deactivated-account test I initially assumed a `null`
`isActive` would be treated the same as `false` ("fail closed"). It isn't:

```java
// JwtAuthenticationFilter.java
if (Boolean.FALSE.equals(user.getIsActive())) { ... reject ... }
```

`Boolean.FALSE.equals(null)` evaluates to `false` in Java — `.equals()`
against a `null` argument is always `false`, never a `NullPointerException`.
So a `null` `isActive` is **not** rejected here; the request is
authenticated as if the account were active. In practice this is low-risk
today because the entity defaults `isActive` to `true` and a genuine
`null` should only occur via manual DB manipulation — but if that default
ever changes, this guard would fail *open*, not closed. I renamed my test
to `nullIsActiveIsNotRejected` to pin down the actual behavior (with a
comment explaining why) rather than silently asserting what I'd assumed.
If you'd rather this fail closed, the fix is a one-line guard change to
`!Boolean.TRUE.equals(user.getIsActive())` — flagging it, not changing it,
since it wasn't asked for.

## 8. Batch 3 (this update) — Controller `MockMvc` tests

Adds **2 new test classes (~30 tests) plus shared test infrastructure**:
`BookingControllerTest`, `WaitlistControllerTest`, and two reusable
support classes (`MethodSecurityTestConfig`, and `authFor(User)` /
`admin()` added to `TestFixtures`).

### The filter-mocking trap this batch had to design around

The obvious way to test `@PreAuthorize`-secured controllers is to
`@Import` the production `SecurityConfig` and `@MockitoBean` its two
dependencies (`CustomUserDetailsService`, `JwtAuthenticationFilter`). This
does **not** work: `SecurityConfig` wires `jwtAuthenticationFilter` into
the chain via `addFilterBefore(...)`, and a `@MockitoBean`-mocked
`Filter`'s `doFilter(...)` does **nothing** by default — it never calls
`chain.doFilter(...)`, so the mocked filter silently swallows every
single request before it reaches the controller. Every test would just
hang or return an empty response, for a reason that's easy to spend a
long time debugging.

**The fix**, in `MethodSecurityTestConfig` (`src/test/.../testsupport/`):
a minimal test-only `SecurityFilterChain` that mirrors only
`@EnableMethodSecurity` and the same 401/403 exception handling the
production config uses — no JWT filter at all. Authentication is instead
seeded directly via
`SecurityMockMvcRequestPostProcessors.authentication(...)`, wrapping a
real `CustomUserDetails` built from a `TestFixtures` user (`authFor(user)`).
This exercises the **real** `@PreAuthorize` annotations and the **real**
`@AuthenticationPrincipal CustomUserDetails` argument resolution — the
things actually worth testing here — without needing JWT parsing at all
(already covered separately by `JwtAuthenticationFilterTest`).

### `BookingControllerTest.java` — what's covered

Every endpoint gets: the correct `@PreAuthorize` role enforced (403 for
the wrong role), the JSON envelope shape (`success`/`message`/`data`) on
success, and — where relevant — a request-validation case and a
service-exception-to-HTTP-status case:

- `POST /api/bookings` — 401/403/400 (missing `roomId`, malformed
  `academicYear`)/201/409 (`RoomFullyOccupiedException`)
- `DELETE /api/bookings/{id}/cancel` — 200/403 (`HostelAccessDeniedException`)/409 (`InvalidBookingTransitionException`)
- `POST /api/bookings/{id}/payment` — 400 (zero amount, blank reference)/200
- `POST /api/manager/bookings/{id}/action` — 403/200 with the
  approved-vs-rejected message branching/400 (missing decision, grace
  period > 720h)/409/400 (`IllegalArgumentException` from a blank
  rejection reason bubbling up from the service)
- `POST /api/manager/bookings/{id}/checkin` and `.../checkout` — 404
  (`ResourceNotFoundException`)/200/403
- `GET /api/bookings/{id}` — no `@PreAuthorize` on this one by design
  (any authenticated role); asserts the controller computes its
  `privileged` boolean correctly per role (`STUDENT` → `false`,
  `MANAGER` → `true`) via an `ArgumentCaptor`-style exact-args `verify()`

### `WaitlistControllerTest.java` — what's covered

Same pattern across `POST /api/waitlists`, `DELETE /api/waitlists/{hostelId}`,
`GET /api/waitlists/status/{hostelId}`, `GET /api/manager/hostels/{hostelId}/waitlist`,
`DELETE /api/manager/waitlists/{waitlistId}`, and
`GET /api/hostels/{hostelId}/waitlist-periods` (also no `@PreAuthorize` —
open to any authenticated role, matching `getBooking` above).

### Two things this batch's own source cross-check caught

Writing tests directly from the endpoint summary comment at the top of
`WaitlistController.java` would have been wrong twice over:

1. The class-level Javadoc claims `GET /waitlists/{hostelId}/status`, but
   the actual `@GetMapping` is `"/waitlists/status/{hostelId}"` — reversed
   segment order. I built the test against the real annotation, not the
   (stale) summary comment, but it's worth knowing that comment doesn't
   match the code if you're reading it elsewhere.
2. `getWaitlistPeriods` is mapped as `"hostels/{hostelId}/waitlist-periods"`
   (no leading `/`) relative to the class's `@RequestMapping("/api")`. I
   initially wrote the test hitting `/hostels/...` (missing the `/api`
   prefix) and caught it only by re-deriving the full path from the
   annotations directly rather than trusting my own first draft — the
   corrected version hits `/api/hostels/{hostelId}/waitlist-periods`.

Neither is a source bug — both are documentation-drift / my-own-first-draft
issues, now corrected in the delivered test file. Flagging the stale
Javadoc comment in case you want to tidy it up, since the next person
reading it will hit the same wrong assumption.

## 9. Batches 3 fix rounds — summary

Two rounds of real `mvn test` output came back after batch 3, and every
failure was fixed:

- **Nested-stubbing bug** in `JwtAuthenticationFilterTest`: passing a
  stub-creating helper method (`validJwtFor(userId)`) as an inline
  argument to another `when(...).thenReturn(...)` — Java evaluates that
  argument before the outer stub completes, so Mockito saw a nested stub
  mid-flight. Fixed by extracting to a local variable first.
- **`JwtService.parseToken("")`** throws `IllegalArgumentException`
  instead of returning `null` — jjwt's `Assert.hasText()` rejects empty
  input before real parsing begins, and that's not a `JwtException`, so
  the method's own `catch` doesn't catch it. Test corrected to pin the
  real behavior; one-line source fix suggested, not applied.
- **`contextLoads`**: my original exclusion-based "fix" was wrong —
  excluding `DataSourceAutoConfiguration` also breaks Spring Data JPA
  repository bean creation entirely, which `SecurityConfig` needs
  transitively. Reverted to a plain `@SpringBootTest` that honestly
  requires a reachable database, with that requirement documented in the
  class Javadoc.
- **All `BookingControllerTest`/`WaitlistControllerTest` failures**: the
  real `JwtAuthenticationFilter` is `@Component`-annotated, so
  `@WebMvcTest` auto-detects it as a `Filter` bean regardless of which
  security config gets `@Import`-ed — my original design assumption was
  wrong. Fixed by adding unstubbed `@MockitoBean`s for its two
  constructor dependencies.
- **`ObjectMapper` not found** in the `@WebMvcTest` slice: this project's
  modular `*-test` starters don't reliably expose one for `@Autowired`.
  Fixed by constructing one locally per test class
  (`new ObjectMapper().findAndRegisterModules()`) instead of depending on
  Spring to inject it.

152/153 passed after these — the 1 remaining failure is the documented
`contextLoads` database requirement, not a bug.

## 10. Batch 4 (this update) — RoomService, AuthService, and controller tests

Adds **4 new test classes (~75 tests)** plus one addition to the shared
`MethodSecurityTestConfig`.

### `RoomServiceTest.java`

CRUD guard rails (duplicate room number, capacity-vs-occupancy), patch
semantics, amenity management, and — the most load-bearing part —
`recalculateRoomStatus`'s status-flip rules: flips to `FULLY_OCCUPIED` at
capacity, flips back to `AVAILABLE` only from `FULLY_OCCUPIED`, and never
overrides `UNDER_MAINTENANCE`/`RESERVED` regardless of occupancy.

**A real finding, pinned down rather than silently worked around:**
`RoomService`'s class Javadoc states "ADMIN can create in any hostel," and
`RoomController`'s `@PreAuthorize` does allow ADMIN through. But
`createRoom` (and every other write method) unconditionally calls
`hostelService.assertManagerOwns(hostelId, actorId)`, and that method has
**no ADMIN bypass** — it only checks
`hostel.getManager().getId().equals(actorId)`. An admin's id will
essentially never equal a hostel's assigned manager's id, so in practice
an ADMIN hitting this endpoint for a hostel they don't personally manage
is rejected exactly like an unrelated manager would be — the opposite of
the documented intent. `RoomServiceTest.adminIsRejectedByAssertManagerOwns`
pins this down. This needs a product decision (should `assertManagerOwns`
bypass for ADMIN, or should the Javadoc/PreAuthorize be corrected to match
current behavior?) — flagging rather than guessing which side is "right."

### `AuthServiceTest.java`

Does *not* cover login — `AuthService` has no login method; that lives
elsewhere. Covers what's actually here: the email-verification lifecycle
(deactivate-on-issue, single-use consumption, expired-token cleanup,
anti-enumeration silence for unknown/already-active accounts), authenticated
password change, the forgot-password flow (including the `type=activation`
vs plain-reset branch controlling whether the account gets activated), the
crypto-token engine (`generateAndSaveToken`: clears prior tokens of the
same type first, 64-char hex output, only the SHA-256 hash is ever
persisted), and — the class's own Javadoc calls this out as critical —
**cookie attribute consistency between `setAuthCookie` and
`clearAuthCookie`**. A mismatch there previously meant logout never
actually cleared the cookie in production; this is now verified directly
rather than trusted from the comment.

### `RoomControllerTest.java` / `HostelControllerTest.java`

Same `MockMvc` pattern as batch 3. One infrastructure fix needed along the
way: `MethodSecurityTestConfig` now mirrors production's `permitAll` GET
rules for `/api/hostels/**` and `/api/rooms/**` (previously it only had
`.anyRequest().authenticated()`), since these two controllers' public read
endpoints would otherwise falsely appear to require authentication in
tests when they don't in production.

**A second real finding, also just pinned down:** `RoomService.deleteRoom`'s
Javadoc says *"ADMIN only (managers cannot delete rooms — they deactivate
them)."* `RoomController`'s actual annotation on that endpoint is
`@PreAuthorize("hasRole('MANAGER')")` — no ADMIN in the role list at all.
The real, enforced behavior is the exact opposite of the comment: MANAGER
can delete rooms through this endpoint, ADMIN cannot.
`RoomControllerTest.rejectsAdminContraryToServiceJavadoc` pins down the
actual (enforced) behavior. Combined with the `assertManagerOwns` finding
above, it's worth a deliberate pass over ADMIN's actual permissions across
the room module — the Javadoc comments and the enforced `@PreAuthorize`
rules disagree in at least two places now.

## 11. A blocking finding for Testcontainers work — not attempted this round

While reading the Liquibase changelog to scope a repository-level
Testcontainers test, I found that **`db.changelog-master.yaml` only
includes two migration files**:

```yaml
databaseChangeLog:
  - include:
      file: db/changelog/db.changelog-001-initial-schema.yaml
  - include:
      file: db/changelog/db.changelog-002-index.yaml
```

But `src/main/resources/db/changelog/` contains **seven more**:
`003-alter-bookings-table`, `004-auth-tokens-schema`,
`005-drop-unique-booking-constraint`, `006-booking-service-v2-migration`,
`007-alter-waitlist-table`, `008-alter-landmarks-table`, and
`009-refresh-tokens-schema` — none of them referenced by `include:`
anywhere. `db.changelog-master.yaml`'s own file modification timestamp
matches files 007–009 exactly, which strongly suggests whoever added
those three (and probably 003–006 before them) simply forgot to add the
corresponding `include:` lines when wiring them in — this has the shape of
an accidental omission, not an intentional decision.

**Why this blocks Testcontainers work specifically:** a fresh
Testcontainers-provisioned Postgres would only get schema 001+002 applied.
Given `hibernate.ddl-auto=validate`, Hibernate would almost certainly fail
context startup against that schema — entities like `AuthToken`/
`RefreshToken` (schema-defined in 004/009) and any columns added in
003/006/007/008 wouldn't exist. Any repository test I wrote right now
would very likely fail at container-startup time for this reason, not for
anything related to the actual query/index logic I'd be trying to test —
which would be confusing, low-value output disguised as test failures.

**I did not touch `db.changelog-master.yaml`.** Whether your actual
running database already has 003–009 applied (e.g., they were in an
earlier version of master.yaml and got silently dropped, or were applied
manually) is something only you know. If those changes are already live
in your DB via some other path, blindly adding the missing `include:`
lines could be a safe no-op (Liquibase tracks applied changesets by ID and
won't re-run them) — or it could not be, if there's drift between what's
on disk in these files and what's actually in the DB. Worth a deliberate
look before deciding.

Once this is confirmed and (if needed) resolved, I'm glad to add the
Testcontainers repository tests — they're the natural next step for
verifying the partial unique indexes, PostGIS geography columns, and
pessimistic-lock queries (`findByIdForUpdate`) that literally cannot be
verified without a real Postgres+PostGIS instance.

## 12. Suggested next batch

- Complaint/Review module unit + controller tests, mirroring this
  session's pattern, if those haven't been covered elsewhere.

Let me know how the `mvn test` run goes.
