import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { tokenManager } from '@/lib/tokenManager';
import axios from 'axios';
import { apiClient } from '@/lib/axios';
import type { MeResponse } from '../types';

/**
 * Application bootstrap hook — runs exactly once on app mount.
 *
 * Flow:
 *  1. POST /auth/refresh  → exchange the HttpOnly refresh cookie for a new
 *     short-lived access token and store it in the in-memory TokenManager.
 *  2. GET  /users/me      → fetch the full profile + hostel context.
 *  3. Hydrate the Zustand auth store via `setAuth`.
 *
 * On any failure (network down, cookie expired, first visit) the store is
 * cleared and `isInitialized` is set to `true` so routing can proceed to /login.
 *
 * IMPORTANT — Axios envelope unwrapping:
 *   The response interceptor in src/lib/axios.ts already strips the
 *   `{ success, data, message, timestamp }` wrapper and returns `response.data.data`.
 *   Therefore:
 *     - The refresh response arrives as `{ token: string }` directly.
 *     - The /users/me response arrives as `MeResponse` directly.
 *   Accessing `.data.user` on the /users/me result would be WRONG here.
 */
export function useAuthInit() {
    const { setAuth, clearAuth, setInitialized, setLoading } = useAuthStore();

    // Prevent double-invocation in React 18 StrictMode
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const bootstrap = async () => {
            setLoading(true);

            try {
                // ── Step 1: Refresh token exchange ──────────────────────────
                // Use a bare axios instance (not apiClient) to avoid the
                // response interceptor triggering another refresh cycle.
                const refreshResponse = await axios.post(
                    `${apiClient.defaults.baseURL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                // Strip envelope wrapper if the backend sends one; handle both
                // wrapped `{ success: true, data: { token } }` and bare `{ token }`.
                const refreshPayload = refreshResponse.data?.success
                    ? refreshResponse.data.data
                    : refreshResponse.data;

                const token: string = refreshPayload.token;

                // Persist token in memory and schedule silent pre-expiry refresh.
                tokenManager.setToken(token);

                // ── Step 2: Fetch full user profile ─────────────────────────
                // apiClient interceptor unwraps the envelope → result is MeResponse.
                const profile = await apiClient.get<never, MeResponse>(
                    '/users/me'
                );

                // ── Step 3: Hydrate store ────────────────────────────────────
                setAuth(token, profile.user, profile.hostel);
            } catch {
                // Any failure (expired cookie, network error, etc.) is safe:
                // clear any stale state and let routing handle the redirect.
                clearAuth();
            } finally {
                // ALWAYS mark as initialised so ProtectedRoute / PublicRoute
                // can make routing decisions. Never leave this flag as false.
                setInitialized(true);
                setLoading(false);
            }
        };

        bootstrap();
    }, [setAuth, clearAuth, setInitialized, setLoading]);
}
