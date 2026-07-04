import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './useAuthStore';
import { tokenManager } from '@/lib/tokenManager';
import type {
    ProfileUser,
    UserHostelDto,
} from '@/features/user/types/user.types';

const mockUser: ProfileUser = {
    id: 'user-1',
    name: 'Test Student',
    email: 'student@ucc.edu.gh',
    role: 'STUDENT',
    createdAt: '',
    isActive: true,
} as ProfileUser;

const mockHostel: UserHostelDto = {
    id: 'hostel-1',
    name: 'Leroy Hostel',
    address: 'hostel-1-address',
    roomNumber: 'hostel-1-room-001',
} as UserHostelDto;

// Reset the store to its initial values before every test so state does
// not leak between assertions (Zustand stores are module-level singletons).
function resetStore() {
    useAuthStore.setState({
        user: null,
        hostel: null,
        isInitialized: false,
        isLoading: true,
        isAuthenticated: false,
        isRefreshing: false,
    });
}

describe('useAuthStore', () => {
    beforeEach(() => {
        resetStore();
        vi.spyOn(tokenManager, 'setToken').mockImplementation(() => {});
        vi.spyOn(tokenManager, 'clearToken').mockImplementation(() => {});
    });

    it('starts unauthenticated and uninitialized', () => {
        const state = useAuthStore.getState();
        expect(state.isAuthenticated).toBe(false);
        expect(state.isInitialized).toBe(false);
        expect(state.isLoading).toBe(true);
        expect(state.user).toBeNull();
    });

    it('setAuth hydrates user/hostel and flips status flags', () => {
        useAuthStore.getState().setAuth('fake.jwt.token', mockUser, mockHostel);

        const state = useAuthStore.getState();
        expect(state.user).toEqual(mockUser);
        expect(state.hostel).toEqual(mockHostel);
        expect(state.isAuthenticated).toBe(true);
        expect(state.isLoading).toBe(false);
        expect(state.isInitialized).toBe(true);
        expect(tokenManager.setToken).toHaveBeenCalledWith('fake.jwt.token');
    });

    it('setAuth accepts a null hostel (e.g. admin users)', () => {
        useAuthStore.getState().setAuth('fake.jwt.token', mockUser, null);
        expect(useAuthStore.getState().hostel).toBeNull();
    });

    it('setUser updates only the user field', () => {
        useAuthStore.getState().setAuth('fake.jwt.token', mockUser, mockHostel);
        const updated = { ...mockUser, name: 'Updated Name' };
        useAuthStore.getState().setUser(updated);

        const state = useAuthStore.getState();
        expect(state.user?.name).toBe('Updated Name');
        expect(state.hostel).toEqual(mockHostel); // untouched
    });

    it('updateAccessToken refreshes the token without touching identity', () => {
        useAuthStore.getState().setAuth('fake.jwt.token', mockUser, mockHostel);
        useAuthStore.getState().updateAccessToken('new.jwt.token');

        const state = useAuthStore.getState();
        expect(tokenManager.setToken).toHaveBeenCalledWith('new.jwt.token');
        expect(state.user).toEqual(mockUser); // untouched
        expect(state.isAuthenticated).toBe(true);
    });

    it('clearAuth tears down the session and marks initialized', () => {
        useAuthStore.getState().setAuth('fake.jwt.token', mockUser, mockHostel);
        useAuthStore.getState().clearAuth();

        const state = useAuthStore.getState();
        expect(state.user).toBeNull();
        expect(state.hostel).toBeNull();
        expect(state.isAuthenticated).toBe(false);
        expect(state.isLoading).toBe(false);
        // isInitialized stays true — a logged-out user has still completed
        // the bootstrap cycle, so routing must not show the app loader again.
        expect(state.isInitialized).toBe(true);
        expect(tokenManager.clearToken).toHaveBeenCalled();
    });

    it('setInitialized / setLoading / setRefreshing update their own flags independently', () => {
        useAuthStore.getState().setInitialized(true);
        expect(useAuthStore.getState().isInitialized).toBe(true);

        useAuthStore.getState().setLoading(false);
        expect(useAuthStore.getState().isLoading).toBe(false);

        useAuthStore.getState().setRefreshing(true);
        expect(useAuthStore.getState().isRefreshing).toBe(true);
    });
});
