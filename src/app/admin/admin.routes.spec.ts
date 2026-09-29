import { ADMIN_ROUTES } from './admin.routes';
import { adminGuard } from './core/admin.guard';

describe('admin routes', () => {
  it('registers the simple payments view under the existing authenticated shell', () => {
    const shell = ADMIN_ROUTES.find((route) => route.path === '');
    expect(shell?.canActivate).toContain(adminGuard);
    expect(shell?.children?.find((route) => route.path === 'pagos')?.loadComponent).toBeDefined();
    expect(shell?.children?.find((route) => route.path === 'payments')?.loadComponent).toBeDefined();
  });
});
