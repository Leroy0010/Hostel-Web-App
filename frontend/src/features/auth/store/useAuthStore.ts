import { create } from 'zustand';
import { tokenManager } from '@/lib/tokenManager';
import type {
    ProfileUser,
    UserHostelDto,
} from '@/features/user/types/user.types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

interface AuthState {
    // ── Identity ────────────────────────────────────────────────────────────
    /** The currently authenticated user profile, or null when unauthenticated. */
    user: ProfileUser | null;
    /**
     * The hostel associated with the current user's role context.
     * Null for students who haven't booked, or for admin users.
     */
    hostel: UserHostelDto | null;

    // ── Status flags ────────────────────────────────────────────────────────
    /**
     * True once the bootstrap refresh cycle (useAuthInit) has completed —
     * regardless of success or failure.
     * Routing decisions MUST NOT be made until this is true.
     */
    isInitialized: boolean;
    /** True while the bootstrap or a token refresh cycle is in flight. */
    isLoading: boolean;
    /** True when a valid access token is held in memory. */
    isAuthenticated: boolean;
    /** True while a silent token refresh is in progress. */
    isRefreshing: boolean;

    // ── Actions ─────────────────────────────────────────────────────────────
    /**
     * Hydrates the store after a successful login or bootstrap refresh.
     * Stores the access token in the in-memory TokenManager and schedules
     * the pre-expiry silent refresh.
     */
    setAuth: (
        accessToken: string,
        user: ProfileUser,
        hostel: UserHostelDto | null
    ) => void;

    setUser: (user: ProfileUser) => void;

    /**
     * Updates only the access token (e.g. after a silent refresh).
     * Does NOT touch user/hostel state.
     */
    updateAccessToken: (token: string) => void;

    /**
     * Tears down the session: clears the in-memory token, cancels any
     * scheduled refresh timer, and resets all identity fields.
     */
    clearAuth: () => void;

    setInitialized: (initialized: boolean) => void;
    setLoading: (loading: boolean) => void;
    setRefreshing: (refreshing: boolean) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set) => ({
    // ── Initial state ────────────────────────────────────────────────────────
    user: null,
    hostel: null,
    isInitialized: false,
    isLoading: true,
    isAuthenticated: false,
    isRefreshing: false,

    // ── Actions ──────────────────────────────────────────────────────────────

    setAuth: (accessToken, user, hostel) => {
        tokenManager.setToken(accessToken);
        set({
            user,
            hostel,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
        });
    },
    setUser: (user) => set({ user }),

    updateAccessToken: (token) => {
        tokenManager.setToken(token);
        set({ isAuthenticated: true });
    },

    clearAuth: () => {
        tokenManager.clearToken();
        set({
            user: null,
            hostel: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
        });
    },

    setInitialized: (isInitialized) => set({ isInitialized }),
    setLoading: (isLoading) => set({ isLoading }),
    setRefreshing: (isRefreshing) => set({ isRefreshing }),
}));
