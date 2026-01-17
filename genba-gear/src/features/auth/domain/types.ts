import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export interface AuthResult {
  user: User | null;
  error: string | null;
}

export interface BusinessProfile {
  id: string;
  userId: string;
  businessName: string;
  representativeName: string | null;
  postalCode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  invoiceRegistrationNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  branchName: string;
  accountType: '普通' | '当座';
  accountNumber: string;
  accountHolder: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBusinessProfileInput {
  businessName: string;
  representativeName?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  invoiceRegistrationNumber?: string;
}

export interface UpdateBusinessProfileInput extends Partial<CreateBusinessProfileInput> {}

export interface CreateBankAccountInput {
  bankName: string;
  branchName: string;
  accountType: '普通' | '当座';
  accountNumber: string;
  accountHolder: string;
  isDefault?: boolean;
}

export interface UpdateBankAccountInput extends Partial<CreateBankAccountInput> {}
