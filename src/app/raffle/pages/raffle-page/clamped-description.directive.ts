import {
  AfterViewInit,
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';

/** Fade only when the rendered text actually exceeds the responsive line clamp. */
@Directive({
  selector: '[appClampedDescription]',
  standalone: true,
  host: { '[class.description-truncated]': 'truncated()' },
})
export class ClampedDescriptionDirective implements AfterViewInit, OnDestroy {
  readonly truncated = signal(false);
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private resize?: ResizeObserver;
  private mutation?: MutationObserver;
  private frame = 0;
  private readonly schedule = () => {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.truncated.set(this.element.scrollHeight > this.element.clientHeight + 1);
    });
  };
  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      if (typeof ResizeObserver !== 'undefined') {
        this.resize = new ResizeObserver(this.schedule);
        this.resize.observe(this.element);
      }
      this.mutation = new MutationObserver(this.schedule);
      this.mutation.observe(this.element, { childList: true, characterData: true, subtree: true });
      window.addEventListener('resize', this.schedule, { passive: true });
      this.schedule();
    });
  }
  ngOnDestroy(): void {
    this.resize?.disconnect();
    this.mutation?.disconnect();
    window.removeEventListener('resize', this.schedule);
    if (this.frame) cancelAnimationFrame(this.frame);
  }
}
