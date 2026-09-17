import { routes } from './app.routes';

describe('public commerce routes', () => {
  it.each([
    'rifa/checkout/success',
    'rifa/checkout/pending',
    'rifa/checkout/failure',
    'checkout/success',
    'checkout/pending',
    'checkout/failure',
  ])('keeps the %s return registered before the wildcard', (path) => {
    const routeIndex = routes.findIndex((route) => route.path === path);
    expect(routeIndex).toBeGreaterThanOrEqual(0);
    expect(routeIndex).toBeLessThan(routes.findIndex((route) => route.path === '**'));
    expect(routes[routeIndex].loadComponent).toBeDefined();
  });

  it('registers shop, cart and checkout deep links before wildcard', () => {
    const paths = routes.map((route) => route.path);
    expect(paths).toContain('tienda');
    expect(paths).toContain('tienda/:slug');
    expect(paths).toContain('carrito');
    expect(paths).toContain('rifa');
    expect(paths).toContain('adopciones');
    expect(paths).toContain('rifa/checkout/success');
    expect(paths).toContain('rifa/checkout/pending');
    expect(paths).toContain('rifa/checkout/failure');
    expect(paths).toContain('checkout/success');
    expect(paths).toContain('checkout/pending');
    expect(paths).toContain('checkout/failure');
    expect(paths.indexOf('checkout/success')).toBeLessThan(paths.indexOf('**'));
    expect(paths.indexOf('carrito')).toBeLessThan(paths.indexOf('**'));
    expect(paths.indexOf('adopciones')).toBeLessThan(paths.indexOf('**'));
  });
});
