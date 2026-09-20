import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';

const THEME_STORAGE_KEY = 'gatarsis-theme';

type ThemePreference = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly isDark = signal(false);

  constructor() {
    const storedPreference = readStoredTheme();
    this.applyDarkMode(
      storedPreference
        ? storedPreference === 'dark'
        : (globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false),
    );
  }

  toggle(): void {
    const isDark = !this.isDark();
    this.applyDarkMode(isDark);
    persistTheme(isDark ? 'dark' : 'light');
  }

  private applyDarkMode(isDark: boolean): void {
    this.isDark.set(isDark);
    this.document.documentElement.classList.toggle('dark', isDark);
  }
}

function readStoredTheme(): ThemePreference | null {
  try {
    const value = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function persistTheme(preference: ThemePreference): void {
  try {
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // El almacenamiento puede estar bloqueado; el tema sigue aplicado durante esta sesión.
  }
}
