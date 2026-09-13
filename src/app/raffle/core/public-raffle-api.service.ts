import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { PUBLIC_API_BASE_URL } from '../../shop/core/commerce.models';
import {
  PublicRaffle,
  PublicRaffleNumbersResponse,
  RafflePreferenceResponse,
  RafflePurchaseStatusResponse,
  RaffleReservationRequest,
  RaffleReservationResponse,
} from './raffle.models';

@Injectable({ providedIn: 'root' })
export class PublicRaffleApiService {
  constructor(private readonly http: HttpClient) {}

  active(): Observable<PublicRaffle> {
    return this.http.get<PublicRaffle>(`${PUBLIC_API_BASE_URL}/raffles/active`);
  }

  byId(raffleId: string): Observable<PublicRaffle> {
    return this.http.get<PublicRaffle>(`${PUBLIC_API_BASE_URL}/raffles/${raffleId}`);
  }

  numbers(raffleId: string): Observable<PublicRaffleNumbersResponse> {
    return this.http.get<PublicRaffleNumbersResponse>(
      `${PUBLIC_API_BASE_URL}/raffles/${raffleId}/numbers`,
    );
  }

  reserve(
    raffleId: string,
    body: RaffleReservationRequest,
    idempotencyKey: string,
  ): Observable<RaffleReservationResponse> {
    return this.http.post<RaffleReservationResponse>(
      `${PUBLIC_API_BASE_URL}/raffles/${raffleId}/reservations`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }

  createPreference(rafflePurchaseId: string): Observable<RafflePreferenceResponse> {
    return this.http.post<RafflePreferenceResponse>(
      `${PUBLIC_API_BASE_URL}/raffle-purchases/${rafflePurchaseId}/mercado-pago/preference`,
      {},
    );
  }

  purchaseStatus(rafflePurchaseId: string): Observable<RafflePurchaseStatusResponse> {
    return this.http.get<RafflePurchaseStatusResponse>(
      `${PUBLIC_API_BASE_URL}/raffle-purchases/${rafflePurchaseId}/status`,
    );
  }
}
