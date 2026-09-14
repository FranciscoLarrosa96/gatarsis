import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PUBLIC_API_BASE_URL } from '../../shop/core/commerce.models';
import { AdoptionApiService } from './adoption-api.service';
import { AdoptionApplicationRequest } from './adoption.models';

describe('AdoptionApiService', () => {
  it('posts only the application contract to the public adoption endpoint', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(AdoptionApiService);
    const http = TestBed.inject(HttpTestingController);
    const application: AdoptionApplicationRequest = {
      applicant: { fullName: 'Ana Pérez', email: 'ana@example.com', phone: '2494000000' },
      home: {
        hasOtherPets: false,
        householdAgrees: true,
        housingType: 'owned',
        trustedCaregiver: true,
      },
      adaptation: { willingToSupportAdaptation: true },
      care: {
        hasStableIncome: true,
        canCoverVetEmergency: true,
        previousPetsDeathContext: 'No tuve mascotas anteriormente.',
      },
      safety: { homeSafetyStatus: 'protected' },
      commitments: {
        acceptsMandatoryNeutering: true,
        commitsNeuteringProof: true,
        acceptsFollowUp: true,
        acceptsResponsibleReturnClause: true,
        acceptsLongTermCommitment: true,
      },
      website: '',
    };

    service.submit(application).subscribe((response) => expect(response.success).toBe(true));
    const request = http.expectOne(`${PUBLIC_API_BASE_URL}/adoptions/applications`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(application);
    expect(request.request.body.to).toBeUndefined();
    expect(request.request.body.subject).toBeUndefined();
    request.flush({ success: true });
    http.verify();
  });
});
