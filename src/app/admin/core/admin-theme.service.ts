import { Injectable, signal } from '@angular/core';

export type AdminThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'gatarsis-admin-theme';
const DEFAULT_PREFERENCE: AdminThemePreference = 'dark';

function readStoredPreference(): AdminThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : DEFAULT_PREFERENCE;
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

@Injectable({ providedIn: 'root' })
export class AdminThemeService {
  readonly preference = signal<AdminThemePreference>(readStoredPreference());

  set(preference: AdminThemePreference): void {
    this.preference.set(preference);
    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage can be blocked; the choice still applies for this session.
    }
  }
}
