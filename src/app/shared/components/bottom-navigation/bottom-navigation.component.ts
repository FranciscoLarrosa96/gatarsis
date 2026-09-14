import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { CartStore } from '../../../shop/core/cart.store';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-bottom-navigation',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <nav
      class="surface-glass fixed inset-x-0 bottom-0 z-40 border-t px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 lg:hidden"
      aria-label="Navegación móvil"
    >
      <div class="mx-auto grid max-w-lg grid-cols-7 gap-0.5">
        <a
          routerLink="/"
          routerLinkActive="nav-active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          class="flex min-h-12 flex-col items-center justify-center rounded-full px-1 text-[11px] font-bold text-[var(--color-text)] sm:text-xs"
        >
          <app-icon name="home" class="size-4" />
          Inicio
        </a>
        <a
          routerLink="/casos"
          routerLinkActive="nav-active"
          ariaCurrentWhenActive="page"
          class="flex min-h-12 flex-col items-center justify-center rounded-full px-1 text-[11px] font-bold text-[var(--color-text)] sm:text-xs"
        >
          <app-icon name="paw" class="size-4" />
          Casos
        </a>
        <a
          routerLink="/adopciones"
          routerLinkActive="nav-active"
          ariaCurrentWhenActive="page"
          class="flex min-h-12 flex-col items-center justify-center rounded-full px-0.5 text-[10px] font-bold text-[var(--color-text)] sm:px-1 sm:text-xs"
        >
          <app-icon name="heart" class="size-4" />
          Adoptar
        </a>
        <a
          routerLink="/donde-va-tu-ayuda"
          routerLinkActive="nav-active"
          ariaCurrentWhenActive="page"
          class="flex min-h-12 flex-col items-center justify-center rounded-full px-1 text-[11px] font-bold text-[var(--color-text)] sm:text-xs"
        >
          <app-icon name="receipt" class="size-4" />
          Ayuda
        </a>
        <a
          routerLink="/rifa"
          routerLinkActive="nav-active"
          ariaCurrentWhenActive="page"
          class="flex min-h-12 flex-col items-center justify-center rounded-full px-1 text-[11px] font-bold text-[var(--color-text)] sm:text-xs"
        >
          <app-icon name="ticket" class="size-4" />
          Rifa
        </a>
        <a
          routerLink="/tienda"
          routerLinkActive="nav-active"
          ariaCurrentWhenActive="page"
          class="flex min-h-12 flex-col items-center justify-center rounded-full px-1 text-[11px] font-bold text-[var(--color-text)] sm:text-xs"
        >
          <app-icon name="shop" class="size-4" />
          Tienda
        </a>
        <a
          routerLink="/carrito"
          routerLinkActive="nav-active"
          ariaCurrentWhenActive="page"
          class="relative flex min-h-12 flex-col items-center justify-center rounded-full px-1 text-[11px] font-bold text-[var(--color-text)] sm:text-xs"
        >
          <app-icon name="cart" class="size-4" />
          Carrito
          @if (cart.totalItems()) {
            <span
              class="absolute right-1 top-0 inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] leading-4 text-white"
              >{{ cart.totalItems() }}</span
            >
          }
        </a>
      </div>
    </nav>
  `,
})
export class BottomNavigationComponent {
  protected readonly cart = inject(CartStore);
}
