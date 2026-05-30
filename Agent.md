# Architecture & Technical Specification: Hostel Booking System

## 1. Project Overview

This document outlines the architecture for the Design and Development of a Hostel/Accommodation Booking System (Web and Mobile Application). The system aims to simplify room booking, allocation, and management. It replaces manual and fragmented processes with a streamlined digital solution. The platform serves Students/Tenants, Managers, and Administrators.

---

## 2. Technology Stack

| Domain           | Technology                  | Purpose                                                |
| :--------------- | :-------------------------- | :----------------------------------------------------- |
| **Frontend**     | React, TypeScript           | Core UI library and type-safe language.                |
| **UI/UX**        | Shadcn UI, Tailwind CSS     | Sleek, accessible, and customizable UI components.     |
| **Icons**        | Lucide React                | Clean, consistent, and lightweight iconography.        |
| **Backend**      | Spring Boot 3.x (Java)      | Robust RESTful API and WebSocket backend.              |
| **Data Mapping** | MapStruct                   | Efficient Java bean to DTO mapping.                    |
| **Database**     | PostgreSQL                  | Relational database for structured data storage.       |
| **Spatial Data** | PostGIS                     | PostgreSQL extension for campus map integration.       |
| **Migrations**   | Liquibase                   | Version control and automated database schema updates. |
| **Real-time**    | Spring WebSockets, SSE      | Instant notification delivery.                         |
| **Push Alerts**  | Firebase (Martijn Web Push) | Offline and browser-level push notifications.          |
| **Deployment**   | Docker                      | Containerization for consistent environments.          |

---

## 3. Core System Modules

### Authentication & Role-Based Access Control (RBAC)

- Implement Spring Security with JSON Web Tokens (JWT) for stateless authentication.
- Define strict role hierarchies: `ADMIN`, `MANAGER`, and `STUDENT`.
- Secure backend endpoints and frontend routes based on user roles.

### Hostel Management & Booking Engine

- Display available hostels, room types, and prices.
- Process room bookings and requests.
- Manage approval and rejection workflows for administrators.
- Simulate payment processing to fulfill academic scope requirements.

### Real-Time Notifications

- Use Spring WebSockets (STOMP protocol) for live in-app updates (e.g., booking approvals).
- Integrate Firebase Admin SDK for system-level web push notifications to keep users informed offline.

### Complaints Resolution & Reviews

- Implement a ticketing system for room-specific or hostel-specific complaints.
- Allow users to upvote or downvote complaints to prioritize critical issues.
- Restrict the review system to users who have successfully booked and checked into a specific hostel.

### Interactive Campus Map (University of Cape Coast)

- Utilize PostGIS to store hostel coordinates (Latitude/Longitude).
- Integrate Mapbox GL JS or Leaflet.js on the frontend to visualize campus maps.
- Enable students to calculate distances between hostels and major campus landmarks.

---

## 4. Suggested Value-Add Features

- **Roommate Matching / Preferences:** Allow students to fill out a brief lifestyle tag list (e.g., "Night Owl", "Quiet", "Messy", "Neat"). The system can suggest available rooms where existing occupants share similar tags.
- **Automated Waitlist:** If a highly demanded hostel is full, allow students to join a waitlist. If a booking is canceled or rejected, the system automatically notifies the next person in line via Firebase Push.
- **Maintenance Ticketing:** Allow students to upload photos of broken amenities in their room directly to the manager's dashboard to streamline maintenance requests.

---

## 5. Recommended Best Practices

### Frontend Optimization

- **Code Splitting & Lazy Loading:** Use React's `lazy()` and `Suspense` to split bundles at the route level, ensuring initial load times are fast.
- **Component Reusability:** Leverage Shadcn UI to build a consistent design system without heavy runtime overhead.
- **State Management:** Use tools like React Query (TanStack Query) for server-state management, caching, and background data synchronization.
- **Sleek UI/UX:** Provide skeleton loaders during data fetches and implement optimistic UI updates for interactions like upvoting a complaint.

### Backend Optimization

- **Avoiding N+1 Query Problem:** Utilize JPA `@EntityGraph` or explicitly write `JOIN FETCH` clauses in Spring Data JPA repositories to fetch related entities in a single query.
- **DTO Mapping:** Use MapStruct to automatically generate mapping code between Hibernate Entities and Data Transfer Objects (DTOs), keeping controllers clean.
- **Concurrency Control:** Implement Optimistic Locking (using `@Version` in JPA) on the Room entity to prevent double booking during high-traffic periods.
- **Database Versioning:** Use Liquibase to manage all database changes incrementally. Never use `hibernate.hbm2ddl.auto=update` in a production or staging environment.

### Deployment & DevOps

- **Dockerization:** Create separate `Dockerfile` configurations for the Spring Boot backend and the React frontend.
- **Compose File:** Utilize `docker-compose.yml` to spin up the application, the PostgreSQL database, and any required services (like Redis for WebSockets) simultaneously.

---

## 6. Expected Outcome

The resulting platform will be a highly scalable, functional hostel accommodation booking system that provides an efficient, reliable, and user-friendly digital solution. It will drastically reduce manual workload and serve as a strong practical demonstration of modern software development concepts.
