# HostelLife+

A full-stack hostel/accommodation booking and management platform built for the University of Cape Coast (UCC), developed as the practical component of **CSC 499 - Final Year Project Work**.

The system digitizes the entire hostel accommodation lifecycle — discovery, booking, approval, waitlisting, complaints, reviews, and administration — for three roles: **Student**, **Manager**, and **Admin**.

- **Frontend:** [hostellifeplus.com](https://hostellifeplus.com)
- **Backend API:** [api.hostellifeplus.com](https://api.hostellifeplus.com)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Core Features](#core-features)
- [Architecture Highlights](#architecture-highlights)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Database & Migrations](#database--migrations)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Known Issues / Roadmap](#known-issues--roadmap)
- [Academic Context](#academic-context)
- [License](#license)

---

## Overview

HostelLife+ replaces manual, fragmented hostel-allocation processes with a single digital platform. Students can browse hostels and rooms, book beds, join waitlists when rooms are full, raise complaints, and leave reviews. Managers oversee their hostels, rooms, and bookings. Admins manage the platform globally — hostels, users, and analytics.

The project consists of two independently deployable applications:

| App | Description | Path |
| --- | --- | --- |
| **Backend** | Spring Boot 4 REST + WebSocket API | [`/hostel-backend`](./hostel-backend) |
| **Frontend** | React 19 + TypeScript single-page application | [`/frontend`](./frontend) |

---

## Tech Stack

### Backend

| Domain | Technology |
| --- | --- |
| Language / Runtime | Java 25 |
| Framework | Spring Boot 4.0.6 (modular starters: Web MVC, Security, Validation, WebSocket, OAuth2 Client, Thymeleaf, Actuator) |
| Database | PostgreSQL + PostGIS (spatial data for the campus map) |
| ORM | Spring Data JPA / Hibernate (`hibernate-spatial` for geometry types) |
| Migrations | Liquibase |
| Auth | Spring Security + JWT (`jjwt`), Google OAuth2 login |
| Object Mapping | MapStruct |
| Real-time | Spring WebSocket (STOMP) for in-app events, Web Push (VAPID via `martijndwars/web-push`) for offline/browser push |
| Media Storage | Cloudinary |
| Email | Spring Mail (SMTP) |
| API Docs | springdoc-openapi (Swagger UI) |
| Testing | JUnit 5, Mockito, Spring Security Test, MockMvc, Testcontainers |
| Build | Maven (`mvnw`) |

### Frontend

| Domain | Technology |
| --- | --- |
| Framework | React 19 + TypeScript, built with Vite |
| Styling | Tailwind CSS v4, Shadcn UI / Radix UI primitives |
| Server State | TanStack React Query v5 |
| Client State | Zustand |
| Forms & Validation | React Hook Form + Zod v4 |
| Animation | Framer Motion |
| Routing | React Router v7 |
| Realtime | `@stomp/stompjs` (STOMP over WebSocket) |
| Maps | MapLibre GL JS + `react-zoom-pan-pinch` |
| HTTP | Axios (with interceptor-based envelope unwrapping & silent token refresh) |
| Testing | Vitest, React Testing Library, MSW, axios-mock-adapter |
| Tooling | ESLint, Prettier, Husky + lint-staged |

---

## Repository Structure

```text
hostel-web-app/
├── hostel-backend/
│   ├── src/main/java/com/leroy/hostelbackend/
│   │   ├── config/          # Security, JWT, WebSocket, Cloudinary, Jackson config
│   │   ├── module/          # Feature modules (see below)
│   │   └── shared/          # Cross-cutting: exceptions, response envelope, scheduler, validation
│   ├── src/main/resources/
│   │   ├── application.yaml
│   │   └── db/changelog/    # Liquibase changelogs + raw SQL scripts
│   ├── src/test/java/...    # Unit + slice tests, shared TestFixtures
│   ├── docker-compose.yaml  # Postgres + PostGIS, app, pgAdmin
│   ├── Dockerfile.dev / Dockerfile.prod
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   │   ├── app/ (routes/)   # Route tree, layouts, providers
│   │   ├── components/      # Global reusable UI (Shadcn-based)
│   │   ├── features/        # Feature-based modules (see below)
│   │   ├── lib/              # axios instance, query client, utils
│   │   ├── store/            # Zustand stores
│   │   ├── hooks/            # Global hooks
│   │   └── types/            # Global TS types (API envelope, pagination)
│   ├── vite.config.ts / vitest.config.ts
│   └── package.json
│
├── Agent.md      # High-level architecture & technology specification
├── agent2.md     # Frontend architecture & developer guidelines
└── README.md     # This file
```

### Backend modules (`module/`)

`auth` · `user` · `hostel` · `room` · `booking` · `waitlist` · `complaint` · `review` · `preference` · `notification` · `map` · `dashboard` · `analytics` · `infrastructure/cloudinary` · `email`

Each module follows a consistent internal layout: `controller/ dto/ mapper/ model/ repository/ service/` (plus `projection/` and `specification/` where dynamic filtering/spatial queries are needed).

### Frontend feature modules (`src/features/`)

`auth` · `user` · `user-management` · `hostel` · `room` · `booking` · `waitlist` · `complaint` · `review` · `preference` · `notification` · `map` · `dashboard`

Each feature follows: `types → api → hooks (React Query) → components → pages`, per the conventions in [`agent2.md`](./agent2.md).

---

## Core Features

- **Authentication & RBAC** — JWT-based stateless auth (access + rotating refresh tokens via HttpOnly cookies), Google OAuth2 login, and strict role separation across `ADMIN`, `MANAGER`, and `STUDENT`.
- **Hostel & Room Management** — CRUD for hostels and rooms, capacity tracking, amenities, room-type pricing, image uploads via Cloudinary.
- **Booking Engine** — A full booking state machine (create → approve/reject → payment → check-in → completion/cancellation) with period-scoped capacity checks and semester-linearity rules to prevent double-booking.
- **Automated Waitlist** — Students join a waitlist keyed on `(hostel, roomType, academicYear, semester)` when a period is fully locked; when a slot frees up, the system automatically promotes and notifies the next eligible candidate, re-validating room availability and booking rules before promotion.
- **Complaints & Reviews** — Ticketed complaint system scoped to rooms/hostels; reviews restricted to students who have completed a booking and checked in.
- **Real-Time Notifications** — In-app live updates over WebSocket/STOMP, plus offline Web Push notifications (VAPID) for booking approvals, waitlist promotions, and complaint updates.
- **Interactive Campus Map** — PostGIS-backed hostel/landmark coordinates rendered with MapLibre GL, supporting distance calculations between hostels and campus landmarks.
- **Roommate Preference Matching** — Lifestyle-tag preferences (e.g., "Night Owl", "Quiet", "Neat") used to suggest compatible rooms/roommates.
- **Role-Dispatched Dashboards** — Discriminated-union dashboard and room-detail views rendering distinct `AdminDashboard`, `ManagerDashboard`, and `StudentDashboard` experiences from a single route.
- **Analytics** — Aggregate metrics for admins/managers (occupancy, bookings, revenue trends).
- **Admin User Management** — Platform-wide user administration (activation/deactivation, role assignment).

---

## Architecture Highlights

A few non-obvious decisions worth knowing before touching the codebase:

- **Single-flight token refresh.** All refresh triggers (bootstrap hook, axios 401 interceptor, scheduled silent refresh) are funneled through one `performTokenRefresh()` with promise-level deduplication, since the backend's single-use rotating refresh cookie treats concurrent refresh calls as a token-reuse/breach signal and revokes all sessions.
- **Cookie attribute consistency.** Any code that clears the auth cookies (logout, refresh-failure cleanup) must use the exact same `path` / `domain` / `secure` / `sameSite` attributes used when the cookie was set, or the browser will silently fail to delete it.
- **Waitlist eligibility.** A period is only "full" for waitlist purposes when every bed is *locked* (`APPROVED` or `CHECKED_IN`) — a period that's merely capacity-full with `PENDING` bookings is not waitlist-eligible, since promotion only fires when a locked slot is actually freed.
- **`promoteNextInLine` guard chain.** Waitlist promotion bypasses the normal `BookingService.createBooking` validation path, so it re-applies its own guard chain in order: room availability → semester linearity (`SECOND` semester, room-scoped) → duplicate active booking per candidate (skip-and-recurse) → `FULL`-semester self-conflict per candidate, scoped per-student-per-room-per-year (skip-and-recurse). Period-capacity is intentionally *not* re-checked, since promotion runs inside the same transaction that frees the slot.
- **`@WebMvcTest` + `@Component` filters.** `JwtAuthenticationFilter` is a `@Component`, so Spring auto-detects it in `@WebMvcTest` slices regardless of which `SecurityConfig` is imported. Controller slice tests use a shared `MethodSecurityTestConfig` to keep this predictable.
- **Partial unique indexes over hard constraints.** Business rules like "one active booking per student per room" are enforced via partial unique indexes (e.g. `idx_unique_active_room_booking`) rather than blanket `UNIQUE` constraints, since the rule only applies to *active* rows.

---

## Getting Started

### Prerequisites

- **Java 25** (JDK)
- **Maven** (or use the bundled `./mvnw`)
- **Node.js 18+** and a package manager (`npm`/`bun` — a `bun.lock` is present)
- **Docker & Docker Compose** (recommended for Postgres + PostGIS)
- A PostgreSQL instance with the **PostGIS** extension if not using Docker

### Backend Setup

```bash
cd hostel-backend

# 1. Configure environment
cp .env.example .env
# fill in SPRING_DATASOURCE_*, JWT_*, VAPID_*, GOOGLE_*, MAIL_*, POSTGRES_*, etc.

# 2. Start Postgres (+ PostGIS) and the API together
docker compose up -d

# — OR, run Postgres via Docker and the app locally —
docker compose up -d postgres
./mvnw spring-boot:run
```

The API starts on `http://localhost:8080` (configurable via `SERVER_PORT`). Liquibase runs migrations automatically on startup. An optional `pgadmin` service is available via the `tools` Compose profile:

```bash
docker compose --profile tools up -d pgadmin   # http://localhost:5050
```

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install     # or: bun install

# 2. Configure environment
cp .env.example .env   # adjust VITE_API_BASE_URL etc. to point at your backend

# 3. Run the dev server
npm run dev
```

The app starts on `http://localhost:5173` by default.

Other useful scripts:

```bash
npm run build          # type-check + production build
npm run lint            # ESLint
npm run format           # Prettier write
npm run typecheck        # tsc --noEmit
npm test                 # Vitest run
npm run test:watch       # Vitest watch mode
npm run test:coverage    # Vitest with coverage report
```

---

## Environment Variables

### Backend (`hostel-backend/.env`)

| Variable | Purpose |
| --- | --- |
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_EXPIRATION` | JWT signing & token lifetimes |
| `JWT_COOKIE_*` (`NAME`, `DOMAIN`, `PATH`, `SECURE`, `HTTP_ONLY`, `SAME_SITE`) | Auth cookie attributes — must match between set & clear operations |
| `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push (browser push notifications) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google OAuth2 login |
| `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_PORT`, `MAIL_SMTP_*` | Transactional email (SMTP) |
| `FRONTEND_BASE_URL`, `BACKEND_BASE_URL` | Used for CORS, redirect URIs, and links in emails |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Docker Compose Postgres provisioning |
| `SERVER_PORT`, `SERVER_CONTEXT_PATH`, `SERVER_FORWARD_HEADERS_STRATEGY` | Server configuration |
| `HOSTEL_SWEEPER_RATE` | Cron/fixed-rate interval for the expired-booking sweeper |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile (e.g. `dev`, `prod`) |

See [`hostel-backend/.env.example`](hostel-backend/.env.example) for the full list.

### Frontend [`frontend/.env.example`](frontend/.env.example)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL for REST API calls |
| `VITE_BACKEND_APP_NAME` | Application name used by the backend session/cookie config |
| `VITE_WEB_SOCKET_URL` | WebSocket (STOMP) endpoint for real-time notifications |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for client-side image uploads |

---

## Database & Migrations

- Schema is managed entirely through **Liquibase**, entry point at [`hostel-backend/src/main/resources/db/changelog/db.changelog-master.yaml`](./hostel-backend/src/main/resources/db/changelog/db.changelog-master.yaml).
- Individual changelogs live alongside the master file (`db.changelog-00N-*.yaml`), with raw SQL helpers under `db/changelog/scripts/`.
- `hibernate.ddl-auto` is intentionally **not** used to manage schema in any environment — all schema changes must go through a Liquibase changelog.
- PostGIS is enabled at the database level via `db-init/00-init-extensions.sql`, mounted into the Postgres container on first boot.

**Note:** when adding new migration files, remember to also register them as an `include:` entry in `db.changelog-master.yaml` — migrations that exist on disk but aren't included there will silently never run (this affects both live deployments and Testcontainers-based repository tests, which bootstrap a real schema from the changelog).

---

## Testing

### Backend

```bash
cd hostel-backend
./mvnw test
```

- Service-layer unit tests (Mockito, no Spring context) for high-risk logic such as `BookingService`, `WaitlistService`, and the scheduled `BookingExpiredSweeper`.
- JWT/security unit tests for token parsing and the authentication filter.
- `MockMvc` controller slice tests (`@WebMvcTest`) using a shared `MethodSecurityTestConfig`.
- Shared `TestFixtures` factory for building minimally-valid entities (`student()`, `manager()`, `hostel()`, `room()`, `booking()`, …).
- See [`hostel-backend/TESTING.md`](./backend/TESTING.md) for the detailed test-batch history and rationale.

### Frontend

```bash
cd frontend
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

- **Vitest + React Testing Library + MSW** for component, hook, and integration coverage.
- Covers utility functions, custom hooks, the Zustand auth store, the Axios interceptor (envelope unwrapping + refresh deduplication), route guards (RBAC), and form/display components across the `booking`, `room`, and `waitlist` features.
- Test files are colocated with their source (`*.test.ts` / `*.test.tsx`) throughout `src/`.

---

## API Documentation

Once the backend is running, interactive API docs (springdoc-openapi / Swagger UI) are available at:

```text
http://localhost:8080/swagger-ui.html
```

---

## Deployment

- **Frontend:** deployed at [hostelifeplus.com](https://hostelifeplus.com).
- **Backend:** deployed at [api.hostelifeplus.com](https://api.hostelifeplus.com).
- **Containerization:** the backend ships with `Dockerfile.dev` (hot-reload, used by `docker-compose.yaml`) and `Dockerfile.prod` for production builds.
- **Health checks:** the app container exposes `/actuator/health`, used by Docker Compose's healthcheck and suitable for uptime/load-balancer probes.
- CORS and cookie attributes (`JWT_COOKIE_DOMAIN`, `JWT_COOKIE_SECURE`, `JWT_COOKIE_SAME_SITE`) must be set to match the production domain(s) — mismatches here are a common source of silent auth failures across the `hostelifeplus.com` / `api.hostelifeplus.com` split-domain setup.

---

## Known Issues / Roadmap

- **Liquibase changelog gap:** additional migration scripts beyond `002` should be added and registered under `db.changelog-master.yaml` as the schema evolves — anything left unregistered will not run, including under Testcontainers-based repository tests.
- **`JwtService` token parsing:** parsing an empty token string should be hardened to fail gracefully alongside the existing `JwtException` handling.
- Preliminary academic report sections (Declaration, Dedication, Acknowledgements, Table of Contents, diagrams, UI screenshots, appendices) are tracked separately as part of the CSC 406 submission and are not part of the application codebase.

---

## Academic Context

This project was developed by **Leroy**, a Computer Science student at the **University of Cape Coast (UCC)**, as the practical submission for **CSC 499 - Final Year Project** under **Mr. Paul Arhin**. Architectural and coding conventions for ongoing development are documented in [`Agent.md`](./Agent.md) (system-wide architecture) and [`agent2.md`](./agent2.md) (frontend guidelines).

---

## License

No license has been specified for this project. All rights reserved by the author unless stated otherwise.
