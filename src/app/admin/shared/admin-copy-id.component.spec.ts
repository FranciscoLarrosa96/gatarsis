import { TestBed } from '@angular/core/testing';
import { AdminCopyIdComponent } from './admin-copy-id.component';

describe('AdminCopyIdComponent', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
  });
  it('copies the complete identifier and announces success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const fixture = TestBed.createComponent(AdminCopyIdComponent);
    fixture.componentRef.setInput('value', 'full-id-not-truncated');
    await fixture.componentInstance.copy();
    expect(writeText).toHaveBeenCalledWith('full-id-not-truncated');
    expect(fixture.componentInstance.feedback()).toBe('Copiado');
  });
  it('reports a clipboard failure instead of falsely confirming a copy', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const fixture = TestBed.createComponent(AdminCopyIdComponent);
    fixture.componentRef.setInput('value', 'id');
    await fixture.componentInstance.copy();
    expect(fixture.componentInstance.feedback()).toContain('No se pudo copiar');
  });
});
