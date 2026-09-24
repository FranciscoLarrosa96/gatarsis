import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, AppHeaderComponent, AppFooterComponent, BottomNavigationComponent],
  template: `
    <app-header />
    <main id="contenido" class="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <img
        src="images/extra/paw.png"
        alt=""
        aria-hidden="true"
        class="page-intro page-intro--pop mx-auto mb-6 w-16 -rotate-12 opacity-40"
      />
      <h1 class="page-intro page-intro--title text-4xl font-black" style="--intro-step: 1">
        No encontramos esta página.
      </h1>
      <p class="page-intro mt-4 text-[var(--color-text-muted)]" style="--intro-step: 2">
        El enlace puede haber cambiado o el contenido todavía no está cargado.
      </p>
      <a
        routerLink="/"
        style="--intro-step: 3"
        class="page-intro button-primary mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 font-extrabold"
      >
        Volver al inicio
      </a>
    </main>
    <app-footer />
    <app-bottom-navigation />
  `
})
export class NotFoundPageComponent {}
