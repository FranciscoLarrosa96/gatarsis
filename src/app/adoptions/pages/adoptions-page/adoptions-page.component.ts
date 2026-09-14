import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AppFooterComponent } from '../../../shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from '../../../shared/components/app-header/app-header.component';
import { BottomNavigationComponent } from '../../../shared/components/bottom-navigation/bottom-navigation.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ADOPTION_CONFIG } from '../../core/adoption.config';
import { AdoptionApiService } from '../../core/adoption-api.service';
import {
  AdoptionApplicationRequest,
  HomeSafetyStatus,
  HousingType,
  YesNo,
} from '../../core/adoption.models';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim().length === 0
    ? { required: true }
    : null;

@Component({
  selector: 'app-adoptions-page',
  imports: [
    ReactiveFormsModule,
    AppHeaderComponent,
    AppFooterComponent,
    BottomNavigationComponent,
    IconComponent,
  ],
  templateUrl: './adoptions-page.component.html',
  styleUrl: './adoptions-page.component.css',
})
export class AdoptionsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(AdoptionApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly config = ADOPTION_CONFIG;
  readonly currentStep = signal(1);
  readonly reviewing = signal(false);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    applicant: this.fb.nonNullable.group({
      fullName: ['', [Validators.required, trimmedRequired, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
      phone: ['', [Validators.required, trimmedRequired, Validators.maxLength(40)]],
    }),
    home: this.fb.nonNullable.group({
      hasOtherPets: ['' as YesNo | '', Validators.required],
      hasRegularVet: ['' as YesNo | ''],
      vaccinationsUpToDate: ['' as YesNo | ''],
      petsNeutered: ['' as YesNo | ''],
      householdAgrees: ['' as YesNo | '', Validators.required],
      housingType: ['' as HousingType | '', Validators.required],
      rentalAllowsPets: ['' as YesNo | ''],
      trustedCaregiver: ['' as YesNo | '', Validators.required],
    }),
    adaptation: this.fb.nonNullable.group({
      willingToSupportAdaptation: ['' as YesNo | '', Validators.required],
    }),
    care: this.fb.nonNullable.group({
      hasStableIncome: ['' as YesNo | '', Validators.required],
      canCoverVetEmergency: ['' as YesNo | '', Validators.required],
      previousPetsDeathContext: [
        '',
        [Validators.required, trimmedRequired, Validators.maxLength(1000)],
      ],
    }),
    safety: this.fb.nonNullable.group({
      homeSafetyStatus: ['' as HomeSafetyStatus | '', Validators.required],
      acceptsMandatoryNeutering: ['' as YesNo | '', Validators.required],
      commitsNeuteringProof: ['' as YesNo | '', Validators.required],
      acceptsFollowUp: ['' as YesNo | '', Validators.required],
    }),
    commitment: this.fb.nonNullable.group({
      acceptsResponsibleReturnClause: [false, Validators.requiredTrue],
      acceptsLongTermCommitment: [false, Validators.requiredTrue],
    }),
    website: [''],
  });

  private readonly stepGroups: readonly AbstractControl[] = [
    this.form.controls.applicant,
    this.form.controls.home,
    this.form.controls.adaptation,
    this.form.controls.care,
    this.form.controls.safety,
    this.form.controls.commitment,
  ];

  constructor() {
    this.form.controls.home.controls.hasOtherPets.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.configureOtherPets(value === 'yes'));
    this.form.controls.home.controls.housingType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.configureRental(value === 'rented'));
  }

  get hasOtherPets(): boolean {
    return this.form.controls.home.controls.hasOtherPets.value === 'yes';
  }

  get isRental(): boolean {
    return this.form.controls.home.controls.housingType.value === 'rented';
  }

  nextStep(): void {
    const group = this.stepGroups[this.currentStep() - 1];
    if (group.invalid) {
      group.markAllAsTouched();
      this.focusFirstInvalid();
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

  submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const invalidStep = this.stepGroups.findIndex((group) => group.invalid);
      this.currentStep.set(Math.max(1, invalidStep + 1));
      this.reviewing.set(false);
      this.focusFirstInvalid();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);
    this.api
      .submit(this.toRequest())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.form.reset();
          this.currentStep.set(1);
          this.reviewing.set(false);
          this.submitted.set(true);
          this.scrollToQuestionnaire();
        },
        error: () => {
          this.submitError.set(
            'No pudimos enviar tu solicitud en este momento. Tus respuestas siguen en pantalla para que puedas volver a intentar.',
          );
        },
      });
  }

  startAnother(): void {
    this.submitted.set(false);
    this.currentStep.set(1);
    this.scrollToQuestionnaire();
  }

  goToQuestionnaire(): void {
    this.scrollToQuestionnaire();
  }

  hasError(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.touched || control.dirty);
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

  private configureOtherPets(required: boolean): void {
    const controls = this.form.controls.home.controls;
    [controls.hasRegularVet, controls.vaccinationsUpToDate, controls.petsNeutered].forEach(
      (control) => {
        control.setValidators(required ? Validators.required : null);
        if (!required) control.setValue('');
        control.updateValueAndValidity({ emitEvent: false });
      },
    );
  }

  private configureRental(required: boolean): void {
    const control = this.form.controls.home.controls.rentalAllowsPets;
    control.setValidators(required ? Validators.required : null);
    if (!required) control.setValue('');
    control.updateValueAndValidity({ emitEvent: false });
  }

  private toRequest(): AdoptionApplicationRequest {
    const value = this.form.getRawValue();
    return {
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

  private focusFirstInvalid(): void {
    queueMicrotask(() => {
      const element = document.querySelector<HTMLElement>(
        '#adoption-form input.ng-invalid, #adoption-form textarea.ng-invalid',
      );
      element?.focus();
    });
  }

  private scrollToQuestionnaire(): void {
    queueMicrotask(() => {
      const questionnaire = document.getElementById('cuestionario');
      if (typeof questionnaire?.scrollIntoView === 'function') {
        questionnaire.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}
