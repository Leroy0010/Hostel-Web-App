export interface ApiResponse<T = void> {
  timestamp: string;
  success: boolean;
  message: string;
  data: T;
}

export type ErrorCode =
  | 'RESOURCE_NOT_FOUND'
  | 'ROOM_FULLY_OCCUPIED'
  | 'BOOKING_ALREADY_EXISTS'
  | 'INVALID_BOOKING_TRANSITION'
  | 'ALREADY_ON_WAITLIST'
  | 'DUPLICATE_ROOM_NUMBER'
  | 'PAYMENT_FAILED'
  | 'FORBIDDEN'
  | 'USER_DEACTIVATED'
  | 'UNAUTHORIZED'
  | 'INVALID_TOKEN'
  | 'BAD_CREDENTIALS'
  | 'VALIDATION_FAILED'
  | 'ILLEGAL_ARGUMENT'
  | 'ILLEGAL_STATE'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_SERVER_ERROR';

export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details?: Record<string, string[]>;
  code: ErrorCode;
}