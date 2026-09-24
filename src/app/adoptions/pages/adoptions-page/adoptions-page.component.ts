import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import {
  Field,
  FormField,
  FormRoot,
  applyWhen,
  email,
  form,
  maxLength,
  required,
  requiredError,
  schema,
  validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AdoptableCatsComponent } from '../../components/adoptable-cats/adoptable-cats.component';
import { AppFooterComponent } from '../../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../../shared/components/bottom-navigation/bottom-navigation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { RevealOnScrollDirective } from '../../../shared/directives/reveal-on-scroll.directive';
import { ADOPTION_CONFIG } from '../../core/adoption.config';
import { AdoptionApiService } from '../../core/adoption-api.service';
import {
  adoptableCatAgeLabel,
  adoptableCatSexLabel,
} from '../../core/adoption-display.utils';
import {
  AdoptableCat,
  AdoptionApplicationRequest,
  HomeSafetyStatus,
  HousingType,
  YesNo,
} from '../../core/adoption.models';

interface AdoptionFormModel {
  applicant: {
    fullName: string;
    email: string;
    phone: string;
  };
  home: {
    hasOtherPets: YesNo | '';
    hasRegularVet: YesNo | '';
    vaccinationsUpToDate: YesNo | '';
    petsNeutered: YesNo | '';
    householdAgrees: YesNo | '';
    housingType: HousingType | '';
    rentalAllowsPets: YesNo | '';
    trustedCaregiver: YesNo | '';
  };
  adaptation: {
    willingToSupportAdaptation: YesNo | '';
  };
  care: {
    hasStableIncome: YesNo | '';
    canCoverVetEmergency: YesNo | '';
    previousPetsDeathContext: string;
  };
  safety: {
    homeSafetyStatus: HomeSafetyStatus | '';
    acceptsMandatoryNeutering: YesNo | '';
    commitsNeuteringProof: YesNo | '';
    acceptsFollowUp: YesNo | '';
  };
  commitment: {
    acceptsResponsibleReturnClause: boolean;
    acceptsLongTermCommitment: boolean;
  };
  website: string;
}

function initialAdoptionModel(): AdoptionFormModel {
  return {
    applicant: { fullName: '', email: '', phone: '' },
    home: {
      hasOtherPets: '',
      hasRegularVet: '',
      vaccinationsUpToDate: '',
      petsNeutered: '',
      householdAgrees: '',
      housingType: '',
      rentalAllowsPets: '',
      trustedCaregiver: '',
    },
    adaptation: { willingToSupportAdaptation: '' },
    care: { hasStableIncome: '', canCoverVetEmergency: '', previousPetsDeathContext: '' },
    safety: {
      homeSafetyStatus: '',
      acceptsMandatoryNeutering: '',
      commitsNeuteringProof: '',
      acceptsFollowUp: '',
    },
    commitment: { acceptsResponsibleReturnClause: false, acceptsLongTermCommitment: false },
    website: '',
  };
}

const nonBlank = (value: string) => (value.trim().length === 0 ? requiredError() : undefined);
const isAccepted = (value: boolean) => (value ? undefined : requiredError());

const adoptionSchema = schema<AdoptionFormModel>((p) => {
  required(p.applicant.fullName);
  validate(p.applicant.fullName, (ctx) => nonBlank(ctx.value()));
  maxLength(p.applicant.fullName, 100);

  required(p.applicant.email);
  email(p.applicant.email);
  maxLength(p.applicant.email, 160);

  required(p.applicant.phone);
  validate(p.applicant.phone, (ctx) => nonBlank(ctx.value()));
  maxLength(p.applicant.phone, 40);

  required(p.home.hasOtherPets);
  applyWhen(
    p.home,
    (ctx) => ctx.value().hasOtherPets === 'yes',
    (home) => {
      required(home.hasRegularVet);
      required(home.vaccinationsUpToDate);
      required(home.petsNeutered);
    },
  );
  required(p.home.householdAgrees);
  required(p.home.housingType);
  applyWhen(
    p.home,
    (ctx) => ctx.value().housingType === 'rented',
    (home) => {
      required(home.rentalAllowsPets);
    },
  );
  required(p.home.trustedCaregiver);

  required(p.adaptation.willingToSupportAdaptation);

  required(p.care.hasStableIncome);
  required(p.care.canCoverVetEmergency);
  required(p.care.previousPetsDeathContext);
  validate(p.care.previousPetsDeathContext, (ctx) => nonBlank(ctx.value()));
  maxLength(p.care.previousPetsDeathContext, 1000);

  required(p.safety.homeSafetyStatus);
  required(p.safety.acceptsMandatoryNeutering);
  required(p.safety.commitsNeuteringProof);
  required(p.safety.acceptsFollowUp);

  validate(p.commitment.acceptsResponsibleReturnClause, (ctx) => isAccepted(ctx.value()));
  validate(p.commitment.acceptsLongTermCommitment, (ctx) => isAccepted(ctx.value()));
});

