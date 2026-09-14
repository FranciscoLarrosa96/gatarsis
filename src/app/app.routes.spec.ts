import { routes } from './app.routes';

describe('public commerce routes', () => {
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
