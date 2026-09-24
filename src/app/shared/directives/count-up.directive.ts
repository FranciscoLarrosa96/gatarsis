import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input } from '@angular/core';

/**
 * Counts the element's text up to `appCountUp` the first time it scrolls into view.
 * The server-rendered/initial text is the final value, so without motion nothing changes.
 */
@Directive({ selector: '[appCountUp]' })
export class CountUpDirective implements OnDestroy {
  readonly appCountUp = input.required<number>();
  readonly countUpFormat = input<(value: number) => string>((value) => String(value));
  readonly countUpDuration = input(1400);
  readonly countUpDelay = input(0);

  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private observer?: IntersectionObserver;
  private frame = 0;
  private timeout = 0;

  constructor() {
    afterNextRender(() => this.zone.runOutsideAngular(() => this.initialize()));
  }

  private initialize(): void {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const textNode = Array.from(this.element.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue?.trim(),
    );
    if (reduced || !textNode || !('IntersectionObserver' in window)) return;

    const target = this.appCountUp();
    const format = this.countUpFormat();
    const finalText = textNode.nodeValue ?? '';
    const leading = finalText.match(/^\s*/)?.[0] ?? '';
    const trailing = finalText.match(/\s*$/)?.[0] ?? '';
    const write = (value: number) => (textNode.nodeValue = `${leading}${format(value)}${trailing}`);

    write(0);
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        this.observer?.disconnect();
        this.timeout = window.setTimeout(() => {
          const start = performance.now();
          const duration = this.countUpDuration();
          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 4);
            write(Math.round(target * eased));
            if (progress < 1) this.frame = requestAnimationFrame(tick);
            else textNode.nodeValue = finalText;
          };
          this.frame = requestAnimationFrame(tick);
        }, this.countUpDelay());
      },
      { threshold: 0.4 },
    );
    this.observer.observe(this.element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    clearTimeout(this.timeout);
    cancelAnimationFrame(this.frame);
  }
}
