import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminDialogDirective } from './admin-dialog.directive';

@Component({
  standalone: true,
  imports: [AdminDialogDirective],
  template: `<section appAdminDialog (dialogDismiss)="dismissed = true">
    <button>Primero</button><button>Último</button>
  </section>`,
})
class DialogTestComponent {
  dismissed = false;
}

describe('AdminDialogDirective', () => {
  it('focuses the first control, traps Tab in both directions and dismisses with Escape', () => {
    const fixture = TestBed.createComponent(DialogTestComponent);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('section') as HTMLElement;
    const [first, last] = Array.from(dialog.querySelectorAll('button'));
    expect(document.activeElement).toBe(first);
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(first);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.dismissed).toBe(true);
    fixture.destroy();
  });
});
