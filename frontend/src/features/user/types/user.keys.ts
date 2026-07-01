export const userKeys = {
    all: ['user'] as const,
    managers: () => [...userKeys.all, 'manager'] as const,

    me: () => [...userKeys.all, 'me'] as const,

   
};