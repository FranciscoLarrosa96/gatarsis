import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, output } from '@angular/core';

@Directive({
  selector: '[appAdminDialog]',
  standalone: true,
  host: { tabindex: '-1', '(keydown)': 'onKeydown($event)' },
})
export class AdminDialogDirective implements AfterViewInit, OnDestroy {
  readonly dialogDismiss = output<void>();
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private previousFocus: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previousFocus = this.document.activeElement as HTMLElement | null;
    (this.controls()[0] ?? this.element).focus();
  }
  ngOnDestroy(): void {
    if (this.previousFocus?.isConnected) this.previousFocus.focus();
  }
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.dialogDismiss.emit();
    }
    if (event.key !== 'Tab') return;
    const controls = this.controls();
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      this.element.focus();
      return;
    }
    if (
      event.shiftKey &&
      (this.document.activeElement === first || this.document.activeElement === this.element)
    ) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  private controls(): HTMLElement[] {
    return Array.from(
      this.element.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    );
  }
}
