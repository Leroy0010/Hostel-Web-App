import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
    exp: number;
}

type RefreshTokenFunction = () => Promise<string>;

class TokenManager {
    private accessToken: string | null = null;
    private refreshTimeoutId: number | null = null;
    private refreshCallback: RefreshTokenFunction | null = null;

    private static instance: TokenManager;

    private constructor() {}

    public static getInstance(): TokenManager {
        if (!TokenManager.instance) {
            TokenManager.instance = new TokenManager();
        }

        return TokenManager.instance;
    }

    public registerRefreshService(fn: RefreshTokenFunction) {
        this.refreshCallback = fn;
    }

    public getToken(): string | null {
        return this.accessToken;
    }

    public setToken(token: string | null) {
        this.accessToken = token;
        this.scheduleRefresh();
    }

    public clearToken() {
        this.accessToken = null;

        if (this.refreshTimeoutId) {
            clearTimeout(this.refreshTimeoutId);
            this.refreshTimeoutId = null;
        }
    }

    public async refresh(): Promise<string> {
        if (!this.refreshCallback) {
            throw new Error('No refresh service registered');
        }

        return this.refreshCallback();
    }

    private scheduleRefresh() {
        if (this.refreshTimeoutId) {
            clearTimeout(this.refreshTimeoutId);
            this.refreshTimeoutId = null;
        }

        if (!this.accessToken) return;

        try {
            const decoded = jwtDecode<JwtPayload>(this.accessToken);

            if (!decoded.exp) return;

            const expiresInMs = decoded.exp * 1000 - Date.now();

            const REFRESH_BUFFER = 60 * 1000;

            const delay = expiresInMs - REFRESH_BUFFER;

            if (delay > 0) {
                this.refreshTimeoutId = window.setTimeout(
                    () => this.performRefresh(),
                    delay
                );
            } else {
                setTimeout(() => this.performRefresh(), 1000);
            }
        } catch (error) {
            console.error('Token decode failed', error);
        }
    }

    private async performRefresh() {
        if (!this.refreshCallback) return;

        try {
            await this.refreshCallback();
        } catch (error) {
            console.error('Scheduled refresh failed', error);

            this.clearToken();

            window.location.href = '/login';
        }
    }
}

export const tokenManager = TokenManager.getInstance();
