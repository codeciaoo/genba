import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';
import type { AuthState, AuthResult, BusinessProfile } from '../domain/types';

interface AuthContextValue extends AuthState {
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string, businessName?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  businessProfile: BusinessProfile | null;
  loadingProfile: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ビジネスプロファイルの取得
  const fetchBusinessProfile = useCallback(async (userId: string) => {
    setLoadingProfile(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching business profile:', fetchError);
      }

      if (data) {
        setBusinessProfile({
          id: data.id,
          userId: data.user_id,
          businessName: data.business_name,
          representativeName: data.representative_name,
          postalCode: data.postal_code,
          address: data.address,
          phone: data.phone,
          email: data.email,
          invoiceRegistrationNumber: data.invoice_registration_number,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        });
      } else {
        setBusinessProfile(null);
      }
    } catch (err) {
      console.error('Error in fetchBusinessProfile:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // 初期セッション取得と認証状態の監視
  useEffect(() => {
    // 初期セッションの取得
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchBusinessProfile(initialSession.user.id);
      }
      setLoading(false);
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          fetchBusinessProfile(currentSession.user.id);
        } else {
          setBusinessProfile(null);
        }

        // サインイン/サインアップ時はエラーをクリア
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setError(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchBusinessProfile]);

  // メール/パスワードでサインイン
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      setError(null);
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          const errorMessage = getAuthErrorMessage(signInError.message);
          setError(errorMessage);
          return { user: null, error: errorMessage };
        }

        return { user: data.user, error: null };
      } catch (err) {
        const errorMessage = '予期しないエラーが発生しました';
        setError(errorMessage);
        return { user: null, error: errorMessage };
      }
    },
    []
  );

  // メール/パスワードでサインアップ
  const signUpWithEmail = useCallback(
    async (email: string, password: string, businessName?: string): Promise<AuthResult> => {
      setError(null);
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          const errorMessage = getAuthErrorMessage(signUpError.message);
          setError(errorMessage);
          return { user: null, error: errorMessage };
        }

        // ユーザープロファイルを作成
        if (data.user && businessName) {
          const { error: profileError } = await supabase.from('business_profiles').insert({
            user_id: data.user.id,
            business_name: businessName,
          });

          if (profileError) {
            console.error('Error creating business profile:', profileError);
          }
        }

        return { user: data.user, error: null };
      } catch (err) {
        const errorMessage = '予期しないエラーが発生しました';
        setError(errorMessage);
        return { user: null, error: errorMessage };
      }
    },
    []
  );

  // サインアウト
  const signOut = useCallback(async () => {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setError(getAuthErrorMessage(signOutError.message));
      }
      setBusinessProfile(null);
    } catch (err) {
      setError('ログアウトに失敗しました');
    }
  }, []);

  // セッションの更新
  const refreshSession = useCallback(async () => {
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
      }
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (err) {
      console.error('Error refreshing session:', err);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshSession,
    businessProfile,
    loadingProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// エラーメッセージの日本語化
function getAuthErrorMessage(message: string): string {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
    'Email not confirmed': 'メールアドレスの確認が完了していません',
    'User already registered': 'このメールアドレスは既に登録されています',
    'Password should be at least 6 characters': 'パスワードは6文字以上で入力してください',
    'Unable to validate email address: invalid format':
      'メールアドレスの形式が正しくありません',
    'Email rate limit exceeded': '認証の試行回数が上限に達しました。しばらく待ってから再試行してください',
    'Network request failed': 'ネットワークに接続できません。接続を確認してください',
  };

  return errorMessages[message] || message;
}
