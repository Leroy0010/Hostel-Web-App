import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenManager } from './tokenManager';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { ApiError } from '@/types/api';

interface CustomAxiosConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Crucial for receiving/sending HTTP-Only refresh cookies
});

const performTokenRefresh = async (): Promise<string> => {
    const response = await axios.post(
        `${apiClient.defaults.baseURL}/auth/refresh`,
        {},
        {
            withCredentials: true,
        }
    );

    const dataPayload = response.data.success
        ? response.data.data
        : response.data;

    const newToken = dataPayload.token;

    tokenManager.setToken(newToken);

    return newToken;
};

tokenManager.registerRefreshService(performTokenRefresh);

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Request Interceptor: Inject In-Memory Bearer Token
apiClient.interceptors.request.use((config) => {
    const token = tokenManager.getToken();
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor: Flatten Wrapper & Handle Refresh Pipeline
// Response Interceptor: Flatten Wrapper & Handle Refresh Pipeline
apiClient.interceptors.response.use(
    (response) => {
        if (
            response.data &&
            Object.prototype.hasOwnProperty.call(response.data, 'success')
        ) {
            return response.data.data;
        }
        return response.data;
    },
    async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as CustomAxiosConfig;
        const apiError = error.response?.data;

        if (!originalRequest) return Promise.reject(error);

        const isLoginRequest = originalRequest.url?.includes('/auth/login');
        const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');

        // ── 1. Token Refresh Logic (401s) ───────────────────────────────────
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isLoginRequest &&
            !isRefreshRequest
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;
            useAuthStore.getState().setRefreshing(true);

            try {
                const response = await axios.post(
                    `${apiClient.defaults.baseURL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const dataPayload = response.data.success
                    ? response.data.data
                    : response.data;
                const newToken = dataPayload.token;

                tokenManager.setToken(newToken);
                processQueue(null, newToken);

                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as Error, null);
                useAuthStore.getState().clearAuth();

                // FIXED: Use startsWith for dynamic routes like /hostels/:id
                const path = window.location.pathname;
                const isPublicRoute =
                    path === '/' ||
                    path === '/login' ||
                    path === '/map' ||
                    path.startsWith('/hostels');

                if (!isPublicRoute) {
                    toast.error('Session expired. Please log in again.');
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
                useAuthStore.getState().setRefreshing(false);
            }
        }

        // ── 2. Global Network & Server Error Logic ──────────────────────────

        // FIXED: Moved outside the 401 block so it catches all network drops
        if (error.code === 'ERR_NETWORK') {
            toast.error(
                'Network error. Please check your internet connection or try again later.'
            );
            return Promise.reject(error);
        }

        // FIXED: Moved outside to catch all 500+ server crashes
        if (!apiError && error.response && error.response.status >= 500) {
            toast.error(
                'Our servers are currently experiencing issues. Please try again.'
            );
        }

        return Promise.reject(apiError || error);
    }
);
