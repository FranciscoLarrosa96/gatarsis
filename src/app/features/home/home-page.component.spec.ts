import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PUBLIC_API_BASE_URL, PublicProduct } from '../../shop/core/commerce.models';
import { HomePageComponent } from './home-page.component';

describe('Home product carousel', () => {
  let component: HomePageComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    component = TestBed.runInInjectionContext(() => new HomePageComponent());
    http = TestBed.inject(HttpTestingController);
    component.ngOnInit();
  });

  afterEach(() => http.verify());

  it('uses current product covers and slugs instead of static merchandise mocks', () => {
    const product: PublicProduct = {
      id: 'new-shirt', slug: 'remera-gatarsis', name: 'Remera Gatarsis', variants: [],
      media: [
        { id: 'other', url: 'https://cdn.test/back.jpg', alt: 'Dorso', sortOrder: 0, isCover: false },
        { id: 'cover', url: 'https://cdn.test/front.jpg', alt: 'Frente', sortOrder: 1, isCover: true },
      ],
    };
    http.expectOne(`${PUBLIC_API_BASE_URL}/products`).flush([
      product, { ...product, id: 'no-image', slug: 'no-image', media: [] },
    ]);
    expect(component['productCarousel']()).toEqual([
      { src: 'https://cdn.test/front.jpg', alt: 'Frente', slug: 'remera-gatarsis', name: 'Remera Gatarsis' },
      { src: 'https://cdn.test/front.jpg', alt: 'Frente', slug: 'remera-gatarsis', name: 'Remera Gatarsis' },
    ]);
    expect(component['productsLoading']()).toBe(false);
  });

  it('does not restore old mocks when the catalog is empty', () => {
    http.expectOne(`${PUBLIC_API_BASE_URL}/products`).flush([]);
    expect(component['productCarousel']()).toEqual([]);
    expect(component['productsLoading']()).toBe(false);
  });

  it('keeps the home usable when the catalog request fails', () => {
    http.expectOne(`${PUBLIC_API_BASE_URL}/products`).flush(null, { status: 503, statusText: 'Unavailable' });
    expect(component['productCarousel']()).toEqual([]);
    expect(component['productsLoading']()).toBe(false);
  });
});
