import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/** Hero-only motion: no Angular work per pointer/scroll event, no permanent RAF loop. */
@Directive({ selector: '[appHeroMotion]', standalone: true })
export class HeroMotionDirective implements AfterViewInit, OnDestroy {
  private readonly element: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private cleanup: (() => void) | undefined;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const desktop = window.matchMedia(
        '(min-width: 1024px) and (hover: hover) and (pointer: fine)',
      );
      let visible = true;
      let frame = 0;
      let x = 0,
        y = 0,
        targetX = 0,
        targetY = 0,
        scroll = 0,
        targetScroll = 0;
      let bounds = this.element.getBoundingClientRect();
      let documentTop = bounds.top + window.scrollY;
      const reset = () => {
        x = y = targetX = targetY = scroll = targetScroll = 0;
        for (const name of ['--hero-x', '--hero-y', '--hero-scroll'])
          this.element.style.removeProperty(name);
      };
      const active = () => visible && !document.hidden && !reduced.matches;
      const tick = () => {
        frame = 0;
        if (!active()) return;
        x += (targetX - x) * 0.09;
        y += (targetY - y) * 0.09;
        scroll += (targetScroll - scroll) * 0.09;
        this.element.style.setProperty('--hero-x', `${x.toFixed(3)}px`);
        this.element.style.setProperty('--hero-y', `${y.toFixed(3)}px`);
        this.element.style.setProperty('--hero-scroll', `${scroll.toFixed(3)}px`);
        if (Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(targetScroll - scroll) > 0.025)
          schedule();
      };
      const schedule = () => {
        if (!frame && active()) frame = requestAnimationFrame(tick);
      };
      const measure = () => {
        bounds = this.element.getBoundingClientRect();
        documentTop = bounds.top + window.scrollY;
      };
      const move = (event: PointerEvent) => {
        if (!desktop.matches || !active() || event.pointerType !== 'mouse') return;
        // Cached geometry: pointer movement never reads layout.
        const top = documentTop - window.scrollY;
        targetX =
          Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)) * 7;
        targetY = Math.max(-1, Math.min(1, ((event.clientY - top) / bounds.height) * 2 - 1)) * 7;
        schedule();
      };
      const leave = () => {
        targetX = targetY = 0;
        schedule();
      };
      const onScroll = () => {
        // Scroll depth on desktop/tablet only; the text remains stationary.
        targetScroll =
          window.innerWidth >= 768
            ? Math.max(
                0,
                Math.min(1, (window.scrollY - documentTop) / Math.max(1, bounds.height)),
              ) * 10
            : 0;
        schedule();
      };
      const sync = () => {
        if (reduced.matches || !desktop.matches) {
          leave();
          if (reduced.matches) reset();
        }
        this.element.classList.toggle('hero-motion-paused', !active());
        if (!active() && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else onScroll();
      };
      const resize = () => {
        measure();
        sync();
      };
      const observer =
        typeof IntersectionObserver === 'undefined'
          ? null
          : new IntersectionObserver(([entry]) => {
              visible = entry.isIntersecting;
              sync();
            });
      observer?.observe(this.element);
      this.element.addEventListener('pointermove', move, { passive: true });
      this.element.addEventListener('pointerleave', leave, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', resize, { passive: true });
      document.addEventListener('visibilitychange', sync);
      reduced.addEventListener('change', sync);
      desktop.addEventListener('change', sync);
      sync();
      this.cleanup = () => {
        if (frame) cancelAnimationFrame(frame);
        observer?.disconnect();
        this.element.removeEventListener('pointermove', move);
        this.element.removeEventListener('pointerleave', leave);
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', sync);
        reduced.removeEventListener('change', sync);
        desktop.removeEventListener('change', sync);
        reset();
      };
    });
  }

  ngOnDestroy(): void {
    this.cleanup?.();
  }
}
