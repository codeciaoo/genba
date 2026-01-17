import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import { useAuthContext } from '@/features/auth/context/AuthContext';
import type { BankAccount, CreateBankAccountInput, UpdateBankAccountInput } from '@/features/auth/domain/types';

interface UseBankAccountsReturn {
  bankAccounts: BankAccount[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createBankAccount: (input: CreateBankAccountInput) => Promise<{ data: BankAccount | null; error: string | null }>;
  updateBankAccount: (id: string, input: UpdateBankAccountInput) => Promise<{ error: string | null }>;
  deleteBankAccount: (id: string) => Promise<{ error: string | null }>;
  setDefaultAccount: (id: string) => Promise<{ error: string | null }>;
}

export function useBankAccounts(): UseBankAccountsReturn {
  const { user } = useAuthContext();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBankAccounts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const accounts: BankAccount[] = (data || []).map((item) => ({
        id: item.id,
        userId: item.user_id,
        bankName: item.bank_name,
        branchName: item.branch_name,
        accountType: item.account_type,
        accountNumber: item.account_number,
        accountHolder: item.account_holder,
        isDefault: item.is_default,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));

      setBankAccounts(accounts);
    } catch (err) {
      console.error('Error fetching bank accounts:', err);
      setError('口座情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBankAccounts();
  }, [fetchBankAccounts]);

  const createBankAccount = useCallback(
    async (input: CreateBankAccountInput): Promise<{ data: BankAccount | null; error: string | null }> => {
      if (!user) {
        return { data: null, error: 'ユーザー情報が取得できませんでした' };
      }

      try {
        const { data, error: insertError } = await supabase
          .from('bank_accounts')
          .insert({
            user_id: user.id,
            bank_name: input.bankName,
            branch_name: input.branchName,
            account_type: input.accountType,
            account_number: input.accountNumber,
            account_holder: input.accountHolder,
            is_default: input.isDefault ?? false,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        const newAccount: BankAccount = {
          id: data.id,
          userId: data.user_id,
          bankName: data.bank_name,
          branchName: data.branch_name,
          accountType: data.account_type,
          accountNumber: data.account_number,
          accountHolder: data.account_holder,
          isDefault: data.is_default,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };

        await fetchBankAccounts();
        return { data: newAccount, error: null };
      } catch (err) {
        console.error('Error creating bank account:', err);
        return { data: null, error: '口座の登録に失敗しました' };
      }
    },
    [user, fetchBankAccounts]
  );

  const updateBankAccount = useCallback(
    async (id: string, input: UpdateBankAccountInput): Promise<{ error: string | null }> => {
      try {
        const updateData: Record<string, unknown> = {};
        if (input.bankName !== undefined) updateData.bank_name = input.bankName;
        if (input.branchName !== undefined) updateData.branch_name = input.branchName;
        if (input.accountType !== undefined) updateData.account_type = input.accountType;
        if (input.accountNumber !== undefined) updateData.account_number = input.accountNumber;
        if (input.accountHolder !== undefined) updateData.account_holder = input.accountHolder;
        if (input.isDefault !== undefined) updateData.is_default = input.isDefault;

        const { error: updateError } = await supabase
          .from('bank_accounts')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }

        await fetchBankAccounts();
        return { error: null };
      } catch (err) {
        console.error('Error updating bank account:', err);
        return { error: '口座の更新に失敗しました' };
      }
    },
    [fetchBankAccounts]
  );

  const deleteBankAccount = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      try {
        const { error: deleteError } = await supabase
          .from('bank_accounts')
          .delete()
          .eq('id', id);

        if (deleteError) {
          throw deleteError;
        }

        await fetchBankAccounts();
        return { error: null };
      } catch (err) {
        console.error('Error deleting bank account:', err);
        return { error: '口座の削除に失敗しました' };
      }
    },
    [fetchBankAccounts]
  );

  const setDefaultAccount = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      return updateBankAccount(id, { isDefault: true });
    },
    [updateBankAccount]
  );

  return {
    bankAccounts,
    loading,
    error,
    refresh: fetchBankAccounts,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultAccount,
  };
}
