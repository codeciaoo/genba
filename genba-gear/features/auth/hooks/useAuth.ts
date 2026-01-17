import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/services/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setState((prev) => ({ ...prev, error: error.message, loading: false }));
        return;
      }
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      });
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((prev) => ({ ...prev, error: error.message, loading: false }));
      return { error };
    }
    return { error: null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setState((prev) => ({ ...prev, error: error.message, loading: false }));
      return { error };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      setState((prev) => ({ ...prev, error: error.message, loading: false }));
      return { error };
    }
    return { error: null };
  }, []);

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}
