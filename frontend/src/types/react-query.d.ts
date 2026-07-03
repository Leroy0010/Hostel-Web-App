import '@tanstack/react-query';
import { ApiError } from './path-to-your-api-error'; // Adjust the import path

declare module '@tanstack/react-query' {
    interface Register {
        defaultError: ApiError;
    }
}
