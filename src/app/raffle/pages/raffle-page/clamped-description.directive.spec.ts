import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClampedDescriptionDirective } from './clamped-description.directive';

@Component({
  imports: [ClampedDescriptionDirective],
  template: '<p appClampedDescription>Descripción</p>',
})
class ClampHost {}

describe('ClampedDescriptionDirective', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('adds a fade only when the measured text overflows and rechecks after resize', () => {
    let callback: FrameRequestCallback;
    vi.stubGlobal('requestAnimationFrame', (value: FrameRequestCallback) => {
      callback = value;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const fixture = TestBed.createComponent(ClampHost);
    fixture.detectChanges();
    const paragraph = fixture.nativeElement.querySelector('p');
    let height = 300;
    Object.defineProperty(paragraph, 'scrollHeight', { get: () => height });
    Object.defineProperty(paragraph, 'clientHeight', { get: () => 168 });
    callback!(0);
    fixture.detectChanges();
    expect(paragraph.classList.contains('description-truncated')).toBe(true);
    height = 84;
    window.dispatchEvent(new Event('resize'));
    callback!(0);
    fixture.detectChanges();
    expect(paragraph.classList.contains('description-truncated')).toBe(false);
    fixture.destroy();
  });
});
