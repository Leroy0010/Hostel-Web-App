export const authKeys = {
    all: ['auth'] as const,

    me: () => [...authKeys.all, 'me'] as const,

    verifyEmail: (token?: string) =>
        [...authKeys.all, 'verify-email', token] as const,
};