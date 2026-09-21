import { User } from '../app/core/auth/auth.models';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'ana@example.com',
    display_name: 'Ana',
    ui_language: 'es',
    theme_preference: 'system',
    target_level: null,
    created_at: '2026-09-21T10:00:00Z',
    ...overrides,
  };
}

/** The body the API returns on failure. */
export function apiErrorBody(code: string, details: Record<string, unknown> = {}) {
  return { error: { code, message: 'server message (never shown)', details } };
}
