// Typed application errors thrown by services and mapped to one shape at
// the action or route boundary. Messages are plain English for the user.

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_found' | 'forbidden' | 'validation' | 'conflict' = 'validation'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find that.") {
    super(message, 'not_found');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have access to that.") {
    super(message, 'forbidden');
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Some of that information is missing or invalid.') {
    super(message, 'validation');
  }
}

export const FALLBACK_ERROR =
  "Something went wrong and your change didn't save. Please try again. If it keeps happening, refresh the page.";

const NETWORK_HINTS = ['failed to fetch', 'networkerror', 'load failed', 'fetch failed'];

export function friendlyError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  if (NETWORK_HINTS.some((h) => msg.includes(h))) {
    return "We couldn't reach the server, so nothing was saved. Check your connection and try again.";
  }
  return FALLBACK_ERROR;
}
