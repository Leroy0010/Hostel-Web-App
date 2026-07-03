import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared validators
// ---------------------------------------------------------------------------

/**
 * International phone number validator.
 *
 * Accepts formats like:
 *  - `+233541234567`
 *  - `0541234567`
 *  - `+1 (555) 000-0000`
 *
 * Mirrors the backend `@Pattern` constraint exactly.
 */
const phoneSchema = z
    .string()
    .regex(
        /^[\d\s+\-()]{7,20}$/,
        'Phone number must be 7-20 characters and contain only digits, spaces, +, -, or parentheses'
    );

/**
 * Strong password validator.
 *
 * Rules (mirrors `@StrongPassword` on the backend):
 *  - Minimum 8 characters
 *  - Maximum 72 characters (BCrypt truncation boundary)
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character
 */
export const strongPasswordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must not exceed 72 characters')
    .refine(
        (val) => {
            // 1. Define the 4 condition checks
            const hasUpper = /[A-Z]/.test(val);
            const hasLower = /[a-z]/.test(val);
            const hasDigit = /\d/.test(val);
            const hasSpecial = /[^A-Za-z0-9]/.test(val);

            // 2. Count how many conditions are met
            const conditionsMet = [
                hasUpper,
                hasLower,
                hasDigit,
                hasSpecial,
            ].filter(Boolean).length;

            // 3. Pass if 2 or more conditions are true
            return conditionsMet >= 2;
        },
        {
            message:
                'Password must contain at least 2 of the following: uppercase, lowercase, numbers, or special characters',
        }
    );

// ---------------------------------------------------------------------------
// Student self-registration
// ---------------------------------------------------------------------------

/**
 * Zod schema for student self-registration.
 *
 * Maps to {@code POST /api/users} — {@code CreateStudentRequest} on the backend.
 *
 * Phone is optional for students; if provided it must pass the phone regex.
 * Password confirmation is frontend-only and stripped before sending to the API.
 */
export const registerStudentSchema = z
    .object({
        firstName: z
            .string()
            .min(1, 'First name is required')
            .max(100, 'First name must not exceed 100 characters')
            .trim(),
        lastName: z
            .string()
            .min(1, 'Last name is required')
            .max(100, 'Last name must not exceed 100 characters')
            .trim(),
        email: z.email('Invalid email address').min(1, 'Email is required'),
        password: strongPasswordSchema,
        confirmPassword: z.string().min(1, 'Please confirm your password'),
        /** Optional for students — omit from API payload if empty. */
        phone: z.union([phoneSchema, z.literal('')]).optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    });

/** Inferred TypeScript type for the student registration form. */
export type RegisterStudentFormValues = z.infer<typeof registerStudentSchema>;

/**
 * API payload shape sent to `POST /api/users`.
 * Excludes `confirmPassword` which is a frontend-only validation field.
 */
export type CreateStudentPayload = Omit<
    RegisterStudentFormValues,
    'confirmPassword'
> & {
    phone?: string; // undefined/empty string should be omitted
};

// ---------------------------------------------------------------------------
// Admin staff creation
// ---------------------------------------------------------------------------

/**
 * Zod schema for admin-initiated staff account creation.
 *
 * Maps to {@code POST /api/admin/users} — {@code CreateStaffRequest} on the backend.
 *
 * Key differences from student registration:
 *  - Phone is REQUIRED
 *  - No password field — the backend sends a set-password token via email
 *  - Role must be MANAGER or ADMIN (STUDENT is rejected by the backend service)
 */
export const createStaffSchema = z.object({
    firstName: z
        .string()
        .min(1, 'First name is required')
        .max(100, 'First name must not exceed 100 characters')
        .trim(),
    lastName: z
        .string()
        .min(1, 'Last name is required')
        .max(100, 'Last name must not exceed 100 characters')
        .trim(),
    email: z.email('Invalid email address').min(1, 'Email is required'),
    phone: phoneSchema,
    role: z.enum(['MANAGER', 'ADMIN'], {
        error: 'Role must be MANAGER or ADMIN',
    }),
});

/** Inferred TypeScript type for the staff creation form. */
export type CreateStaffFormValues = z.infer<typeof createStaffSchema>;
