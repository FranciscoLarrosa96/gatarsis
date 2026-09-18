import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { submit } from '@angular/forms/signals';
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
    expect(component.form.applicant().touched()).toBe(true);

    component.form.applicant().value.set({
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '2494000000',
    });
    component.nextStep();
    expect(component.currentStep()).toBe(2);
  });

  it('requires the other-pets conditional questions only when the answer is yes', () => {
    const home = component.form.home;
    home.hasOtherPets().value.set('yes');
    expect(home.hasRegularVet().invalid()).toBe(true);
    expect(home.vaccinationsUpToDate().invalid()).toBe(true);
    expect(home.petsNeutered().invalid()).toBe(true);

    home.hasOtherPets().value.set('no');
    expect(home.hasRegularVet().invalid()).toBe(false);
    expect(home.vaccinationsUpToDate().invalid()).toBe(false);
    expect(home.petsNeutered().invalid()).toBe(false);
  });

  it('requires rental permission only for rented homes', () => {
    const home = component.form.home;
    home.housingType().value.set('rented');
    expect(home.rentalAllowsPets().invalid()).toBe(true);

    home.housingType().value.set('owned');
    expect(home.rentalAllowsPets().invalid()).toBe(false);
  });

  it('does not submit when required commitments are missing', async () => {
    fillValidForm();
    component.form.commitment.acceptsLongTermCommitment().value.set(false);
    component.reviewing.set(true);
    await submit(component.form);
    expect(component.reviewing()).toBe(false);
    expect(component.currentStep()).toBe(6);
    http.expectNone(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
  });

  it('submits a trimmed whitelist payload and never persists PII in browser storage', async () => {
    fillValidForm();
    component.reviewing.set(true);
    const done = submit(component.form);
    await fixture.whenStable();

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
    await done;

    expect(component.submitted()).toBe(true);
    expect(component.form.applicant.fullName().value()).toBe('');
  });

  it('keeps every answer available after an SMTP delivery error', async () => {
    fillValidForm();
    component.reviewing.set(true);
    const done = submit(component.form);
    await fixture.whenStable();

    http
      .expectOne(`${PUBLIC_API_BASE_URL}/adoptions/applications`)
      .flush(
        { code: 'ADOPTION_APPLICATION_DELIVERY_FAILED' },
        { status: 503, statusText: 'Unavailable' },
      );
    await done;

    expect(component.submitted()).toBe(false);
    expect(component.reviewing()).toBe(true);
    expect(component.form.applicant.fullName().value()).toContain('Ana');
    expect(component.submitError()).toContain('Tus respuestas siguen en pantalla');
  });

  function fillValidForm(): void {
    component.form().value.set({
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
