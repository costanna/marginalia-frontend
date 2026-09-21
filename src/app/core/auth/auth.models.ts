import { SupportedLang } from '../i18n/supported-languages';
import { ThemePreference } from '../theme/theme.service';

export type TargetLevel = 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** The signed-in user's profile (`GET /me`). */
export interface User {
  id: string;
  email: string;
  display_name: string;
  ui_language: SupportedLang;
  theme_preference: ThemePreference;
  target_level: TargetLevel | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  display_name: string;
  ui_language: SupportedLang;
}
