import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { tokenManager } from '@/lib/tokenManager';
import axios from 'axios';
import { apiClient } from '@/lib/axios';
import type { LoginResponse } from '../types';
import type { ApiResponse } from '@/types/api';

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
                const refreshResponse = await axios.post<
                    ApiResponse<LoginResponse>
                >(
                    `${apiClient.defaults.baseURL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const { token, user: profile } = refreshResponse.data.data;

                const { user, hostel } = profile;

                // Persist token in memory and schedule silent pre-expiry refresh.
                tokenManager.setToken(token);

                // ── Step 3: Hydrate store ────────────────────────────────────
                setAuth(token, user, hostel);
                tokenManager.registerLogoutCallback(clearAuth);
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
