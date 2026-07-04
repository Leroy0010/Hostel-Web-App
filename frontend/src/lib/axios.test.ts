import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import { apiClient } from './axios';
import { tokenManager } from './tokenManager';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

describe('apiClient response interceptor', () => {
    let mock: MockAdapter;
    // A second mock intercepts the raw `axios` instance used directly for
    // the /auth/refresh calls inside the interceptor (it bypasses apiClient
    // to avoid recursive interceptor invocation).
    let rawMock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
        rawMock = new MockAdapter(axios);
        useAuthStore.setState({
            user: null,
            hostel: null,
            isInitialized: true,
            isLoading: false,
            isAuthenticated: false,
            isRefreshing: false,
        });
        vi.spyOn(tokenManager, 'setToken').mockImplementation(() => {});
        vi.spyOn(tokenManager, 'clearToken').mockImplementation(() => {});
    });

    afterEach(() => {
        mock.restore();
        rawMock.restore();
        vi.restoreAllMocks();
    });

    it('unwraps a successful ApiResponse envelope to just the data payload', async () => {
        mock.onGet('/hostels').reply(200, {
            timestamp: '2025-01-01T00:00:00Z',
            success: true,
            message: 'OK',
            data: { id: 'hostel-1', name: 'Leroy Hostel' },
        });

        const result = await apiClient.get('/hostels');
        expect(result).toEqual({ id: 'hostel-1', name: 'Leroy Hostel' });
    });

    it('returns raw response data when it is not an ApiResponse envelope', async () => {
        mock.onGet('/raw').reply(200, { foo: 'bar' });
        const result = await apiClient.get('/raw');
        expect(result).toEqual({ foo: 'bar' });
    });

    it('injects the Authorization header from the token manager', async () => {
        vi.spyOn(tokenManager, 'getToken').mockReturnValue('abc.def.ghi');
        mock.onGet('/me').reply((config) => {
            expect(config.headers?.Authorization).toBe('Bearer abc.def.ghi');
            return [200, { success: true, data: { id: 'me' } }];
        });
        await apiClient.get('/me');
    });

    it('retries the original request with a new token after a successful silent refresh', async () => {
        vi.spyOn(tokenManager, 'getToken')
            .mockReturnValueOnce('expired-token')
            .mockReturnValue('fresh-token');

        let callCount = 0;
        mock.onGet('/bookings').reply(() => {
            callCount += 1;
            if (callCount === 1) {
                return [401, { code: 'UNAUTHORIZED', message: 'Expired' }];
            }
            return [200, { success: true, data: { id: 'booking-1' } }];
        });

        rawMock.onPost(/\/auth\/refresh$/).reply(200, {
            success: true,
            data: { token: 'fresh-token' },
        });

        const result = await apiClient.get('/bookings');
        expect(result).toEqual({ id: 'booking-1' });
        expect(tokenManager.setToken).toHaveBeenCalledWith('fresh-token');
    });

    it('clears auth and rejects when the refresh call itself fails', async () => {
        mock.onGet('/bookings').reply(401, {
            code: 'UNAUTHORIZED',
            message: 'Expired',
        });
        rawMock
            .onPost(/\/auth\/refresh$/)
            .reply(401, { code: 'UNAUTHORIZED', message: 'Refresh failed' });

        await expect(apiClient.get('/bookings')).rejects.toBeTruthy();
        expect(tokenManager.clearToken).toHaveBeenCalled();
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('does not attempt a refresh loop for the login endpoint itself', async () => {
        mock.onPost('/auth/login').reply(401, {
            code: 'BAD_CREDENTIALS',
            message: 'Invalid email or password',
        });

        await expect(apiClient.post('/auth/login', {})).rejects.toMatchObject({
            code: 'BAD_CREDENTIALS',
        });
        // No refresh attempt should have been made.
        expect(rawMock.history.post.length).toBe(0);
    });

    it('rejects with the unwrapped ApiError body on non-401 failures', async () => {
        mock.onGet('/rooms/x').reply(404, {
            code: 'RESOURCE_NOT_FOUND',
            message: 'Room not found',
        });

        await expect(apiClient.get('/rooms/x')).rejects.toMatchObject({
            code: 'RESOURCE_NOT_FOUND',
            message: 'Room not found',
        });
    });
});
