import { ADMIN_ROUTES } from './admin.routes';
import { adminGuard } from './core/admin.guard';

describe('admin routes', () => {
  it('resolves manual sales before the dynamic order detail route', () => {
    const children = ADMIN_ROUTES.find(route => route.path === '')!.children!;
    const manual = children.findIndex(route => route.path === 'orders/nueva-venta-manual');
    expect(manual).toBeGreaterThan(-1);
    expect(manual).toBeLessThan(children.findIndex(route => route.path === 'orders/:orderId'));
    expect(children[manual].loadComponent).toBeDefined();
  });
  it('registers the simple payments view under the existing authenticated shell', () => {
    const shell = ADMIN_ROUTES.find((route) => route.path === '');
    expect(shell?.canActivate).toContain(adminGuard);
    expect(shell?.children?.find((route) => route.path === 'pagos')?.loadComponent).toBeDefined();
    expect(shell?.children?.find((route) => route.path === 'payments')?.loadComponent).toBeDefined();
  });
});
