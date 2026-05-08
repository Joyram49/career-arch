export interface IOrgProfileResponse {
  id: string;
  orgId: string;
  companyName: string;
  logoUrl: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  foundedYear: number | null;
  description: string | null;
  location: string | null;
  country: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  email: string;
  isApproved: boolean;
  isPaymentMethodOnFile: boolean;
  hasUnpaidIncentives: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBillingInfo {
  isPaymentMethodOnFile: boolean;
  hasUnpaidIncentives: boolean;
  card: {
    brand: string;
    last4: string;
    expMonth: string;
    expYear: string;
  } | null;
}

export interface ISetupIntentResponse {
  clientSecret: string;
  customerId: string;
}
