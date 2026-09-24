import { Component, input, output } from '@angular/core';

import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RevealOnScrollDirective } from '../../../shared/directives/reveal-on-scroll.directive';
import {
  adoptableCatAgeLabel,
  adoptableCatSexLabel,
} from '../../core/adoption-display.utils';
import { AdoptableCat } from '../../core/adoption.models';

@Component({
  selector: 'app-adoptable-cats',
  imports: [IconComponent, RevealOnScrollDirective],
  templateUrl: './adoptable-cats.component.html',
  styleUrl: './adoptable-cats.component.css',
})
export class AdoptableCatsComponent {
  readonly cats = input.required<readonly AdoptableCat[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  readonly catSelected = output<AdoptableCat>();
  readonly withoutCatSelected = output<void>();
  readonly retryRequested = output<void>();

  catSexLabel(sex: AdoptableCat['sex']): string {
    return adoptableCatSexLabel(sex);
  }

  catAgeLabel(birthDate: string | null, now = new Date()): string {
    return adoptableCatAgeLabel(birthDate, now);
  }
}
