import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PUBLIC_API_BASE_URL } from '../../shop/core/commerce.models';
import { AdoptionApplicationRequest, AdoptionApplicationResponse } from './adoption.models';

@Injectable({ providedIn: 'root' })
export class AdoptionApiService {
  constructor(private readonly http: HttpClient) {}

  submit(application: AdoptionApplicationRequest): Observable<AdoptionApplicationResponse> {
    return this.http.post<AdoptionApplicationResponse>(
      `${PUBLIC_API_BASE_URL}/adoptions/applications`,
      application,
    );
  }
}
