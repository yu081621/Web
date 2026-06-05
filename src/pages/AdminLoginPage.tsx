import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { getProfile, useAuth } from '@/contexts/AuthContext';
import {
  ShieldCheck, Eye, EyeOff, Loader2, AlertCircle,
  KeyRound, UserPlus, LogIn,
} from 'lucide-react';
import { toast } from 'sonner';

type TabType = 'login' | 'register';

export default function AdminLoginPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<TabType>('login');

  // 登录表单
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // 注册表单 — 若 URL 带 ?code=xxx 自动填充邀请码并切换到注册 tab
  const urlCode = searchParams.get('code') || '';
  const [regForm, setRegForm] = useState({
    inviteCode: urlCode, email: '', password: '', confirmPassword: '', username: '',
  });

  // URL 带邀请码时自动切换到注册 tab
  useEffect(() => {
    if (urlCode) {
      setTab('register');
      setRegStep('info'); // 邀请码已填充，直接跳到填写信息步骤
    }
  }, [urlCode]);

  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regStep, setRegStep] = useState<'code' | 'info'>(urlCode ? 'info' : 'code');
  const [codeVerifying, setCodeVerifying] = useState(false);

  // 已登录且是 admin/super_admin 则直接跳转后台
  useEffect(() => {
    if (!authLoading && user && (profile?.role === 'admin' || profile?.role === 'super_admin')) {
      navigate('/admin', { replace: true });
    }
  }, [user, profile, authLoading]);

  // ── 登录逻辑 ──────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginForm.email.trim() || !loginForm.password) {
      setLoginError('请填写管理员账号和密码');
      return;
    }
    setLoginLoading(true);
    try {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password,
      });
      if (signInErr || !signInData.user) throw new Error('管理员账号或密码错误');

      // 用 RPC 确保读到最新 role，防止缓存或策略遮蔽
      const pd = await getProfile(signInData.user.id);

      if (!pd) {
        await supabase.auth.signOut();
        throw new Error('用户信息验证失败，请联系超级管理员');
      }
      if (pd.role !== 'admin' && pd.role !== 'super_admin') {
        await supabase.auth.signOut();
        throw new Error('该账号无管理员权限，请使用管理员账号登录');
      }

      toast.success('验证成功，欢迎进入管理后台');
      navigate('/admin', { replace: true });
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── 邀请码验证（第一步）──────────────────────────────────
  const handleVerifyCode = async () => {
    const code = regForm.inviteCode.trim().toUpperCase();
    if (!code) { setRegError('请输入邀请码'); return; }
    setRegError('');
    setCodeVerifying(true);
    try {
      // 仅查询是否存在且有效（不消费，消费在注册完成后）
      const { data, error } = await supabase
        .from('admin_invite_codes')
        .select('id, is_disabled, expires_at, used_count, max_uses')
        .eq('code', code)
        .maybeSingle();

      if (error || !data) throw new Error('邀请码不存在，请确认后重新输入');
      if (data.is_disabled) throw new Error('该邀请码已被禁用');
      if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error('该邀请码已过期');
      if (data.used_count >= data.max_uses) throw new Error('邀请码已达到最大使用次数');

      toast.success('邀请码验证通过，请填写账号信息');
      setRegStep('info');
    } catch (err) {
      setRegError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setCodeVerifying(false);
    }
  };

  // ── 完成注册（第二步）────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    const { inviteCode, email, password, confirmPassword, username } = regForm;
    if (!username.trim()) { setRegError('请输入用户名'); return; }
    if (!email.trim()) { setRegError('请输入邮箱'); return; }
    if (password.length < 8) { setRegError('密码至少8位'); return; }
    if (password !== confirmPassword) { setRegError('两次输入的密码不一致'); return; }

    setRegLoading(true);
    try {
      // Step 1: 注册 Supabase Auth 账号
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { username: username.trim() } },
      });
      if (signUpErr || !signUpData.user) {
        throw new Error(signUpErr?.message || '注册失败，请稍后重试');
      }

      // Step 2: 原子消费邀请码（RPC 函数，防并发）
      const { data: consumeResult, error: consumeErr } = await supabase.rpc('consume_invite_code', {
        p_code: inviteCode.trim().toUpperCase(),
        p_user_id: signUpData.user.id,
        p_email: email.trim().toLowerCase(),
      });

      if (consumeErr) throw new Error('邀请码处理失败: ' + consumeErr.message);
      const result = consumeResult as { ok: boolean; msg: string };
      if (!result.ok) throw new Error(result.msg);

      // Step 3: 将新用户设为 admin 角色
      const { error: roleErr } = await supabase
        .from('profiles')
        .update({ role: 'admin', username: username.trim() })
        .eq('id', signUpData.user.id);

      if (roleErr) throw new Error('角色设置失败: ' + roleErr.message);

      toast.success('管理员账号注册成功！请使用该账号登录');
      // 切换到登录标签
      setTab('login');
      setLoginForm({ email: email.trim().toLowerCase(), password: '' });
      setRegForm({ inviteCode: '', email: '', password: '', confirmPassword: '', username: '' });
      setRegStep('code');
    } catch (err) {
      setRegError(err instanceof Error ? err.message : '注册失败，请重试');
    } finally {
      setRegLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--background))' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(25 60% 96%) 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo & 标题 */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-balance" style={{ color: 'hsl(var(--foreground))' }}>
            管理员后台
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
            寻味后台管理系统 · 仅限授权管理员访问
          </p>
        </div>

        {/* 标签切换 */}
        <div className="flex rounded-xl overflow-hidden border border-border mb-4 bg-muted/40">
          {([['login', '管理员登录', <LogIn size={14} />], ['register', '邀请码注册', <UserPlus size={14} />]] as const).map(
            ([key, label, icon]) => (
              <button
                key={key}
                onClick={() => { setTab(key); setLoginError(''); setRegError(''); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-all"
                style={{
                  background: tab === key ? 'hsl(var(--card))' : 'transparent',
                  color: tab === key ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {icon}{label}
              </button>
            )
          )}
        </div>

        {/* 登录表单 */}
        {tab === 'login' && (
          <div className="xunwei-card p-6">
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {loginError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="admin-email">管理员邮箱</label>
                <input
                  id="admin-email" type="email" autoComplete="username"
                  placeholder="请输入管理员邮箱"
                  value={loginForm.email}
                  onChange={e => { setLoginForm(f => ({ ...f, email: e.target.value })); setLoginError(''); }}
                  className="xunwei-input" required disabled={loginLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="admin-password">密码</label>
                <div className="relative">
                  <input
                    id="admin-password" type={showLoginPwd ? 'text' : 'password'}
                    autoComplete="current-password" placeholder="请输入密码"
                    value={loginForm.password}
                    onChange={e => { setLoginForm(f => ({ ...f, password: e.target.value })); setLoginError(''); }}
                    className="xunwei-input pr-10" required disabled={loginLoading}
                  />
                  <button type="button" onClick={() => setShowLoginPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'hsl(var(--muted-foreground))' }} tabIndex={-1}>
                    {showLoginPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loginLoading} className="btn-primary w-full justify-center mt-2">
                {loginLoading
                  ? <><Loader2 size={16} className="animate-spin mr-2" />验证身份中...</>
                  : <><ShieldCheck size={16} className="mr-2" />登录管理后台</>}
              </button>
            </form>
          </div>
        )}

        {/* 邀请码注册表单 */}
        {tab === 'register' && (
          <div className="xunwei-card p-6">
            {regError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            {/* 步骤指示器 */}
            <div className="flex items-center gap-2 mb-5">
              {(['code', 'info'] as const).map((step, idx) => (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: regStep === step || (step === 'code' && regStep === 'info')
                        ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                      color: regStep === step || (step === 'code' && regStep === 'info')
                        ? 'white' : 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {step === 'code' && regStep === 'info' ? '✓' : idx + 1}
                  </div>
                  <span className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {step === 'code' ? '验证邀请码' : '填写账号信息'}
                  </span>
                  {idx === 0 && <div className="flex-1 h-px bg-border" />}
                </div>
              ))}
            </div>

            {/* Step 1: 邀请码验证 */}
            {regStep === 'code' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    <KeyRound size={13} className="inline mr-1.5" style={{ color: 'hsl(var(--primary))' }} />
                    邀请码
                  </label>
                  <input
                    type="text" placeholder="请输入超级管理员分发的邀请码"
                    value={regForm.inviteCode}
                    onChange={e => { setRegForm(f => ({ ...f, inviteCode: e.target.value.toUpperCase() })); setRegError(''); }}
                    className="xunwei-input font-mono tracking-widest text-center uppercase"
                    disabled={codeVerifying}
                    maxLength={16}
                  />
                  <p className="text-xs mt-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    邀请码由超级管理员在后台生成并分发，请向管理员索取
                  </p>
                </div>
                <button onClick={handleVerifyCode} disabled={codeVerifying} className="btn-primary w-full justify-center">
                  {codeVerifying
                    ? <><Loader2 size={16} className="animate-spin mr-2" />验证中...</>
                    : <><KeyRound size={16} className="mr-2" />验证邀请码</>}
                </button>
              </div>
            )}

            {/* Step 2: 账号信息 */}
            {regStep === 'info' && (
              <form onSubmit={handleRegister} className="space-y-3" noValidate>
                <div>
                  <label className="block text-sm font-medium mb-1.5">用户名</label>
                  <input
                    type="text" placeholder="请输入管理员用户名"
                    value={regForm.username}
                    onChange={e => { setRegForm(f => ({ ...f, username: e.target.value })); setRegError(''); }}
                    className="xunwei-input" required disabled={regLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">邮箱</label>
                  <input
                    type="email" placeholder="请输入邮箱地址"
                    value={regForm.email}
                    onChange={e => { setRegForm(f => ({ ...f, email: e.target.value })); setRegError(''); }}
                    className="xunwei-input" required disabled={regLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">密码（至少8位）</label>
                  <div className="relative">
                    <input
                      type={showRegPwd ? 'text' : 'password'} placeholder="请设置登录密码"
                      value={regForm.password}
                      onChange={e => { setRegForm(f => ({ ...f, password: e.target.value })); setRegError(''); }}
                      className="xunwei-input pr-10" required disabled={regLoading}
                    />
                    <button type="button" onClick={() => setShowRegPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'hsl(var(--muted-foreground))' }} tabIndex={-1}>
                      {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">确认密码</label>
                  <input
                    type="password" placeholder="请再次输入密码"
                    value={regForm.confirmPassword}
                    onChange={e => { setRegForm(f => ({ ...f, confirmPassword: e.target.value })); setRegError(''); }}
                    className="xunwei-input" required disabled={regLoading}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setRegStep('code'); setRegError(''); }}
                    className="flex-1 py-2 rounded-lg border border-border text-sm font-medium transition-all hover:bg-accent"
                    disabled={regLoading}
                  >
                    上一步
                  </button>
                  <button type="submit" disabled={regLoading} className="btn-primary flex-1 justify-center">
                    {regLoading
                      ? <><Loader2 size={15} className="animate-spin mr-1.5" />注册中...</>
                      : <><UserPlus size={15} className="mr-1.5" />完成注册</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 底部说明 */}
        <div className="text-center mt-4 space-y-1">
          <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
            本页面为管理员专属入口，未授权访问将被拒绝
          </p>
          <Link to="/" className="inline-block text-sm transition-all hover:underline"
            style={{ color: 'hsl(var(--primary))' }}>
            ← 返回网站首页
          </Link>
        </div>
      </div>
    </div>
  );
}
