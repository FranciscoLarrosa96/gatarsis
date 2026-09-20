import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('uses the system preference only when the user has no saved selection', () => {
    const theme = TestBed.inject(ThemeService);

    expect(theme.isDark()).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('restores a saved light selection even when the system prefers dark', () => {
    localStorage.setItem('gatarsis-theme', 'light');

    const theme = TestBed.inject(ThemeService);

    expect(theme.isDark()).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists each explicit toggle', () => {
    localStorage.setItem('gatarsis-theme', 'light');
    const theme = TestBed.inject(ThemeService);

    theme.toggle();
    expect(theme.isDark()).toBe(true);
    expect(localStorage.getItem('gatarsis-theme')).toBe('dark');

    theme.toggle();
    expect(theme.isDark()).toBe(false);
    expect(localStorage.getItem('gatarsis-theme')).toBe('light');
  });
});
