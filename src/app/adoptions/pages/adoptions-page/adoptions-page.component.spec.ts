import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PUBLIC_API_BASE_URL } from '../../../shop/core/commerce.models';
import { AdoptionsPageComponent } from './adoptions-page.component';

describe('AdoptionsPageComponent', () => {
  let fixture: ComponentFixture<AdoptionsPageComponent>;
  let component: AdoptionsPageComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdoptionsPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(AdoptionsPageComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    sessionStorage.clear();
    fixture.destroy();
  });

  it('opens the questionnaire in place without navigating to another route', () => {
    const goToQuestionnaire = vi.spyOn(component, 'goToQuestionnaire');
    const button = fixture.nativeElement.querySelector('.primary-cta') as HTMLButtonElement;

    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('href')).toBeNull();
    button.click();

    expect(goToQuestionnaire).toHaveBeenCalledOnce();
  });

  it('does not advance while the current step is invalid', () => {
    component.nextStep();
    expect(component.currentStep()).toBe(1);
    expect(component.form.controls.applicant.touched).toBe(true);

    component.form.controls.applicant.setValue({
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '2494000000',
    });
    component.nextStep();
    expect(component.currentStep()).toBe(2);
  });

  it('requires and clears the other-pets conditional questions', () => {
    const home = component.form.controls.home.controls;
    home.hasOtherPets.setValue('yes');
    expect(home.hasRegularVet.hasError('required')).toBe(true);
    expect(home.vaccinationsUpToDate.hasError('required')).toBe(true);
    expect(home.petsNeutered.hasError('required')).toBe(true);

    home.hasRegularVet.setValue('yes');
    home.hasOtherPets.setValue('no');
    expect(home.hasRegularVet.value).toBe('');
    expect(home.hasRegularVet.hasError('required')).toBe(false);
  });

  it('requires rental permission only for rented homes', () => {
    const home = component.form.controls.home.controls;
    home.housingType.setValue('rented');
    expect(home.rentalAllowsPets.hasError('required')).toBe(true);

    home.rentalAllowsPets.setValue('yes');
    home.housingType.setValue('owned');
    expect(home.rentalAllowsPets.value).toBe('');
    expect(home.rentalAllowsPets.hasError('required')).toBe(false);
  });

  it('does not submit when required commitments are missing', () => {
    fillValidForm();
    component.form.controls.commitment.controls.acceptsLongTermCommitment.setValue(false);
    component.reviewing.set(true);
    component.submit();
    expect(component.reviewing()).toBe(false);
    expect(component.currentStep()).toBe(6);
    http.expectNone(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
  });

  it('submits a trimmed whitelist payload and never persists PII in browser storage', () => {
    fillValidForm();
    component.reviewing.set(true);
    component.submit();

    const request = http.expectOne(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
    expect(request.request.body.applicant).toEqual({
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '+54 249 4000000',
    });
    expect(request.request.body.home.hasOtherPets).toBe(true);
    expect(request.request.body.home.hasRegularVet).toBe(true);
    expect(request.request.body.to).toBeUndefined();
    expect(request.request.body.recipient).toBeUndefined();
    expect(request.request.body.html).toBeUndefined();
    expect(JSON.stringify(localStorage)).not.toContain('Ana');
    expect(JSON.stringify(sessionStorage)).not.toContain('Ana');
    request.flush({ success: true });

    expect(component.submitted()).toBe(true);
    expect(component.form.controls.applicant.controls.fullName.value).toBe('');
  });

  it('keeps every answer available after an SMTP delivery error', () => {
    fillValidForm();
    component.reviewing.set(true);
    component.submit();

    http
      .expectOne(`${PUBLIC_API_BASE_URL}/adoptions/applications`)
      .flush(
        { code: 'ADOPTION_APPLICATION_DELIVERY_FAILED' },
        { status: 503, statusText: 'Unavailable' },
      );

    expect(component.submitted()).toBe(false);
    expect(component.reviewing()).toBe(true);
    expect(component.form.controls.applicant.controls.fullName.value).toContain('Ana');
    expect(component.submitError()).toContain('Tus respuestas siguen en pantalla');
  });

  function fillValidForm(): void {
    component.form.setValue({
      applicant: {
        fullName: '  Ana Pérez  ',
        email: 'ANA@EXAMPLE.COM',
        phone: ' +54 249 4000000 ',
      },
      home: {
        hasOtherPets: 'yes',
        hasRegularVet: 'yes',
        vaccinationsUpToDate: 'yes',
        petsNeutered: 'yes',
        householdAgrees: 'yes',
        housingType: 'rented',
        rentalAllowsPets: 'yes',
        trustedCaregiver: 'yes',
      },
      adaptation: { willingToSupportAdaptation: 'yes' },
      care: {
        hasStableIncome: 'yes',
        canCoverVetEmergency: 'yes',
        previousPetsDeathContext: 'No tuve mascotas anteriormente.',
      },
      safety: {
        homeSafetyStatus: 'protected',
        acceptsMandatoryNeutering: 'yes',
        commitsNeuteringProof: 'yes',
        acceptsFollowUp: 'yes',
      },
      commitment: {
        acceptsResponsibleReturnClause: true,
        acceptsLongTermCommitment: true,
      },
      website: '',
    });
  }
});
