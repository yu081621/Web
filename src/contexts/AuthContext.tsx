import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/index';
import { toast } from 'sonner';

// 用 SECURITY DEFINER RPC 获取当前用户的完整 profile（含 role），最多重试 3 次
export async function getProfile(userId: string): Promise<Profile | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // 优先用 RPC（绕过所有 RLS，直接读 role）
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc('get_my_profile');
      if (!rpcErr && rpcData && rpcData.length > 0) {
        return rpcData[0] as Profile;
      }
      // RPC 失败时回退到直接查表
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data) return data as Profile;
      if (attempt < 3) await new Promise(r => setTimeout(r, 300 * attempt));
    } catch {
      if (attempt < 3) await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }
  console.error('[getProfile] 3 次重试均失败，userId:', userId);
  return null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'username' | 'bio' | 'avatar_url'>>) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) { setProfile(null); return; }
    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) getProfile(session.user.id).then(p => setProfile(p));
      })
      .catch(error => {
        toast.error(`获取登录状态失败: ${error.message}`);
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(p => setProfile(p));
      } else {
        setProfile(null);
      }
    });

    // 页面重新可见时刷新 profile（Tab 切回、手机解锁等场景）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getUser().then(({ data: { user: u } }) => {
          if (u) getProfile(u.id).then(p => { if (p) setProfile(p); });
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      const userId = data.user?.id;
      if (userId) {
        // 等待触发器创建 profiles 行，然后只更新 username/email，绝不触碰 role
        await new Promise(r => setTimeout(r, 600));
        await supabase
          .from('profiles')
          .update({ username, email })
          .eq('id', userId);
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Pick<Profile, 'username' | 'bio' | 'avatar_url'>>) => {
    if (!user) return { error: new Error('未登录') };
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) {
        console.error('[updateProfile] Supabase error:', error.message, error.details, error.hint);
        throw error;
      }
      const profileData = await getProfile(user.id);
      if (profileData) setProfile(profileData);
      return { error: null };
    } catch (err) {
      console.error('[updateProfile] catch:', err);
      return { error: err as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
