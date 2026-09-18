import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HeroMotionDirective } from './hero-motion.directive';

@Component({ imports: [HeroMotionDirective], template: '<section appHeroMotion></section>' })
class MotionHost {}

describe('HeroMotionDirective', () => {
  let reduced = false;
  let desktop = true;
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let changes: Set<() => void>;
  beforeEach(() => {
    reduced = false;
    desktop = true;
    nextFrame = 0;
    frames = new Map();
    changes = new Set();
    vi.stubGlobal('matchMedia', (query: string) => ({
      get matches() {
        return query.includes('reduced-motion') ? reduced : desktop;
      },
      addEventListener: (_: string, callback: () => void) => changes.add(callback),
      removeEventListener: (_: string, callback: () => void) => changes.delete(callback),
    }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('IntersectionObserver', undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  function setup() {
    const fixture = TestBed.createComponent(MotionHost);
    fixture.detectChanges();
    const hero = fixture.nativeElement.querySelector('section') as HTMLElement;
    const measure = vi
      .spyOn(hero, 'getBoundingClientRect')
      .mockReturnValue({ left: 0, top: 0, width: 1000, height: 800 } as DOMRect);
    window.dispatchEvent(new Event('resize'));
    return { fixture, hero, measure };
  }
  function pointer(hero: HTMLElement) {
    const event = new MouseEvent('pointermove', { clientX: 1000, clientY: 800 });
    Object.defineProperty(event, 'pointerType', { value: 'mouse' });
    hero.dispatchEvent(event);
  }
  function settle() {
    for (let index = 0; index < 150 && frames.size; index++) {
      const queued = Array.from(frames.values());
      frames.clear();
      queued.forEach((callback) => callback(index * 16));
    }
  }
  it('smooths a bounded desktop parallax without reading layout per pointer event or leaving a RAF loop', () => {
    const { fixture, hero, measure } = setup();
    const reads = measure.mock.calls.length;
    pointer(hero);
    settle();
    expect(parseFloat(hero.style.getPropertyValue('--hero-x'))).toBeGreaterThan(6.9);
    expect(parseFloat(hero.style.getPropertyValue('--hero-x'))).toBeLessThanOrEqual(7);
    expect(measure).toHaveBeenCalledTimes(reads);
    expect(frames.size).toBe(0);
    hero.dispatchEvent(new Event('pointerleave'));
    settle();
    expect(Math.abs(parseFloat(hero.style.getPropertyValue('--hero-x')))).toBeLessThan(0.03);
    fixture.destroy();
    expect(changes.size).toBe(0);
  });
  it('disables pointer parallax on tablet/mobile', () => {
    desktop = false;
    const { fixture, hero } = setup();
    settle();
    pointer(hero);
    settle();
    expect(parseFloat(hero.style.getPropertyValue('--hero-x')) || 0).toBe(0);
    fixture.destroy();
  });
  it('respects reduced motion and reacts when the preference changes at runtime', () => {
    const { fixture, hero } = setup();
    pointer(hero);
    settle();
    reduced = true;
    changes.forEach((callback) => callback());
    pointer(hero);
    expect(hero.style.getPropertyValue('--hero-x')).toBe('');
    expect(frames.size).toBe(0);
    fixture.destroy();
  });
  it('cancels pending frames and removes listeners on route teardown', () => {
    const { fixture, hero } = setup();
    pointer(hero);
    expect(frames.size).toBeGreaterThan(0);
    fixture.destroy();
    pointer(hero);
    expect(frames.size).toBe(0);
    expect(hero.style.getPropertyValue('--hero-x')).toBe('');
  });
});
