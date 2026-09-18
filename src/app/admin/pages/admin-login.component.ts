import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuthStore } from '../core/admin-auth.store';
import { AdminThemeService } from '../core/admin-theme.service';
import { AdminThemeToggleComponent } from '../shared/admin-theme-toggle.component';

@Component({
  standalone: true,
  imports: [FormsModule, AdminThemeToggleComponent],
  template: `<main class="login" [attr.data-theme]="theme.preference()">
    <div class="theme-corner"><app-admin-theme-toggle /></div>
    <form (ngSubmit)="submit()" #form="ngForm" class="chart-card">
      <div class="chart-card-tab">Ficha de acceso</div>
      <p class="brand">Gatarsis</p>
      <h1>Administración</h1>
      <p class="muted">Ingresá con tu cuenta de administración.</p>
      <label
        >Email<input
          name="email"
          type="email"
          autocomplete="username"
          required
          [(ngModel)]="email" /></label
      ><label
        >Contraseña<input
          name="password"
          type="password"
          autocomplete="current-password"
          required
          minlength="14"
          [(ngModel)]="password"
      /></label>
      @if (error()) {
        <p class="error" aria-live="polite">{{ error() }}</p>
      }
      <button
        class="button-primary"
        [disabled]="form.invalid || auth.status() === 'authenticating'"
      >
        {{ auth.status() === 'authenticating' ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>
  </main>`,
  styleUrls: ['../shared/admin-tokens.css'],
  styles: `
    .login {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background:
        radial-gradient(900px 420px at 15% -10%, color-mix(in srgb, var(--adm-accent) 8%, transparent), transparent 60%),
        var(--adm-bg);
      color: var(--adm-ink);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }

    .theme-corner {
      position: fixed;
      top: 1rem;
      right: 1rem;
    }

    .chart-card {
      position: relative;
      width: min(100%, 24rem);
      padding: 2.5rem 2rem 2rem;
      border: 1px solid var(--adm-border);
      border-radius: 0.35rem 0.9rem 0.9rem 0.9rem;
      background: var(--adm-bg-raised);
      box-shadow: var(--adm-shadow-pop);
    }

    .chart-card-tab {
      position: absolute;
      top: -1px;
      left: -1px;
      border: 1px solid var(--adm-border);
      border-bottom: 0;
      border-radius: 0.6rem 0.6rem 0 0;
      background: var(--adm-bg-raised);
      padding: 0.4rem 0.9rem;
      font-family: var(--adm-font-mono);
      font-size: 0.62rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--adm-accent);
      transform: translateY(-100%);
    }

    .brand {
      font-family: var(--adm-font-display);
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--adm-accent);
      margin: 0;
    }

    h1 {
      margin: 0.2rem 0 0;
      font-family: var(--adm-font-display);
      font-size: 1.7rem;
      letter-spacing: -0.01em;
    }

    .muted {
      color: var(--adm-ink-muted);
      font-size: 0.9rem;
      margin: 0.4rem 0 0;
    }

    label {
      display: grid;
      gap: 0.35rem;
      margin-top: 1.25rem;
      font-size: 0.82rem;
      font-weight: 700;
    }

    input {
      padding: 0.7rem 0.75rem;
      border: 1px solid var(--adm-border-strong);
      border-radius: 0.5rem;
      background: color-mix(in srgb, var(--adm-bg-raised) 90%, transparent);
      color: var(--adm-ink);
      font: inherit;
    }

    input:focus-visible {
      outline: 2px solid var(--adm-accent);
      outline-offset: 1px;
      border-color: var(--adm-accent);
    }

    button {
      border: 0;
      border-radius: 0.5rem;
      padding: 0.8rem 1rem;
      font: inherit;
      font-weight: 700;
      margin-top: 1.5rem;
      width: 100%;
      cursor: pointer;
      background: var(--adm-accent);
      color: var(--adm-bg-raised);
      transition: background-color 0.15s ease;
    }

    button:hover:not(:disabled) {
      background: var(--adm-accent-hover);
    }

    button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .error {
      margin: 1rem 0 0;
      padding: 0.6rem 0.75rem;
      border-radius: 0.4rem;
      background: var(--adm-critical-bg);
      color: var(--adm-critical);
      font-size: 0.85rem;
      font-weight: 700;
    }
  `,
})
export class AdminLoginComponent {
  email = '';
  password = '';
  readonly error = signal('');
  constructor(
    readonly auth: AdminAuthStore,
    private readonly router: Router,
    readonly theme: AdminThemeService,
  ) {}
  submit() {
    this.error.set('');
    this.auth
      .login(this.email, this.password)
      .subscribe({
        next: () => void this.router.navigate(['/admin/dashboard']),
        error: () => this.error.set('No pudimos validar tus credenciales.'),
      });
  }
}
