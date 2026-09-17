import { Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-admin-copy-id',
  standalone: true,
  template: `<span class="identifier">
      @if (showValue()) {
        <code [title]="value()">{{ value() }}</code>
      }
      <button type="button" [attr.aria-label]="'Copiar ' + label()" (click)="copy()">
        Copiar
      </button></span
    ><span class="result" aria-live="polite">{{ feedback() }}</span>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .identifier {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
    }
    code {
      font-family: var(--adm-font-mono);
      font-size: 0.78rem;
      overflow: auto;
      white-space: nowrap;
      min-width: 0;
    }
    button {
      flex: none;
      border: 1px solid var(--adm-border);
      border-radius: 0.25rem;
      background: transparent;
      color: var(--adm-ink-muted);
      font: inherit;
      font-size: 0.68rem;
      padding: 0.2rem 0.35rem;
      cursor: pointer;
    }
    button:hover {
      color: var(--adm-ink);
      border-color: var(--adm-border-strong);
    }
    button:focus-visible {
      outline: 2px solid var(--adm-accent);
      outline-offset: 3px;
    }
    .result {
      display: block;
      color: var(--adm-low);
      font-size: 0.7rem;
    }
  `,
})
export class AdminCopyIdComponent {
  readonly value = input.required<string>();
  readonly label = input('ID');
  readonly showValue = input(true);
  readonly feedback = signal('');
  async copy(): Promise<void> {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(this.value());
      this.feedback.set('Copiado');
    } catch {
      this.feedback.set('No se pudo copiar. Seleccioná el ID para copiarlo.');
    }
  }
}
