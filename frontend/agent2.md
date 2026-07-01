# Frontend Architecture & Developer Guidelines

## 1. Project Structure (Feature-Based)

We use a feature-based architecture to keep domain logic co-located. The structure should strictly follow:

```text
src/
├── app/                  # App-wide routing, providers, and global layouts
├── assets/               # Static assets (images, fonts)
├── components/           # Global, reusable UI components (shadcn ui, etc.)
├── features/             # Feature-based modules (booking, hostel, room, auth, etc.)
│   └── [feature-name]/
│       ├── api/          # API call functions (axios)
│       ├── components/   # UI components specific to this feature
│       ├── hooks/        # Feature-specific custom hooks and React Query hooks
│       ├── types/        # TypeScript interfaces/schemas for this feature
│       └── utils/        # Helper functions for this feature
├── lib/                  # Third-party library configurations (axios, queryClient, cn, etc.)
├── store/                # Global state (Zustand stores)
└── types/                # Global generic TypeScript types (e.g., API envelopes)
```

---

## 2. API Contracts & Axios Standards

### `src/types/api.ts`

```typescript
export interface ApiResponse<T = void> {
  timestamp: string;
  success: boolean;
  message: string;
  data: T;
}

export type ErrorCode =
  | 'RESOURCE_NOT_FOUND'
  | 'ROOM_FULLY_OCCUPIED'
  | 'BOOKING_ALREADY_EXISTS'
  | 'INVALID_BOOKING_TRANSITION'
  | 'ALREADY_ON_WAITLIST'
  | 'DUPLICATE_ROOM_NUMBER'
  | 'PAYMENT_FAILED'
  | 'FORBIDDEN'
  | 'USER_DEACTIVATED'
  | 'UNAUTHORIZED'
  | 'INVALID_TOKEN'
  | 'BAD_CREDENTIALS'
  | 'VALIDATION_FAILED'
  | 'ILLEGAL_ARGUMENT'
  | 'ILLEGAL_STATE'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details?: Record<string, string[]>;
  code: ErrorCode;
}
```

### Axios Rules

- Configure Axios interceptors to automatically unwrap successful Spring Boot API envelopes.
- Standardize backend error handling.
- Convert API errors into strongly typed `ApiError` objects.
- Never duplicate response envelope extraction inside components.
- React Query hooks should return domain data directly.

---

## 3. React Query Standards

### Queries

- All server state must use React Query.
- Query keys must be centralized and strongly typed.
- Avoid direct Axios calls inside UI components.
- Components should consume custom hooks.

Example:

```typescript
const { data, isLoading } = useHostels();
```

instead of:

```typescript
useEffect(() => {
  axios.get(...)
}, []);
```

### Mutations

- Use React Query mutations for create/update/delete operations.
- Invalidate affected query keys after successful mutations.
- Show success and error feedback through the global toast system.

---

## 4. Component Design Principles

### Global Components

Place reusable UI primitives in:

```text
src/components/
```

Examples:

- Button
- Input
- Modal
- DataTable
- LoadingSpinner
- EmptyState
- PageHeader
- ConfirmDialog

### Feature Components

Place domain-specific UI inside:

```text
src/features/[feature]/components/
```

Examples:

```text
features/booking/components/BookingCard.tsx
features/room/components/RoomStatusBadge.tsx
```

---

## 5. State Management Standards

### React Query

Use for:

- API data
- Pagination
- Search results
- Caching
- Synchronization

### Zustand

Use for:

- Theme
- Authentication state
- Sidebar state
- User preferences
- Temporary client-side state

Do not duplicate server state in Zustand.

---

## 6. Theme Application Standards (Light & Dark)

All components must use semantic utility classes rather than hardcoded colors.

### Color System

| Token Area          | Light Mode             | Dark Mode                              |
| ------------------- | ---------------------- | -------------------------------------- |
| App Viewport Canvas | bg-gray-50             | dark:bg-gray-900                       |
| Elevated Cards      | bg-white               | dark:bg-gray-950 / dark:bg-gray-800/40 |
| Borders             | border-gray-200        | dark:border-gray-800                   |
| Primary Text        | text-gray-900          | dark:text-gray-100                     |
| Secondary Text      | text-gray-500          | dark:text-gray-400                     |
| Inputs              | bg-white text-gray-900 | dark:bg-gray-900 dark:text-gray-100    |

