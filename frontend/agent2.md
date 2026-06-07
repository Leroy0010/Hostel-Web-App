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
│       ├── api/          # API call functions (axios) and React Query hooks
│       ├── components/   # UI components specific to this feature
│       ├── hooks/        # Feature-specific custom hooks
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

* Configure Axios interceptors to automatically unwrap successful Spring Boot API envelopes.
* Standardize backend error handling.
* Convert API errors into strongly typed `ApiError` objects.
* Never duplicate response envelope extraction inside components.
* React Query hooks should return domain data directly.

---

## 3. React Query Standards

### Queries

* All server state must use React Query.
* Query keys must be centralized and strongly typed.
* Avoid direct Axios calls inside UI components.
* Components should consume custom hooks.

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

* Use React Query mutations for create/update/delete operations.
* Invalidate affected query keys after successful mutations.
* Show success and error feedback through the global toast system.

---

## 4. Component Design Principles

### Global Components

Place reusable UI primitives in:

```text
src/components/
```

Examples:

* Button
* Input
* Modal
* DataTable
* LoadingSpinner
* EmptyState
* PageHeader
* ConfirmDialog

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

* API data
* Pagination
* Search results
* Caching
* Synchronization

### Zustand

Use for:

* Theme
* Authentication state
* Sidebar state
* User preferences
* Temporary client-side state

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

* Always support both light and dark themes.
* Never hardcode colors unless part of the design system.
* Use:

```tsx
transition-colors duration-200
```

for theme transitions.

* Ensure accessible contrast ratios.
* Verify hover, focus, active, and disabled states in both themes.

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

* Feel fast and responsive.
* Enhance usability.
* Never block user interaction.
* Respect accessibility preferences.
* Avoid excessive motion.
* Maintain 60fps performance.

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

* Clear page titles
* Consistent spacing
* Strong typography scale
* Proper section grouping

### Empty States

Every list or table must have:

* Empty state illustration/icon
* Helpful message
* Primary action button

### Loading States

Every async page must include:

* Skeleton loaders
* Loading indicators
* Optimistic UI where appropriate

### Error States

Every API-driven screen must include:

* Error feedback
* Retry actions
* Friendly messaging

### Responsive Design

Design mobile-first.

Support:

* Mobile
* Tablet
* Desktop

Avoid fixed widths unless necessary.

---

## 9. Code Quality Rules

### TypeScript

* No `any`.
* Prefer interfaces.
* Use Zod for runtime validation when applicable.
* Export reusable types.

### Components

* Keep components focused.
* Extract reusable logic into hooks.
* Avoid deeply nested JSX.

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
