import { Component, inject } from '@angular/core';
import { AdminThemePreference, AdminThemeService } from '../core/admin-theme.service';

interface ThemeOption {
  value: AdminThemePreference;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-admin-theme-toggle',
  standalone: true,
  template: `<div class="toggle" role="group" aria-label="Tema de la interfaz">
    @for (option of options; track option.value) {
      <button
        type="button"
        [attr.aria-pressed]="theme.preference() === option.value"
        [attr.aria-label]="option.label"
        [title]="option.label"
        (click)="theme.set(option.value)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="option.icon" /></svg>
      </button>
    }
  </div>`,
  styles: `
    .toggle {
      display: inline-flex;
      gap: 0.15rem;
      padding: 0.2rem;
      border: 1px solid var(--adm-border);
      border-radius: 0.6rem;
      background: var(--adm-bg-sunken);
    }
    button {
      display: grid;
      place-items: center;
      width: 1.9rem;
      height: 1.9rem;
      border: 0;
      border-radius: 0.4rem;
      background: transparent;
      color: var(--adm-ink-muted);
      cursor: pointer;
      transition:
        background-color 150ms var(--adm-ease),
        color 150ms var(--adm-ease);
    }
    button:hover {
      color: var(--adm-ink);
    }
    button[aria-pressed='true'] {
      background: var(--adm-bg-raised);
      color: var(--adm-accent);
      box-shadow: var(--adm-shadow-card);
    }
    button:focus-visible {
      outline: 2px solid var(--adm-accent);
      outline-offset: 2px;
    }
    svg {
      width: 1.05rem;
      height: 1.05rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    @media (prefers-reduced-motion: reduce) {
      button {
        transition: none;
      }
    }
  `,
})
export class AdminThemeToggleComponent {
  readonly theme = inject(AdminThemeService);
  readonly options: readonly ThemeOption[] = [
    {
      value: 'light',
      label: 'Tema claro',
      icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
    },
    {
      value: 'dark',
      label: 'Tema oscuro',
      icon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    },
    {
      value: 'system',
      label: 'Igual que el sistema',
      icon: 'M3 4h18v12H3z M8 20h8 M12 16v4',
    },
  ];
}