### Required Rules

- Always support both light and dark themes.
- Never hardcode colors unless part of the design system.
- Use:

```tsx
transition-colors duration-200
```

for theme transitions.

- Ensure accessible contrast ratios.
- Verify hover, focus, active, and disabled states in both themes.

---

## 7. Animation & Motion Standards

### Framer Motion Requirement

Framer Motion should be used whenever animation meaningfully improves user experience.

### Use Framer Motion For

#### Page Transitions

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
```

#### Modal Animations

```tsx
<motion.div
  initial={{ scale: 0.95, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.95, opacity: 0 }}
>
```

#### Drawers & Sidebars

```tsx
<motion.aside
  initial={{ x: -300 }}
  animate={{ x: 0 }}
  exit={{ x: -300 }}
>
```

#### Cards & Interactive Elements

```tsx
whileHover={{ y: -2 }}
whileTap={{ scale: 0.98 }}
```

#### Loading Skeletons

```tsx
animate={{
  opacity: [0.5, 1, 0.5],
}}
```

### Motion Guidelines

Animations should:

- Feel fast and responsive.
- Enhance usability.
- Never block user interaction.
- Respect accessibility preferences.
- Avoid excessive motion.
- Maintain 60fps performance.

### Preferred Durations

| Interaction      | Duration   |
| ---------------- | ---------- |
| Hover            | 0.15–0.2s  |
| Buttons          | 0.15–0.2s  |
| Cards            | 0.2–0.3s   |
| Modals           | 0.25–0.35s |
| Drawers          | 0.25–0.4s  |
| Page Transitions | 0.2–0.4s   |

### Accessibility

Respect reduced-motion preferences:

```tsx
const shouldReduceMotion = useReducedMotion();
```

Disable non-essential animations when reduced motion is enabled.

---

## 8. UI/UX Standards

Every screen should prioritize:

### Visual Hierarchy

- Clear page titles
- Consistent spacing
- Strong typography scale
- Proper section grouping

### Empty States

Every list or table must have:

- Empty state illustration/icon
- Helpful message
- Primary action button

### Loading States

Every async page must include:

- Skeleton loaders
- Loading indicators
- Optimistic UI where appropriate

### Error States

Every API-driven screen must include:

- Error feedback
- Retry actions
- Friendly messaging

### Responsive Design

Design mobile-first.

Support:

- Mobile
- Tablet
- Desktop

Avoid fixed widths unless necessary.

---

## 9. Code Quality Rules

### TypeScript

- No `any`.
- Prefer interfaces.
- Use Zod for runtime validation when applicable.
- Export reusable types.

### Components

- Keep components focused.
- Extract reusable logic into hooks.
- Avoid deeply nested JSX.

### Naming

Components:

```text
BookingCard.tsx
RoomTable.tsx
StudentForm.tsx
```

Hooks:

```text
useBookings.ts
useRooms.ts
useStudents.ts
```

Types:

```text
booking.types.ts
room.types.ts
student.types.ts
```

---

## 10. Golden Rule

Every implementation should optimize for:

1. Scalability
2. Maintainability
3. Accessibility
4. Performance
5. Consistent UI/UX
6. Type Safety
7. Responsive Design
8. Theme Compatibility
9. Smooth Framer Motion Animations
10. Clean Feature-Based Architecture

When multiple solutions exist, choose the approach that remains easiest to maintain as the application grows.

## 11. Updates

### Form field errors should now use the custom FieldError component from @/components/ui/FieldError

```tsx
{errors.academicYear && (
    <FieldError message={errors.academicYear.message!} />
    )
}
```

### Pagination ui should use the custom CustomPagination component from @/components/ui/CustomPagination

```tsx
import { Pagination } from '@/components/ui/CustomPagination';

