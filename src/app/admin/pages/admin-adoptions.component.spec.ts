import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ADMIN_API_BASE_URL } from '../core/admin-api.config';
import { AdminAdoptableCat, AdminAdoptionApplication } from '../core/admin-adoption.models';
import { AdminAdoptionsComponent } from './admin-adoptions.component';

const bianca: AdminAdoptableCat = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Bianca',
  sex: 'FEMALE',
  birthDate: '2024-01-10',
  shortDescription: 'Dulce, compañera y muy curiosa.',
  imageUrl: 'https://cdn.test/bianca.jpg',
  status: 'AVAILABLE',
  published: false,
  displayOrder: 1,
  createdAt: '2026-01-01T12:00:00Z',
  updatedAt: '2026-09-18T12:00:00Z',
};

const baseApplication: AdminAdoptionApplication = {
  id: '22222222-2222-4222-8222-222222222222',
  adoptableCatId: bianca.id,
  interest: {
    id: bianca.id,
    name: bianca.name,
    sex: bianca.sex,
    birthDate: bianca.birthDate,
    shortDescription: bianca.shortDescription,
    imageUrl: bianca.imageUrl,
    status: 'AVAILABLE',
  },
  application: {
    adoptableCatId: bianca.id,
    applicant: { fullName: 'Lucía Pérez', email: 'lucia@test.com', phone: '2494000000' },
    home: {
      hasOtherPets: true,
      hasRegularVet: true,
      vaccinationsUpToDate: true,
      petsNeutered: true,
      householdAgrees: true,
      housingType: 'rented',
      rentalAllowsPets: true,
      trustedCaregiver: true,
    },
    adaptation: { willingToSupportAdaptation: true },
    care: {
      hasStableIncome: true,
      canCoverVetEmergency: true,
      previousPetsDeathContext: 'Siempre estuvieron acompañadas por su veterinaria.',
    },
    safety: { homeSafetyStatus: 'protected' },
    commitments: {
      acceptsMandatoryNeutering: true,
      commitsNeuteringProof: true,
      acceptsFollowUp: true,
      acceptsResponsibleReturnClause: true,
      acceptsLongTermCommitment: true,
    },
  },
  emailDelivered: true,
  createdAt: '2026-09-19T21:30:00Z',
};

describe('AdminAdoptionsComponent', () => {
  let fixture: ComponentFixture<AdminAdoptionsComponent>;
  let component: AdminAdoptionsComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminAdoptionsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(AdminAdoptionsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('lists cats with friendly status, publication and calculated age', () => {
    loadInitial();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Bianca');
    expect(text).toContain('Hembra');
    expect(text).toContain('Disponible');
    expect(text).toContain('No publicado');
    expect(component.ageLabel(null)).toBe('Edad no informada');
    expect(component.ageLabel('2025-01-20')).not.toBe('Edad no informada');
  });

  it('filters cats by name, status and publication', () => {
    const adopted = { ...bianca, id: 'cat-2', name: 'Orión', status: 'ADOPTED' as const };
    loadInitial([bianca, adopted]);
    component.catSearch = 'ori';
    component.catStatus = 'ADOPTED';
    component.publication = 'unpublished';
    expect(component.filteredCats().map((cat) => cat.name)).toEqual(['Orión']);
  });

  it('creates a cat and refreshes the collection after success', () => {
    loadInitial([]);
    component.openCreate();
    component.formModel = {
      name: 'Mora',
      sex: 'FEMALE',
      birthDate: '',
      shortDescription: 'Muy compañera.',
      imageUrl: 'https://cdn.test/mora.jpg',
      status: 'AVAILABLE',
      published: true,
      displayOrder: 2,
    };
    component.saveCat();

    const create = http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body.birthDate).toBeNull();
    create.flush({ ...bianca, ...create.request.body, id: 'cat-mora' });
    http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats`).flush([]);
    expect(component.feedback.current()?.message).toBe('Michi creado correctamente.');
  });

  it('edits with a minimal PATCH and refreshes afterwards', () => {
    loadInitial();
    component.openEdit(bianca);
    component.formModel.name = 'Bianca II';
    component.saveCat();

    const update = http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats/${bianca.id}`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ name: 'Bianca II' });
    update.flush({ ...bianca, name: 'Bianca II' });
    http
      .expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats`)
      .flush([{ ...bianca, name: 'Bianca II' }]);
  });

  it('uses publish, reserve, pause and adopt actions and confirms destructive transitions', () => {
    loadInitial();

    component.publish(bianca);
    flushAction('publish');

    component.reserve(bianca);
    flushAction('reserve');

    component.requestConfirmation(bianca, 'pause');
    expect(component.confirmation()?.action).toBe('pause');
    component.confirmAction();
    flushAction('pause');

    component.requestConfirmation({ ...bianca, status: 'RESERVED' }, 'adopt');
    component.confirmAction();
    flushAction('adopt');
  });

  it('returns paused or reserved cats to available through the existing PATCH contract', () => {
    loadInitial();
    component.makeAvailable({ ...bianca, status: 'PAUSED' });
    const update = http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats/${bianca.id}`);
    expect(update.request.body).toEqual({ status: 'AVAILABLE' });
    update.flush({ ...bianca, status: 'AVAILABLE' });
    http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats`).flush([bianca]);
  });

  it('lists applications with and without a cat and opens a structured detail', () => {
    const withoutPreference: AdminAdoptionApplication = {
      ...baseApplication,
      id: 'application-2',
      adoptableCatId: null,
      interest: null,
      application: { ...baseApplication.application, adoptableCatId: null },
      emailDelivered: false,
    };
    loadInitial([bianca], [baseApplication, withoutPreference]);
    component.activeTab.set('applications');
    fixture.detectChanges();

    const pageText = fixture.nativeElement.textContent;
    expect(pageText).toContain('Bianca');
    expect(pageText).toContain('Sin preferencia específica');
    expect(pageText).toContain('Entregado');
    expect(pageText).toContain('No entregado');

    component.detailApplication.set(baseApplication);
    fixture.detectChanges();
    const detail = fixture.nativeElement.querySelector('.application-dialog').textContent;
    expect(detail).toContain('1. Tus datos');
    expect(detail).toContain('2. Tu hogar');
    expect(detail).toContain('3. Adaptación');
    expect(detail).toContain('4. Salud y cuidados');
    expect(detail).toContain('5. Seguridad');
    expect(detail).toContain('6. Compromiso');
    expect(detail).toContain(baseApplication.id);
  });

  it('keeps each tab recoverable when its request fails', () => {
    http
      .expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    http
      .expectOne(`${ADMIN_API_BASE_URL}/adoptions/applications`)
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(component.catsError()).toBe(true);
    expect(component.applicationsError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar los michis');

    component.activeTab.set('applications');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar las solicitudes');
  });

  function loadInitial(
    cats: AdminAdoptableCat[] = [bianca],
    applications: AdminAdoptionApplication[] = [baseApplication],
  ): void {
    http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats`).flush(cats);
    http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/applications`).flush(applications);
    fixture.detectChanges();
  }

  function flushAction(action: 'publish' | 'reserve' | 'pause' | 'adopt'): void {
    const request = http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats/${bianca.id}/${action}`);
    expect(request.request.method).toBe('POST');
    request.flush(bianca);
    http.expectOne(`${ADMIN_API_BASE_URL}/adoptions/cats`).flush([bianca]);
  }
});
