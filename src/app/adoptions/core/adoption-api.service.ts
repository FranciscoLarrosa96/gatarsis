import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PUBLIC_API_BASE_URL } from '../../shop/core/commerce.models';
import {
  AdoptableCat,
  AdoptionApplicationRequest,
  AdoptionApplicationResponse,
} from './adoption.models';

@Injectable({ providedIn: 'root' })
export class AdoptionApiService {
  constructor(private readonly http: HttpClient) {}

  getAdoptableCats(): Observable<AdoptableCat[]> {
    return this.http.get<AdoptableCat[]>(`${PUBLIC_API_BASE_URL}/adoptions/cats`);
  }

  submit(application: AdoptionApplicationRequest): Observable<AdoptionApplicationResponse> {
    return this.http.post<AdoptionApplicationResponse>(
      `${PUBLIC_API_BASE_URL}/adoptions/applications`,
      application,
    );
  }
}