{/* Pagination */}
{roomPage && roomPage.totalPages > 1 && (
    <Pagination
        currentPage={page}
        totalPages={roomPage.totalPages}
        totalElements={roomPage.totalElements}
        onPageChange={setPage}
        isLoading={isFetchingRooms}
    />)
}
```

### For form rowVariants transition use

```tsx

import type { Transition } from "framer-motion";
// @/features/auth/utils/transition
export const transition: Transition = {
    duration: 0.35,
    ease: [0.22, 1, 0.36, 1],
    staggerChildren: 0.07,
};

// usage in forms
import { transition } from '@/features/auth/utils/transition';


const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
        opacity: 1,
        y: 0,
        transition,
    },
};
```

### Stop writing PageResponse in each feature.types.ts. Use @/types/pagination PageResponse and PaginationParams

```ts
/**
 * Spring Data {@code Page<T>} response shape.
 *
 * The Axios interceptor unwraps {@code ApiResponse.data}, giving us the raw
 * Spring Page object. We type it explicitly so React Query hooks are
 * fully typed without casting.
 *
 * @template T - The content item type (e.g. {@link HostelSummaryDto}).
 */
export interface PageResponse<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
        sort: { sorted: boolean; unsorted: boolean; empty: boolean };
    };
    totalElements: number;
    totalPages: number;
    last: boolean;
    first: boolean;
    numberOfElements: number;
    size: number;
    number: number;
    empty: boolean;
}

/**
 * Common pagination parameters used in API requests.
 *
 * Designed to align with Spring Data pagination conventions.
 */
export interface PaginationParams {
    /**
     * Zero-based page index
     * @example 0
     */
    page?: number;

    /**
     * Number of records per page
     * @example 10
     */
    size?: number;

    /**
     * Sorting criteria in the format:
     * `field,asc` or `field,desc`
     *
     * @example "createdAt,desc"
     */
    sort?: string;
}
```

#### Example usage. That's what I have been doing so for next features use this

```ts
/** Query params for complaint list endpoints. */
export interface ComplaintPageParams extends PaginationParams {
    status?: ComplaintStatus;
}

import type { PageResponse } from '@/types/pagination';
```

### zod v4 doesn't have required_error and invalid_error. It only has the error options. Also uuid should be z.uuid not z.string().uuid. For urls, it should be z.url and not z.string().url

```ts
/**
 * Student complaint creation schema.
 * Maps to {@code POST /api/complaints} → {@code CreateComplaintRequest}.
 */
export const createComplaintSchema = z.object({
    hostelId: z.uuid('Invalid hostel ID'),
    roomId: z.uuid('Invalid room ID').optional().or(z.literal('')),
    title: z
        .string()
        .min(1, 'Title is required')
        .max(200, 'Title must not exceed 200 characters')
        .trim(),
    description: z.string().min(1, 'Description is required').trim(),
    category: z.enum(
        ['MAINTENANCE', 'CLEANLINESS', 'SECURITY', 'NOISE', 'BILLING', 'OTHER'],
        { error: 'Category is required' }
    ),
});

export type CreateComplaintFormValues = z.infer<typeof createComplaintSchema>;

/**
 * Manager/admin status update schema.
 * Maps to {@code PATCH /api/manager/complaints/{id}/status}.
 */
export const updateComplaintStatusSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], {
        error: 'Status is required',
    }),
});

```

### Don't use AppLayout in page components. Here is the current AppRoutes Structure

```tsx
import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';
import { PublicRoute } from '@/components/routing/PublicRoute';
import { AppLoader } from '@/components/ui/AppLoader';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
    AdminHostels,
    Dashboard,
    ForgotPassword,
    Home,
    Hostels,
    HostelsDetailsPage,
    Login,
    ManagerHostelBookings,
    ManagerHostels,
    ManagerRoomsPage,
    NotFound,
    Notifications,
    Profile,
    Register,
    ResetPassword,
    RoomDetailsPage,
    StudentBookings,
    Unauthorized,
    VerifyEmail,
    ManagerPendingBookings,
    BookingDetailPage,
} from './lazyLoadedPages';
import { AppLayout } from '@/components/layout/AppLayout';

