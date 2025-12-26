export class RallyRoundError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(message: string, statusCode: number, code: string, retryable = false) {
    super(message);
    this.name = 'RallyRoundError';
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
  }

  static fromResponse(statusCode: number, body: any): RallyRoundError {
    const code = body?.error?.code || 'UNKNOWN_ERROR';
    const message = body?.error?.message || 'An unknown error occurred';
    const retryable = statusCode === 503 || statusCode === 429;

    return new RallyRoundError(message, statusCode, code, retryable);
  }

  static networkError(message: string): RallyRoundError {
    return new RallyRoundError(message, 0, 'NETWORK_ERROR', true);
  }

  static timeout(): RallyRoundError {
    return new RallyRoundError('Request timed out', 0, 'TIMEOUT', true);
  }
}

// Error codes from API spec
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MODE_MISMATCH: 'MODE_MISMATCH',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;
