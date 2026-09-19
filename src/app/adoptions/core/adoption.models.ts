export type YesNo = 'yes' | 'no';

export type HousingType = 'owned' | 'rented' | 'other';

export type HomeSafetyStatus = 'protected' | 'will_install' | 'no' | 'not_applicable';

export type AdoptableCatSex = 'FEMALE' | 'MALE';

export type PublicAdoptableCatStatus = 'AVAILABLE' | 'RESERVED';

export interface AdoptableCat {
  id: string;
  name: string;
  sex: AdoptableCatSex;
  birthDate: string | null;
  shortDescription: string;
  imageUrl: string | null;
  status: PublicAdoptableCatStatus;
}

export interface AdoptionApplicationRequest {
  adoptableCatId?: string | null;
  applicant: {
    fullName: string;
    email: string;
    phone: string;
  };
  home: {
    hasOtherPets: boolean;
    hasRegularVet?: boolean;
    vaccinationsUpToDate?: boolean;
    petsNeutered?: boolean;
    householdAgrees: boolean;
    housingType: HousingType;
    rentalAllowsPets?: boolean;
    trustedCaregiver: boolean;
  };
  adaptation: {
    willingToSupportAdaptation: boolean;
  };
  care: {
    hasStableIncome: boolean;
    canCoverVetEmergency: boolean;
    previousPetsDeathContext: string;
  };
  safety: {
    homeSafetyStatus: HomeSafetyStatus;
  };
  commitments: {
    acceptsMandatoryNeutering: boolean;
    commitsNeuteringProof: boolean;
    acceptsFollowUp: boolean;
    acceptsResponsibleReturnClause: boolean;
    acceptsLongTermCommitment: boolean;
  };
  website: string;
}

export interface AdoptionApplicationResponse {
  success: true;
}