/**
 * Application route tree.
 *
 * Design decisions:
 * - One `<Route path="/" ...>` per segment — no duplicate definitions.
 * - ProtectedRoute and PublicRoute both gate on `isInitialized` so routing
 *   decisions are never made against uninitialised auth state.
 * - The `<RootIndexRedirect />` component handles post-login role steering
 *   and lives *inside* the ProtectedRoute subtree, so it only ever runs when
 *   a valid, initialised session exists.
 */
export function AppRoutes() {
    return (
        <Suspense fallback={<AppLoader />}>
            <Routes>
                {/* ── Public spaces (unauthenticated only) ─────────────────── */}
                <Route element={<PublicRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                    />
                    <Route path="/setup-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                </Route>

                {/* ── Error / informational pages ──────────────────────────── */}
                <Route path="/unauthorized" element={<Unauthorized />} />

                <Route element={<AppLayout isHomePage />}>
                    <Route path="/" element={<Home />} />
                </Route>

                {/* ── Layout Viewports (Guests AND Authenticated Users) ─────── */}
                <Route element={<AppLayout />}>
                    {/* Open Content Pages */}

                    <Route path="/hostels" element={<Hostels />} />
                    <Route
                        path="/hostels/:hostelId"
                        element={<HostelsDetailsPage />}
                    />

                    <Route
                        path="/hostels/:hostelId/rooms/:roomId"
                        element={<RoomDetailsPage />}
                    />

                    {/* ── Protected spaces (all authenticated roles) ───────────── */}
                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={['ADMIN', 'MANAGER', 'STUDENT']}
                            />
                        }
                    >
                        {/* 🔴 Move root back inside the guard container */}
                        <Route path="/" element={<RootIndexRedirect />} />

                        {/* Shared protected routes */}
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route
                            path="/notifications"
                            element={<Notifications />}
                        />

                        <Route
                            path="/bookings/:id"
                            element={<BookingDetailPage />}
                        />

                        {/* Admin routes */}
                        <Route
                            element={
                                <ProtectedRoute allowedRoles={['ADMIN']} />
                            }
                            path="/admin"
                        >
                            <Route path="hostels" element={<AdminHostels />} />
                        </Route>

                        {/* Manager routes */}
                        <Route
                            element={
                                <ProtectedRoute allowedRoles={['MANAGER']} />
                            }
                            path="/manager"
                        >
                            <Route
                                path="hostels"
                                element={<ManagerHostels />}
                            />
                            <Route
                                path="hostels/:hostelId/rooms"
                                element={<ManagerRoomsPage />}
                            />
                            <Route
                                path="bookings/pending"
                                element={<ManagerPendingBookings />}
                            />

                            <Route
                                path="hostels/:hostelId/bookings"
                                element={<ManagerHostelBookings />}
                            />
                        </Route>

                        {/* Student routes */}
                        <Route
                            element={
                                <ProtectedRoute allowedRoles={['STUDENT']} />
                            }
                            path="/student"
                        >
                            <Route
                                path="bookings"
                                element={<StudentBookings />}
                            />
                        </Route>
                    </Route>
                </Route>

                {/* ── Catch-all fallback ────────────────────────────────────── */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Suspense>
    );
}

// ---------------------------------------------------------------------------
// Role-aware root redirect
// ---------------------------------------------------------------------------

/**
 * Steers authenticated users from "/" to their role-specific workspace home.
 *
 * NOTE: This component only ever renders inside a <ProtectedRoute />, so by
 * the time it mounts, `isInitialized` is guaranteed true and `user` is non-null.
 * As role-specific dashboards are built out, replace the Navigate targets.
 */
function RootIndexRedirect() {
    const user = useAuthStore((state) => state.user);

    // If no user or unexpected role, return
    if (!user || !['ADMIN', 'MANAGER', 'STUDENT'].includes(user.role)) {
        return;
    }

    // Everyone else goes to dashboard
    return <Navigate to="/dashboard" replace />;
}

```
