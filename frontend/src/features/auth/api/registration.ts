import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { ApiError } from '@/types/api';
import type {
    CreateStudentPayload,
    CreateStaffFormValues,
} from '../types/registration';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Query key constants
// ---------------------------------------------------------------------------

/**
 * Centralized query key for the users list.
 * Invalidated after a staff member is successfully created so
 * any admin user-list views refresh automatically.
 */
export const USERS_QUERY_KEY = ['users'] as const;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Student self-registration mutation.
 *
 * Endpoint: `POST /api/users` (public — no auth required)
 *
 * The backend registers the student and returns a full {@link LoginResponse}
 * (token + user profile), identical to the login response. The caller is
 * responsible for calling {@code setAuth} and navigating to the app root.
 *
 * On a {@code VALIDATION_FAILED} error, the caller should use React Hook Form's
 * {@code setError} to map per-field messages back onto the form fields.
 *
 * @example
 * ```tsx
 * const { mutate } = useRegisterStudentMutation();
 * mutate(payload, {
 *   onSuccess: (data) => { setAuth(data.token, data.user.user, data.user.hostel); navigate('/'); },
 *   onError: (err) => { if (err.code === 'VALIDATION_FAILED') mapErrors(err.details); },
 * });
 * ```
 */
export function useRegisterStudentMutation() {
    const queryClient = useQueryClient();
    return useMutation<void, ApiError, CreateStudentPayload>({
        mutationFn: (payload) => {
            // Strip empty phone string before sending — backend expects the
            // field to be absent rather than an empty string.
            const body: Partial<CreateStudentPayload> = { ...payload };
            if (!body.phone) delete body.phone;

            return apiClient.post<CreateStudentPayload, void>(
                '/users',
                body
            );
        },
        onSuccess: () => {
            // Invalidate the users list so admin views reflect the new account.
            queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
        },
        onError: (error) => {
            if (error.code !== 'VALIDATION_FAILED') {
                toast.error(error.message);
            }
        },
    });
}

/**
 * Admin staff account creation mutation.
 *
 * Endpoint: `POST /api/admin/users` (ADMIN role required)
 *
 * No password is sent — the backend generates a set-password token and
 * dispatches it to the new staff member's email address.
 *
 * Automatically invalidates the {@link USERS_QUERY_KEY} cache so any
 * admin user-list view picks up the new account without a manual refresh.
 *
 * @example
 * ```tsx
 * const { mutate } = useCreateStaffMutation();
 * mutate(payload, {
 *   onSuccess: () => { toast.success('Staff account created. An invitation email has been sent.'); },
 * });
 * ```
 */
export function useCreateStaffMutation() {
    const queryClient = useQueryClient();

    return useMutation<void, ApiError, CreateStaffFormValues>({
        mutationFn: (payload) =>
            apiClient.post<CreateStaffFormValues, void>(
                '/admin/users',
                payload
            ),
        onSuccess: () => {
            // Invalidate the users list so admin views reflect the new account.
            queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
        },
        onError: (error) => {
            if (error.code !== 'VALIDATION_FAILED') {
                toast.error(error.message);
            }
        },
    });
}