@Component({
  selector: 'app-adoptions-page',
  imports: [
    FormField,
    FormRoot,
    AppHeaderComponent,
    AppFooterComponent,
    BottomNavigationComponent,
    IconComponent,
    AdoptableCatsComponent,
    RevealOnScrollDirective,
  ],
  templateUrl: './adoptions-page.component.html',
  styleUrl: './adoptions-page.component.css',
})
export class AdoptionsPageComponent implements OnInit {
  private readonly api = inject(AdoptionApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly config = ADOPTION_CONFIG;
  readonly currentStep = signal(1);
  readonly reviewing = signal(false);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly adoptableCats = signal<AdoptableCat[]>([]);
  readonly catsLoading = signal(true);
  readonly catsError = signal<string | null>(null);
  readonly selectedCat = signal<AdoptableCat | null>(null);

  private readonly model = signal<AdoptionFormModel>(initialAdoptionModel());
  readonly form = form(this.model, adoptionSchema, {
    submission: {
      action: async () => {
        this.submitting.set(true);
        this.submitError.set(null);
        try {
          await firstValueFrom(this.api.submit(this.toRequest()));
          this.form().reset(initialAdoptionModel());
          this.currentStep.set(1);
          this.reviewing.set(false);
          this.submitted.set(true);
          this.scrollToQuestionnaire();
        } catch {
          this.submitError.set(
            'No pudimos enviar tu solicitud en este momento. Tus respuestas siguen en pantalla para que puedas volver a intentar.',
          );
        } finally {
          this.submitting.set(false);
        }
      },
      onInvalid: () => {
        const invalidStep = this.stepStates().findIndex((state) => state.invalid());
        this.currentStep.set(Math.max(1, invalidStep + 1));
        this.reviewing.set(false);
        this.form().focusBoundControl();
      },
    },
  });

  ngOnInit(): void {
    this.loadAdoptableCats();
  }

  loadAdoptableCats(): void {
    this.catsLoading.set(true);
    this.catsError.set(null);
    this.api
      .getAdoptableCats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cats) => {
          this.adoptableCats.set(
            cats.filter((cat) => cat.status === 'AVAILABLE' || cat.status === 'RESERVED'),
          );
          this.catsLoading.set(false);
        },
        error: () => {
          this.adoptableCats.set([]);
          this.catsLoading.set(false);
          this.catsError.set(
            'No pudimos cargar los michis en este momento. Podés reintentar o completar igualmente el cuestionario.',
          );
        },
      });
  }

  selectCat(cat: AdoptableCat): void {
    if (cat.status !== 'AVAILABLE') return;
    this.selectedCat.set(cat);
    this.scrollToQuestionnaire();
  }

  chooseWithoutCat(): void {
    this.selectedCat.set(null);
    this.scrollToQuestionnaire();
  }

  changeCat(): void {
    this.selectedCat.set(null);
    this.scrollToCats();
  }

  catSexLabel(sex: AdoptableCat['sex']): string {
    return adoptableCatSexLabel(sex);
  }

  catAgeLabel(birthDate: string | null, now = new Date()): string {
    return adoptableCatAgeLabel(birthDate, now);
  }

  get hasOtherPets(): boolean {
    return this.form.home.hasOtherPets().value() === 'yes';
  }

  get isRental(): boolean {
    return this.form.home.housingType().value() === 'rented';
  }

  showError(field: Field<unknown>): boolean {
    const state = field();
    return state.invalid() && (state.touched() || state.dirty());
  }

  nextStep(): void {
    const state = this.stepStates()[this.currentStep() - 1];
    if (state.invalid()) {
      state.markAsTouched();
      state.focusBoundControl();
      return;
    }

    this.submitError.set(null);
    if (this.currentStep() === 6) {
      this.reviewing.set(true);
      this.scrollToQuestionnaire();
      return;
    }
    this.currentStep.update((step) => step + 1);
    this.scrollToQuestionnaire();
  }

  previousStep(): void {
    this.submitError.set(null);
    if (this.reviewing()) {
      this.reviewing.set(false);
    } else if (this.currentStep() > 1) {
      this.currentStep.update((step) => step - 1);
    }
    this.scrollToQuestionnaire();
  }

  editStep(step: number): void {
    this.currentStep.set(step);
    this.reviewing.set(false);
    this.scrollToQuestionnaire();
  }

  startAnother(): void {
    this.submitted.set(false);
    this.selectedCat.set(null);
    this.currentStep.set(1);
    this.scrollToQuestionnaire();
  }

  goToQuestionnaire(): void {
    this.scrollToQuestionnaire();
  }

  yesNoLabel(value: YesNo | ''): string {
    return value === 'yes' ? 'Sí' : value === 'no' ? 'No' : 'Sin responder';
  }

  housingLabel(value: HousingType | ''): string {
    return { owned: 'Propia', rented: 'Alquilada', other: 'Otra', '': 'Sin responder' }[value];
  }

  safetyLabel(value: HomeSafetyStatus | ''): string {
    return {
      protected: 'Sí, ya cuenta con protección',
      will_install: 'Todavía no, pero me comprometo a instalarla',
      no: 'No',
      not_applicable: 'No aplica porque no hay aberturas o balcones de riesgo',
      '': 'Sin responder',
    }[value];
  }

  private stepStates() {
    return [
      this.form.applicant(),
      this.form.home(),
      this.form.adaptation(),
      this.form.care(),
      this.form.safety(),
      this.form.commitment(),
    ] as const;
  }

  private toRequest(): AdoptionApplicationRequest {
    const value = this.model();
    const adoptableCatId = this.selectedCat()?.id;
    return {
      ...(adoptableCatId ? { adoptableCatId } : {}),
      applicant: {
        fullName: value.applicant.fullName.trim(),
        email: value.applicant.email.trim().toLowerCase(),
        phone: value.applicant.phone.trim(),
      },
      home: {
        hasOtherPets: value.home.hasOtherPets === 'yes',
        ...(value.home.hasOtherPets === 'yes'
          ? {
              hasRegularVet: value.home.hasRegularVet === 'yes',
              vaccinationsUpToDate: value.home.vaccinationsUpToDate === 'yes',
              petsNeutered: value.home.petsNeutered === 'yes',
            }
          : {}),
        householdAgrees: value.home.householdAgrees === 'yes',
        housingType: value.home.housingType as HousingType,
        ...(value.home.housingType === 'rented'
          ? { rentalAllowsPets: value.home.rentalAllowsPets === 'yes' }
          : {}),
        trustedCaregiver: value.home.trustedCaregiver === 'yes',
      },
      adaptation: {
        willingToSupportAdaptation: value.adaptation.willingToSupportAdaptation === 'yes',
      },
      care: {
        hasStableIncome: value.care.hasStableIncome === 'yes',
        canCoverVetEmergency: value.care.canCoverVetEmergency === 'yes',
        previousPetsDeathContext: value.care.previousPetsDeathContext.trim(),
      },
      safety: { homeSafetyStatus: value.safety.homeSafetyStatus as HomeSafetyStatus },
      commitments: {
        acceptsMandatoryNeutering: value.safety.acceptsMandatoryNeutering === 'yes',
        commitsNeuteringProof: value.safety.commitsNeuteringProof === 'yes',
        acceptsFollowUp: value.safety.acceptsFollowUp === 'yes',
        acceptsResponsibleReturnClause: value.commitment.acceptsResponsibleReturnClause,
        acceptsLongTermCommitment: value.commitment.acceptsLongTermCommitment,
      },
      website: value.website,
    };
  }

  private scrollToQuestionnaire(): void {
    queueMicrotask(() => {
      const questionnaire = document.getElementById('cuestionario');
      if (typeof questionnaire?.scrollIntoView === 'function') {
        questionnaire.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  private scrollToCats(): void {
    queueMicrotask(() => {
      const cats = document.getElementById('michis-en-adopcion');
      if (typeof cats?.scrollIntoView === 'function') {
        cats.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}
