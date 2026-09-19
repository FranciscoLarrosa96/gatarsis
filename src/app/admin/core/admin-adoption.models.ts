import { AdoptableCat, AdoptionApplicationRequest } from '../../adoptions/core/adoption.models';

export type AdminAdoptableCatStatus = 'AVAILABLE' | 'RESERVED' | 'PAUSED' | 'ADOPTED';

export interface AdminAdoptableCat extends Omit<AdoptableCat, 'imageUrl' | 'status'> {
  imageUrl: string;
  status: AdminAdoptableCatStatus;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminAdoptableCatRequest {
  name: string;
  sex: AdminAdoptableCat['sex'];
  birthDate?: string | null;
  shortDescription: string;
  imageUrl: string;
  status?: AdminAdoptableCatStatus;
  published?: boolean;
  displayOrder?: number;
}

export type UpdateAdminAdoptableCatRequest = Partial<CreateAdminAdoptableCatRequest>;

export type AdminAdoptableCatAction = 'publish' | 'pause' | 'reserve' | 'adopt';

export interface AdminAdoptionApplication {
  id: string;
  adoptableCatId: string | null;
  interest: AdoptableCat | null;
  application: Omit<AdoptionApplicationRequest, 'website'>;
  emailDelivered: boolean;
  createdAt: string;
}
