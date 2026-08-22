/**
 * Canonical application error classes for ForecourIQ DMS.
 *
 * Use these instead of plain Error() throws throughout the application.
 * API routes should catch these and map them to appropriate HTTP responses.
 */

export type ErrorCode =
  | 'AUTHENTICATION_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTEGRATION_UNAVAILABLE'
  | 'INTEGRATION_NOT_CONFIGURED'
  | 'INTEGRATION_NOT_IMPLEMENTED'
  | 'RATE_LIMITED'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly statusCode: number
  readonly isOperational: boolean

  constructor(message: string, code: ErrorCode, statusCode: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = true
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required.') {
    super(message, 'AUTHENTICATION_REQUIRED', 401)
    this.name = 'AuthenticationError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 'FORBIDDEN', 403)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found.`, 'NOT_FOUND', 404)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  readonly fields?: Record<string, string>

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 422)
    this.name = 'ValidationError'
    this.fields = fields
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
    this.name = 'ConflictError'
  }
}

export class IntegrationUnavailableError extends AppError {
  readonly provider: string
  readonly integrationStatus: 'unconfigured' | 'not_yet_implemented' | 'error' | 'disconnected'

  constructor(
    provider: string,
    status: 'unconfigured' | 'not_yet_implemented' | 'error' | 'disconnected' = 'unconfigured'
  ) {
    const messages: Record<string, string> = {
      unconfigured: `${provider} integration is not yet configured. Contact your administrator.`,
      not_yet_implemented: `${provider} integration is not yet available in this version of ForecourIQ.`,
      error: `${provider} integration encountered an error. Please try again or contact support.`,
      disconnected: `${provider} integration has been disconnected. Please reconnect in Settings > Integrations.`,
    }
    super(messages[status], 'INTEGRATION_UNAVAILABLE', 503)
    this.name = 'IntegrationUnavailableError'
    this.provider = provider
    this.integrationStatus = status
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please slow down.') {
    super(message, 'RATE_LIMITED', 429)
    this.name = 'RateLimitError'
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'A database error occurred.') {
    super(message, 'DATABASE_ERROR', 500)
    this.name = 'DatabaseError'
  }
}

/**
 * Convert an unknown caught value into a safe API { body, status } pair.
 * Use in API routes: const { body, status } = toApiErrorResponse(err)
 */
export function toApiErrorResponse(error: unknown): {
  body: { error: string; code: ErrorCode; fields?: Record<string, string> }
  status: number
} {
  if (error instanceof ValidationError) {
    return {
      body: { error: error.message, code: error.code, fields: error.fields },
      status: error.statusCode,
    }
  }
  if (error instanceof AppError && error.isOperational) {
    return {
      body: { error: error.message, code: error.code },
      status: error.statusCode,
    }
  }
  console.error('[ForecourIQ] Unexpected error:', error)
  return {
    body: { error: 'An unexpected error occurred. Please try again.', code: 'INTERNAL_ERROR' },
    status: 500,
  }
}

/**
 * Get the HTTP status code for an error.
 */
export function toStatusCode(error: unknown): number {
  if (error instanceof AppError) return error.statusCode
  return 500
}
