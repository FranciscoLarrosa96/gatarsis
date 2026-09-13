import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home-page.component').then((m) => m.HomePageComponent),
  },
  {
    path: 'casos',
    loadComponent: () =>
      import('./features/cases/cases-page.component').then((m) => m.CasesPageComponent),
  },
  {
    path: 'casos/:slug',
    loadComponent: () =>
      import('./features/case-detail/case-detail-page.component').then(
        (m) => m.CaseDetailPageComponent,
      ),
  },
  {
    path: 'donde-va-tu-ayuda',
    loadComponent: () =>
      import('./features/transparency/transparency-page.component').then(
        (m) => m.TransparencyPageComponent,
      ),
  },
  {
    path: 'transparencia',
    redirectTo: 'donde-va-tu-ayuda',
    pathMatch: 'full',
  },
  {
    path: 'tienda',
    loadComponent: () =>
      import('./shop/pages/shop-page/shop-page.component').then((m) => m.ShopPageComponent),
  },
  {
    path: 'tienda/:slug',
    loadComponent: () =>
      import('./shop/pages/product-detail-page/product-detail-page.component').then(
        (m) => m.ProductDetailPageComponent,
      ),
  },
  {
    path: 'carrito',
    loadComponent: () =>
      import('./shop/pages/cart-page/cart-page.component').then((m) => m.CartPageComponent),
  },
  {
    path: 'rifa',
    loadComponent: () =>
      import('./raffle/pages/raffle-page/raffle-page.component').then((m) => m.RafflePageComponent),
  },
  {
    path: 'rifa/checkout/success',
    loadComponent: () =>
      import('./raffle/pages/raffle-status-page/raffle-status-page.component').then(
        (m) => m.RaffleStatusPageComponent,
      ),
  },
  {
    path: 'rifa/checkout/pending',
    loadComponent: () =>
      import('./raffle/pages/raffle-status-page/raffle-status-page.component').then(
        (m) => m.RaffleStatusPageComponent,
      ),
  },
  {
    path: 'rifa/checkout/failure',
    loadComponent: () =>
      import('./raffle/pages/raffle-status-page/raffle-status-page.component').then(
        (m) => m.RaffleStatusPageComponent,
      ),
  },
  {
    path: 'checkout/success',
    loadComponent: () =>
      import('./shop/pages/checkout-status-page/checkout-status-page.component').then(
        (m) => m.CheckoutStatusPageComponent,
      ),
  },
  {
    path: 'checkout/pending',
    loadComponent: () =>
      import('./shop/pages/checkout-status-page/checkout-status-page.component').then(
        (m) => m.CheckoutStatusPageComponent,
      ),
  },
  {
    path: 'checkout/failure',
    loadComponent: () =>
      import('./shop/pages/checkout-status-page/checkout-status-page.component').then(
        (m) => m.CheckoutStatusPageComponent,
      ),
  },
  {
    path: 'merch',
    redirectTo: 'tienda',
    pathMatch: 'full',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-page.component').then((m) => m.NotFoundPageComponent),
  },
];
