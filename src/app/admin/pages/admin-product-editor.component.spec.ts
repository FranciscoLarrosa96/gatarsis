import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { ADMIN_API_BASE_URL } from '../core/admin-api.config';
import { AdminProductDetail } from '../core/admin.models';
import { AdminProductEditorComponent } from './admin-product-editor.component';

describe('AdminProductEditorComponent ProductMedia UX', () => {
  let fixture: ComponentFixture<AdminProductEditorComponent>;
  let component: AdminProductEditorComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductEditorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map() } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductEditorComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    component.id = 'product-id';
  });

  afterEach(() => http.verify());

  it('does not request media creation when the URL is valid but description is empty', () => {
    component.media.set({ id: null, url: 'https://cdn.test/taza.jpg', alt: '', sortOrder: 0, isCover: false });

    component.saveMedia();

    expect(component.mediaError()).toBe('Ingresá una descripción de la imagen.');
    http.expectNone(`${ADMIN_API_BASE_URL}/products/product-id/media`);
  });

  it('does not request media creation when description contains only spaces', () => {
    component.media.set({ id: null, url: 'https://cdn.test/taza.jpg', alt: '   ', sortOrder: 0, isCover: false });

    component.saveMedia();

    expect(component.mediaError()).toBe('Ingresá una descripción de la imagen.');
    http.expectNone(`${ADMIN_API_BASE_URL}/products/product-id/media`);
  });

  it('posts media with the real contract when URL and description are valid', () => {
    component.media.set({
      id: null,
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 2,
      isCover: true,
    });

    component.saveMedia();

    const request = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/media`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 2,
      isCover: true,
    });
    request.flush({
      id: 'media-id',
      productId: 'product-id',
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 2,
      isCover: true,
      createdAt: '2026-01-01T00:00:00Z',
    });
    http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`).flush(productDetail());
  });

  it('sends the media description trimmed in the alt contract field', () => {
    component.media.set({
      id: null,
      url: 'https://cdn.test/taza.jpg',
      alt: '  Taza Gatarsis color lila con logo blanco  ',
      sortOrder: 2,
      isCover: true,
    });

    component.saveMedia();

    const request = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/media`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 2,
      isCover: true,
    });
    request.flush({
      id: 'media-id',
      productId: 'product-id',
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 2,
      isCover: true,
      createdAt: '2026-01-01T00:00:00Z',
    });
    http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`).flush(productDetail());
  });

  it('shows backend validation errors inside the media form', () => {
    component.media.set({
      id: null,
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 0,
      isCover: false,
    });

    component.saveMedia();

    const request = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/media`);
    request.flush(
      { message: 'alt must be longer than or equal to 1 characters' },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(component.mediaError()).toBe('alt must be longer than or equal to 1 characters');
    expect(component.notice()).toBeNull();
  });

  it('does not create a new product when initial image URL is valid but description is empty', () => {
    component.id = null;
    component.model = validProductForm();
    component.initialMedia.set({
      id: null,
      url: 'https://cdn.test/taza.jpg',
      alt: '',
      sortOrder: 0,
      isCover: true,
    });

    component.saveProduct();

    expect(component.initialMediaError()).toBe('Ingresá una descripción de la imagen.');
    http.expectNone(`${ADMIN_API_BASE_URL}/products`);
  });

  it('does not create a new product when initial image description contains only spaces', () => {
    component.id = null;
    component.model = validProductForm();
    component.initialMedia.set({
      id: null,
      url: 'https://cdn.test/taza.jpg',
      alt: '   ',
      sortOrder: 0,
      isCover: true,
    });

    component.saveProduct();

    expect(component.initialMediaError()).toBe('Ingresá una descripción de la imagen.');
    http.expectNone(`${ADMIN_API_BASE_URL}/products`);
  });

  it('creates a product and then posts the initial image with the real media contract', () => {
    component.id = null;
    component.model = validProductForm();
    component.initialMedia.set({
      id: null,
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 3,
      isCover: true,
    });

    component.saveProduct();

    const productRequest = http.expectOne(`${ADMIN_API_BASE_URL}/products`);
    expect(productRequest.request.method).toBe('POST');
    productRequest.flush(productDetail());

    const mediaRequest = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/media`);
    expect(mediaRequest.request.method).toBe('POST');
    expect(mediaRequest.request.body).toEqual({
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 3,
      isCover: true,
    });
    mediaRequest.flush({
      id: 'media-id',
      productId: 'product-id',
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 3,
      isCover: true,
      createdAt: '2026-01-01T00:00:00Z',
    });
    http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`).flush(productDetail());
  });

  it('sends the initial image description trimmed in the alt contract field', () => {
    component.id = null;
    component.model = validProductForm();
    component.initialMedia.set({
      id: null,
      url: 'https://cdn.test/taza.jpg',
      alt: '  Taza Gatarsis color lila con logo blanco  ',
      sortOrder: 3,
      isCover: true,
    });

    component.saveProduct();

    http.expectOne(`${ADMIN_API_BASE_URL}/products`).flush(productDetail());
    const mediaRequest = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/media`);
    expect(mediaRequest.request.body).toEqual({
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 3,
      isCover: true,
    });
    mediaRequest.flush({
      id: 'media-id',
      productId: 'product-id',
      url: 'https://cdn.test/taza.jpg',
      alt: 'Taza Gatarsis color lila con logo blanco',
      sortOrder: 3,
      isCover: true,
      createdAt: '2026-01-01T00:00:00Z',
    });
    http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`).flush(productDetail());
  });

  it('keeps product media section scoped to general media only', () => {
    component.product.set(
      productDetail({
        media: [
          {
            id: 'general-media',
            productId: 'product-id',
            variantId: null,
            url: 'https://cdn.test/general.jpg',
            alt: 'General',
            sortOrder: 0,
            isCover: true,
            createdAt: '2026-01-01T00:00:00Z',
          },
          {
            id: 'variant-media',
            productId: 'product-id',
            variantId: 'variant-id',
            url: 'https://cdn.test/variant.jpg',
            alt: 'Variante',
            sortOrder: 0,
            isCover: true,
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
      }),
    );

    expect(component.generalMedia().map((item) => item.id)).toEqual(['general-media']);
    expect(component.variantMedia('variant-id').map((item) => item.id)).toEqual(['variant-media']);
  });

  it('creates variant media with the current variant id and no manual UUID field', () => {
    component.media.set({
      id: null,
      variantId: 'variant-id',
      url: 'https://cdn.test/lila.jpg',
      alt: 'Llavero Gatarsis color lila',
      sortOrder: 1,
      isCover: true,
    });

    component.saveMedia();

    const request = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/media`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      url: 'https://cdn.test/lila.jpg',
      alt: 'Llavero Gatarsis color lila',
      sortOrder: 1,
      isCover: true,
      variantId: 'variant-id',
    });
    request.flush({
      id: 'media-id',
      productId: 'product-id',
      variantId: 'variant-id',
      url: 'https://cdn.test/lila.jpg',
      alt: 'Llavero Gatarsis color lila',
      sortOrder: 1,
      isCover: true,
      createdAt: '2026-01-01T00:00:00Z',
    });
    http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`).flush(productDetail());
  });

  it('creates a variant with initialStock and keeps low stock threshold separate', () => {
    component.newVariant();
    component.variant.update((draft) => ({
      ...draft!, name: 'Talle M', sku: 'SKU-M', price: '1500', lowStockThreshold: 2, initialStock: 10,
    }));

    component.saveVariant();

    const request = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/variants`);
    expect(request.request.body).toEqual({
      name: 'Talle M', sku: 'SKU-M', priceInCents: 150000, model: null, color: null, size: null,
      sortOrder: 0, lowStockThreshold: 2, active: true, initialStock: 10,
    });
    request.flush({ id: 'variant-id', productId: 'product-id', sku: 'SKU-M', name: 'Talle M', color: null, size: null, priceInCents: 150000, active: true, sortOrder: 0, lowStockThreshold: 2, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
    http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`).flush(productDetail());
  });

  it('sends color and size as structured attributes for a concrete SKU combination', () => {
    component.newVariant();
    component.variant.update((draft) => ({
      ...draft!,
      name: 'Remera Blanco M',
      sku: 'REM-BLA-M',
      color: 'Blanco',
      size: 'M',
      price: '1500',
      initialStock: 4,
    }));

    component.saveVariant();

    const request = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/variants`);
    expect(request.request.body).toEqual(expect.objectContaining({
      color: 'Blanco',
      size: 'M',
      attributes: { color: 'Blanco', size: 'M' },
    }));
    request.flush({
      id: 'variant-id', productId: 'product-id', sku: 'REM-BLA-M', name: 'Remera Blanco M',
      color: 'Blanco', size: 'M', attributes: { color: 'Blanco', size: 'M' },
      priceInCents: 150000, active: true, sortOrder: 0, lowStockThreshold: null,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    });
    http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`).flush(productDetail());
  });

  it('generates one editable preview per color and size combination', () => {
    component.product.set(productDetail({ name: 'Remera Gatarsis', slug: 'remera-gatarsis' }));
    component.openVariantGenerator();
    component.variantGenerator.update((draft) => ({
      ...draft!,
      colors: ['Blanco', 'Negro'],
      sizes: ['S', 'M'],
      price: '1500',
      skuPrefix: 'REM-GAT',
    }));
    component.refreshGeneratedVariants();

    expect(component.generatedVariants()).toEqual(expect.arrayContaining([
      expect.objectContaining({ color: 'Blanco', size: 'S', name: 'Remera Gatarsis Blanco S', sku: 'REM-GAT-BLA-S', price: '1500' }),
      expect.objectContaining({ color: 'Blanco', size: 'M', sku: 'REM-GAT-BLA-M' }),
      expect.objectContaining({ color: 'Negro', size: 'S', sku: 'REM-GAT-NEG-S' }),
      expect.objectContaining({ color: 'Negro', size: 'M', sku: 'REM-GAT-NEG-M' }),
    ]));
    expect(component.generatedVariants()).toHaveLength(4);
  });

  it.each([
    { models: ['Patita', 'Corazón', 'Logo Gatarsis'], colors: [], sizes: [], count: 3 },
    { models: ['Hilo rojo', 'Michis espacio'], colors: [], sizes: ['S', 'M', 'L'], count: 6 },
    { models: [], colors: ['Negro', 'Blanco'], sizes: ['S', 'M', 'L'], count: 6 },
    { models: ['Hilo rojo', 'Michis espacio'], colors: ['Negro', 'Blanco'], sizes: ['S', 'M', 'L'], count: 12 },
  ])('generates $count concrete combinations for independent dimensions', ({ models, colors, sizes, count }) => {
    component.openVariantGenerator();
    component.variantGenerator.update((draft) => ({ ...draft!, models, colors, sizes, price: '5000', skuPrefix: 'GATARSIS' }));
    component.refreshGeneratedVariants();

    expect(component.generatedVariants()).toHaveLength(count);
    expect(component.creatableGeneratedVariants()).toHaveLength(count);
    if (models.length) {
      expect(component.generatedVariants()[0].model).toBe(models[0]);
      expect(component.generatedVariants()[0].sku).toContain(models[0].toUpperCase().replace(' ', '-'));
    }
  });

  it('trims models, rejects empty and duplicate options and allows removal', () => {
    component.openVariantGenerator();
    component.updateVariantGenerator('modelInput', ' Patita ');
    component.addGeneratorModel();
    component.updateVariantGenerator('modelInput', 'PATITA');
    component.addGeneratorModel();
    component.updateVariantGenerator('modelInput', '   ');
    component.addGeneratorModel();
    expect(component.variantGenerator()?.models).toEqual(['Patita']);
    component.removeGeneratorModel('Patita');
    expect(component.generatedVariants()).toEqual([]);
  });

  it('skips existing model combinations regardless of case and whitespace', () => {
    component.product.set(productDetail({ variants: [{
      ...createdVariant('LLA-PATITA', '', ''), model: ' Patita ', attributes: { model: ' Patita ' },
    }] }));
    component.openVariantGenerator();
    component.variantGenerator.update((draft) => ({ ...draft!, models: ['PATITA', 'Corazón'], colors: [], sizes: [], price: '5000', skuPrefix: 'LLAVERO' }));
    component.refreshGeneratedVariants();
    expect(component.generatedVariants()[0].exists).toBe(true);
    expect(component.creatableGeneratedVariants().map((item) => item.model)).toEqual(['Corazón']);
  });

  it('sends model-only generated variants with no color or size', () => {
    component.openVariantGenerator();
    component.variantGenerator.update((draft) => ({ ...draft!, models: ['Patita'], colors: [], sizes: [], price: '5000', skuPrefix: 'LLAVERO-GATARSIS', initialStock: 10 }));
    component.refreshGeneratedVariants();
    component.createGeneratedVariants();
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id/variants`);
    expect(request.request.body).toEqual(expect.objectContaining({
      model: 'Patita', color: null, size: null, sku: 'LLAVERO-GATARSIS-PATITA',
      attributes: { model: 'Patita' }, initialStock: 10, priceInCents: 500000,
    }));
    request.flush({ ...createdVariant('LLAVERO-GATARSIS-PATITA', '', ''), model: 'Patita', attributes: { model: 'Patita' } });
    http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`).flush(productDetail());
  });

  it('keeps preview names, SKU and prices editable before creation', () => {
    component.product.set(productDetail({ name: 'Remera Gatarsis' }));
    component.openVariantGenerator();
    component.variantGenerator.update((draft) => ({
      ...draft!, colors: ['Lila'], sizes: ['XL'], price: '1500', skuPrefix: 'REM-GAT',
    }));
    component.refreshGeneratedVariants();

    component.updateGeneratedVariant(0, 'name', 'Remera edición Lila XL');
    component.updateGeneratedVariant(0, 'sku', 'REM-ESPECIAL-XL');
    component.updateGeneratedVariant(0, 'price', '1600');

    expect(component.generatedVariants()[0]).toEqual(expect.objectContaining({
      name: 'Remera edición Lila XL', sku: 'REM-ESPECIAL-XL', price: '1600',
    }));
  });

  it('creates generated variants with one structured size and an editable initial stock per row', () => {
    component.product.set(productDetail({ name: 'Remera Gatarsis' }));
    component.openVariantGenerator();
    component.variantGenerator.update((draft) => ({
      ...draft!, colors: ['Blanco'], sizes: ['S', 'M'], price: '1500', skuPrefix: 'REM-GAT', initialStock: 8,
    }));
    component.refreshGeneratedVariants();
    component.updateGeneratedVariant(0, 'initialStock', 4);

    component.createGeneratedVariants();

    const first = http.expectOne(ADMIN_API_BASE_URL + '/products/product-id/variants');
    expect(first.request.body).toEqual(expect.objectContaining({
      sku: 'REM-GAT-BLA-S', attributes: { color: 'Blanco', size: 'S' }, initialStock: 4,
    }));
    first.flush(createdVariant('REM-GAT-BLA-S', 'Blanco', 'S'));
    const second = http.expectOne(ADMIN_API_BASE_URL + '/products/product-id/variants');
    expect(second.request.body).toEqual(expect.objectContaining({
      sku: 'REM-GAT-BLA-M', attributes: { color: 'Blanco', size: 'M' }, initialStock: 8,
    }));
    second.flush(createdVariant('REM-GAT-BLA-M', 'Blanco', 'M'));
    http.expectOne(ADMIN_API_BASE_URL + '/products/product-id').flush(productDetail());

    expect(component.generationResult()).toContain('2 variantes creadas');
  });

  it('supports color-only and size-only generated products', () => {
    component.product.set(productDetail({ name: 'Producto' }));
    component.openVariantGenerator();
    component.variantGenerator.update((draft) => ({
      ...draft!, colors: ['Blanco', 'Negro'], sizes: [], price: '1000', skuPrefix: 'LLA',
    }));
    component.refreshGeneratedVariants();
    expect(component.generatedVariants().map((item) => [item.color, item.size])).toEqual([
      ['Blanco', ''], ['Negro', ''],
    ]);

    component.variantGenerator.update((draft) => ({ ...draft!, colors: [], sizes: ['S', 'M'] }));
    component.refreshGeneratedVariants();
    expect(component.generatedVariants().map((item) => [item.color, item.size])).toEqual([
      ['', 'S'], ['', 'M'],
    ]);
  });

  it('marks existing combinations and legacy CSV variants without splitting their stock', () => {
    component.product.set(productDetail({
      variants: [
        createdVariant('REM-BLA-M', 'Blanco', 'M'),
        { ...createdVariant('REM-OLD', 'Blanco', 'S,M,L,XL'), attributes: undefined },
      ],
    }));
    component.openVariantGenerator();
    component.variantGenerator.update((draft) => ({
      ...draft!, colors: ['Blanco'], sizes: ['S', 'M'], price: '1500', skuPrefix: 'REM-GAT',
    }));
    component.refreshGeneratedVariants();

    expect(component.generatedVariants().find((item) => item.size === 'M')?.exists).toBe(true);
    expect(component.creatableGeneratedVariants().map((item) => item.size)).toEqual(['S']);
    expect(component.hasLegacyMultipleSizes(component.product()!.variants[1])).toBe(true);

    component.openVariantGenerator(component.product()!.variants[1]);
    expect(component.variantGenerator()!.sizes).toEqual(['S', 'M', 'L', 'XL']);
  });

  it('reports partial generator failures and does not retry them automatically', () => {
    component.product.set(productDetail({ name: 'Remera Gatarsis' }));
    component.openVariantGenerator();
    component.variantGenerator.update((draft) => ({
      ...draft!, colors: ['Blanco'], sizes: ['S', 'M'], price: '1500', skuPrefix: 'REM-GAT',
    }));
    component.refreshGeneratedVariants();

    component.createGeneratedVariants();
    http.expectOne(ADMIN_API_BASE_URL + '/products/product-id/variants').flush(createdVariant('REM-GAT-BLA-S', 'Blanco', 'S'));
    http.expectOne(ADMIN_API_BASE_URL + '/products/product-id/variants').flush(
      { code: 'SKU_ALREADY_EXISTS' },
      { status: 409, statusText: 'Conflict' },
    );
    http.expectOne(ADMIN_API_BASE_URL + '/products/product-id').flush(productDetail());

    expect(component.generationResult()).toContain('1 no pudieron crearse');
    expect(component.generatedVariants().find((item) => item.size === 'M')?.error).toBe('Ya existe una variante con ese SKU.');
    http.expectNone(ADMIN_API_BASE_URL + '/products/product-id/variants');
  });

  it('opens the product deletion confirmation and cancel does not call the API', () => {
    component.product.set(productDetail({ name: 'Producto de prueba' }));

    component.requestProductDeletion();

    expect(component.deletionTarget()).toEqual({
      kind: 'product', id: 'product-id', name: 'Producto de prueba',
    });
    component.cancelDeletion();
    expect(component.deletionTarget()).toBeNull();
    http.expectNone(ADMIN_API_BASE_URL + '/products/product-id');
  });

  it('deletes a product or reports it was archived before returning to the list', () => {
    component.product.set(productDetail({ name: 'Producto con historial' }));
    component.requestProductDeletion();

    component.confirmDeletion();

    const request = http.expectOne(ADMIN_API_BASE_URL + '/products/product-id');
    expect(request.request.method).toBe('DELETE');
    request.flush({ result: 'ARCHIVED' });

    expect(component.notice()?.message).toBe('El producto tenía historial asociado y fue archivado.');
    expect(router.navigate).toHaveBeenCalledWith(['/admin/products']);
  });

  it('removes a variant through its endpoint and refreshes the editor for an archive result', () => {
    const variant = createdVariant('REM-BLA-M', 'Blanco', 'M');
    component.product.set(productDetail({ variants: [variant] }));
    component.requestVariantDeletion(variant);

    component.confirmDeletion();

    const request = http.expectOne(ADMIN_API_BASE_URL + '/variants/' + variant.id);
    expect(request.request.method).toBe('DELETE');
    request.flush({ result: 'ARCHIVED' });
    http.expectOne(ADMIN_API_BASE_URL + '/products/product-id').flush(productDetail({
      variants: [{ ...variant, active: false }],
    }));

    expect(component.notice()?.message).toBe('La variante tenía historial asociado y fue archivada.');
    expect(component.product()?.variants[0].active).toBe(false);
  });

  it('renders destructive product and variant actions with accessible labels', () => {
    const variant = createdVariant('REM-BLA-M', 'Blanco', 'M');
    component.id = 'product-id';
    component.product.set(productDetail({ variants: [variant] }));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Zona de peligro');
    expect(fixture.nativeElement.textContent).toContain('Eliminar producto');
    expect(
      fixture.nativeElement.querySelector('[aria-label^="Eliminar variante"]'),
    ).not.toBeNull();
  });

  it('does not create a variant with a negative or fractional initial stock', () => {
    component.newVariant();
    component.variant.update((draft) => ({ ...draft!, name: 'Talle M', sku: 'SKU-M', price: '1500', initialStock: -1 }));
    component.saveVariant();
    expect(component.notice()?.message).toBe('Ingresá un stock inicial entero igual o mayor a cero.');
    http.expectNone(`${ADMIN_API_BASE_URL}/products/product-id/variants`);

    component.variant.update((draft) => ({ ...draft!, initialStock: 1.5 }));
    component.saveVariant();
    http.expectNone(`${ADMIN_API_BASE_URL}/products/product-id/variants`);
  });

  it('rejects multiple sizes in one variant', () => {
    component.newVariant();
    component.variant.update((draft) => ({
      ...draft!,
      name: 'Remera Blanca',
      sku: 'REM-BLA',
      price: '1500',
      size: 'S,M,L,XL',
      initialStock: 4,
    }));

    component.saveVariant();

    expect(component.notice()?.message).toBe('Cada variante debe tener un solo talle.');
    http.expectNone(`${ADMIN_API_BASE_URL}/products/product-id/variants`);
  });

  it('never sends initialStock when editing an existing variant', () => {
    component.editVariant({
      id: 'variant-id', productId: 'product-id', sku: 'SKU-M', name: 'Talle M', color: null, size: null,
      priceInCents: 150000, active: true, sortOrder: 0, lowStockThreshold: 2,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    });
    component.saveVariant();
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/variants/variant-id`);
    expect(request.request.body).not.toHaveProperty('initialStock');
    request.flush({ id: 'variant-id', productId: 'product-id', sku: 'SKU-M', name: 'Talle M', color: null, size: null, priceInCents: 150000, active: true, sortOrder: 0, lowStockThreshold: 2, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
    http.expectOne(`${ADMIN_API_BASE_URL}/products/product-id`).flush(productDetail());
  });
});

function validProductForm() {
  return {
    name: 'Producto',
    slug: 'producto',
    shortDescription: '',
    featured: false,
    sortOrder: 0,
    active: true,
  };
}

function createdVariant(sku: string, color: string, size: string) {
  return {
    id: sku.toLowerCase(),
    productId: 'product-id',
    sku,
    name: 'Variante ' + color + ' ' + size,
    color,
    size,
    attributes: { color, size },
    priceInCents: 150000,
    active: true,
    sortOrder: 0,
    lowStockThreshold: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function productDetail(partial: Partial<AdminProductDetail> = {}): AdminProductDetail {
  return {
    id: 'product-id',
    name: 'Producto',
    slug: 'producto',
    shortDescription: null,
    featured: false,
    sortOrder: 0,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    variants: [],
    media: [],
    ...partial,
  };
}
