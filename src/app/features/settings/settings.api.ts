import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { TargetLevel, User } from '../../core/auth/auth.models';
import { AnalysisResult } from '../write/analysis.models';

/** The fields of the profile the settings screen can change. `null` clears the target level. */
export interface ProfileChanges {
  display_name?: string;
  target_level?: TargetLevel | null;
}

/** Everything the API stores about the user (`GET /me/export`). */
export interface DataExport {
  exported_at: string;
  profile: User;
  texts: AnalysisResult[];
  usage: { day: string; analyses_count: number; generations_count: number }[];
}

/**
 * The account endpoints behind the settings screen. Errors are NOT silent: a failed save, export
 * or deletion has no place on the screen to explain itself, so the toast does it.
 */
@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly api = inject(ApiService);

  updateProfile(changes: ProfileChanges): Observable<User> {
    return this.api.patch<User>('/me', changes);
  }

  exportData(): Observable<DataExport> {
    return this.api.get<DataExport>('/me/export');
  }

  deleteAccount(): Observable<void> {
    return this.api.delete<void>('/me');
  }
}
