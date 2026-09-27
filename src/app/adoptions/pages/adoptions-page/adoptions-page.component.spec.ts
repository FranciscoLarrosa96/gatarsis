import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { submit } from '@angular/forms/signals';
import { provideRouter } from '@angular/router';

import { PUBLIC_API_BASE_URL } from '../../../shop/core/commerce.models';
import { AdoptableCat } from '../../core/adoption.models';
import { AdoptionsPageComponent } from './adoptions-page.component';

const cats: AdoptableCat[] = [
  {
    id: 'cat-bianca',
    name: 'Bianca',
    sex: 'FEMALE',
    birthDate: '2024-03-10',
    shortDescription: 'Dulce, compañera y muy curiosa.',
    imageUrl: 'https://example.test/bianca.jpg',
    status: 'AVAILABLE',
  },
  {
    id: 'cat-orion',
    name: 'Orión',
    sex: 'MALE',
    birthDate: null,
    shortDescription: 'Tranquilo y cariñoso.',
    imageUrl: null,
    status: 'RESERVED',
  },
];

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
    http.expectOne(`${PUBLIC_API_BASE_URL}/adoptions/cats`).flush(cats);
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

  it('renders public cat cards with sex, calculated age and reserved state', () => {
    component.adoptableCats.set(cats);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.cat-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Bianca');
    expect(cards[0].textContent).toContain('Hembra');
    expect(cards[1].textContent).toContain('Macho');
    expect(cards[1].textContent).toContain('Edad a confirmar');
    expect(cards[1].textContent).toContain('En proceso');
    expect(cards[1].querySelector('.cat-cta')).toBeNull();
    expect(component.catAgeLabel('2025-01-20', new Date(2025, 8, 20))).toBe('8 meses');
  });

  it('selects an available cat and allows changing it', () => {
    component.adoptableCats.set(cats);
    fixture.detectChanges();

    const selectButton = fixture.nativeElement.querySelector('.cat-cta') as HTMLButtonElement;
    selectButton.click();
    fixture.detectChanges();

    expect(component.selectedCat()?.id).toBe('cat-bianca');
    expect(fixture.nativeElement.querySelector('.selected-cat').textContent).toContain('Bianca');

    (fixture.nativeElement.querySelector('.selected-cat button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.selectedCat()).toBeNull();
  });

  it('hides the questionnaire and disables the CTA while the collection is empty or fails', () => {
    component.adoptableCats.set([]);
    component.catsError.set(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cats-state').textContent).toContain(
      'Por ahora no tenemos michis',
    );
    expect(fixture.nativeElement.querySelector('#adoption-form')).toBeNull();
    expect(fixture.nativeElement.querySelector('.primary-cta').disabled).toBe(true);

    component.catsError.set('No pudimos cargar los michis.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cats-state--error')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#adoption-form')).toBeNull();
  });

  it.each(['empty', 'reserved', 'loading', 'error'] as const)('blocks even a valid submission when availability is %s', async (state) => {
    fillValidForm();
    if (state === 'empty') component.adoptableCats.set([]);
    if (state === 'reserved') component.adoptableCats.set([cats[1]]);
    if (state === 'loading') component.catsLoading.set(true);
    if (state === 'error') component.catsError.set('Error');
    expect(component.canApply()).toBe(false);
    await submit(component.form);
    http.expectNone(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
    expect(component.submitted()).toBe(false);
    expect(component.submitError()).toContain('no hay michis disponibles');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#adoption-form')).toBeNull();
  });

  it('blocks submission if the selected cat is no longer available', async () => {
    fillValidForm();
    component.selectCat(cats[0]);
    component.adoptableCats.set([{ ...cats[0], status: 'RESERVED' }, { ...cats[0], id: 'another-cat' }]);
    await submit(component.form);
    http.expectNone(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
    expect(component.submitted()).toBe(false);
  });

  it('shows stable skeleton cards while loading', () => {
    component.catsLoading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.cat-card--skeleton')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('.cats-grid').getAttribute('aria-busy')).toBe(
      'true',
    );
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
    expect(home.petsFivFelvTestStatus().invalid()).toBe(true);
    expect(home.petsDescription().invalid()).toBe(true);

    home.hasOtherPets().value.set('no');
    expect(home.hasRegularVet().invalid()).toBe(false);
    expect(home.vaccinationsUpToDate().invalid()).toBe(false);
    expect(home.petsNeutered().invalid()).toBe(false);
    expect(home.petsFivFelvTestStatus().invalid()).toBe(false);
    expect(home.petsDescription().invalid()).toBe(false);
  });

  it('accepts no cats and validates the pet description', () => {
    const home = component.form.home;
    home.hasOtherPets().value.set('yes');
    home.petsFivFelvTestStatus().value.set('not_applicable');
    expect(home.petsFivFelvTestStatus().valid()).toBe(true);
    expect(component.petsTestLabel('not_applicable')).toBe('No tengo gatos');
    home.petsDescription().value.set('   ');
    expect(home.petsDescription().invalid()).toBe(true);
    home.petsDescription().value.set('x'.repeat(1001));
    expect(home.petsDescription().invalid()).toBe(true);
    home.petsDescription().value.set('Mi perro tiene cinco años.');
    expect(home.petsDescription().valid()).toBe(true);
  });

  it('omits pet-specific answers when the applicant has no pets', async () => {
    fillValidForm();
    component.form.home.hasOtherPets().value.set('no');
    component.reviewing.set(true);
    const done = submit(component.form);
    await fixture.whenStable();
    const request = http.expectOne(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
    expect(request.request.body.home.petsFivFelvTestStatus).toBeUndefined();
    expect(request.request.body.home.petsDescription).toBeUndefined();
    request.flush({ success: true });
    await done;
  });

  it('requires a nonblank vet name only when the applicant has pets and a regular vet', () => {
    const home = component.form.home;
    home.hasOtherPets().value.set('yes');
    home.hasRegularVet().value.set('yes');
    expect(home.regularVetName().invalid()).toBe(true);
    home.regularVetName().value.set('   ');
    expect(home.regularVetName().invalid()).toBe(true);
    home.regularVetName().value.set('x'.repeat(161));
    expect(home.regularVetName().invalid()).toBe(true);
    home.regularVetName().value.set('Veterinaria Centro');
    expect(home.regularVetName().valid()).toBe(true);
    home.regularVetName().value.set('');
    home.hasRegularVet().value.set('no');
    expect(home.regularVetName().valid()).toBe(true);
    home.hasRegularVet().value.set('yes');
    home.hasOtherPets().value.set('no');
    expect(home.regularVetName().valid()).toBe(true);
  });

  it('omits the vet name when the applicant has no regular vet', async () => {
    fillValidForm();
    component.form.home.hasRegularVet().value.set('no');
    component.reviewing.set(true);
    const done = submit(component.form);
    await fixture.whenStable();
    const request = http.expectOne(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
    expect(request.request.body.home.regularVetName).toBeUndefined();
    request.flush({ success: true });
    await done;
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

  it('rejects submission when any visible question is unanswered', async () => {
    const fields = [
      component.form.applicant.fullName,
      component.form.applicant.email,
      component.form.applicant.phone,
      component.form.home.hasOtherPets,
      component.form.home.hasRegularVet,
      component.form.home.regularVetName,
      component.form.home.vaccinationsUpToDate,
      component.form.home.petsNeutered,
      component.form.home.petsFivFelvTestStatus,
      component.form.home.petsDescription,
      component.form.home.householdAgrees,
      component.form.home.housingType,
      component.form.home.rentalAllowsPets,
      component.form.home.trustedCaregiver,
      component.form.adaptation.willingToSupportAdaptation,
      component.form.care.hasStableIncome,
      component.form.care.canCoverVetEmergency,
      component.form.care.previousPetsDeathContext,
      component.form.safety.homeSafetyStatus,
      component.form.safety.acceptsMandatoryNeutering,
      component.form.safety.commitsNeuteringProof,
      component.form.safety.acceptsFollowUp,
    ];

    for (const field of fields) {
      fillValidForm();
      field().value.set('');
      component.reviewing.set(true);
      await submit(component.form);

      expect(field().invalid()).toBe(true);
      expect(component.reviewing()).toBe(false);
      http.expectNone(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
    }
  });

  it('rejects a whitespace-only answer about previous pets', async () => {
    fillValidForm();
    component.form.care.previousPetsDeathContext().value.set('   ');
    await submit(component.form);

    expect(component.form.care.previousPetsDeathContext().invalid()).toBe(true);
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
    expect(request.request.body.home.regularVetName).toBe('Veterinaria Centro');
    expect(request.request.body.home.petsFivFelvTestStatus).toBe('yes');
    expect(request.request.body.home.petsDescription).toBe('Luna es tranquila y tiene tres años.');
    expect(request.request.body.adoptableCatId).toBeUndefined();
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

  it('includes the selected cat id in the existing application payload', async () => {
    fillValidForm();
    component.selectCat(cats[0]);
    component.reviewing.set(true);
    const done = submit(component.form);
    await fixture.whenStable();

    const request = http.expectOne(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
    expect(request.request.body.adoptableCatId).toBe('cat-bianca');
    request.flush({ success: true });
    await done;
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
        regularVetName: '  Veterinaria Centro  ',
        vaccinationsUpToDate: 'yes',
        petsNeutered: 'yes',
        petsFivFelvTestStatus: 'yes',
        petsDescription: '  Luna es tranquila y tiene tres años.  ',
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
