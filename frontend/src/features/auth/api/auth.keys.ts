export const authKeys = {
    all: ['auth'] as const,


    verifyEmail: (token?: string) =>
        [...authKeys.all, 'verify-email', token] as const,
};