import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { UtensilsCrossed, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';

  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirm: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error('请填写邮箱和密码');
      return;
    }
    setLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    setLoading(false);
    if (error) {
      toast.error('邮箱或密码错误，请重试');
    } else {
      // 用 RPC 确保读到最新 role（含 super_admin）
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const pd = await getProfile(authUser.id);
        if (pd?.role === 'admin' || pd?.role === 'super_admin') {
          toast.success('登录成功，正在进入管理后台');
          navigate('/admin', { replace: true });
          return;
        }
      }
      toast.success('登录成功，欢迎回来！');
      navigate(from, { replace: true });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { username, email, password, confirm } = registerForm;
    if (!username || !email || !password) { toast.error('请填写完整信息'); return; }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/.test(username)) {
      toast.error('用户名2-20位，支持中英文、数字和下划线');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) { toast.error('请输入有效邮箱'); return; }
    if (password.length < 8) { toast.error('密码至少8位'); return; }
    if (password !== confirm) { toast.error('两次密码不一致'); return; }
    if (!agreed) { toast.error('请阅读并同意用户协议和隐私政策'); return; }

    setLoading(true);
    const { error } = await signUp(email, password, username);
    setLoading(false);
    if (error) {
      if (error.message?.includes('already registered')) {
        toast.error('该邮箱已注册，请直接登录');
      } else {
        toast.error(error.message || '注册失败，请重试');
      }
    } else {
      toast.success('注册成功，欢迎加入寻味！');
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'hsl(var(--background))' }}>
      {/* Left panel - decorative */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(39,86%,51%) 100%)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-40 h-40 rounded-full border-4 border-white" />
          <div className="absolute bottom-32 right-16 w-24 h-24 rounded-full border-4 border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-2 border-white" />
        </div>
        <div className="relative z-10 text-center text-white">
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <UtensilsCrossed size={36} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-3">寻味</h1>
          <p className="text-xl text-white/90 mb-6">探索城市美食，记录美味时光</p>
          <div className="flex flex-col gap-3 text-sm text-white/80">
            <p>🍜 发现身边隐藏的美食宝藏</p>
            <p>📖 记录每一次探店的故事</p>
            <p>🌟 和好友分享味蕾的感动</p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-8 hover:text-primary transition-colors">
            <ArrowLeft size={16} />
            返回首页
          </Link>

          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: 'hsl(var(--primary))' }}>
              <UtensilsCrossed size={20} />
            </div>
            <span className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>寻味</span>
          </div>

          {/* Tab switch */}
          <div className="flex gap-6 mb-8">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`text-xl font-bold pb-2 border-b-2 transition-all ${
                  mode === m
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground'
                }`}
                style={{ borderColor: mode === m ? 'hsl(var(--primary))' : 'transparent' }}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">邮箱</label>
                <input
                  type="email"
                  placeholder="请输入邮箱"
                  value={loginForm.email}
                  onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                  className="xunwei-input"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">密码</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="请输入密码"
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    className="xunwei-input pr-12"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center text-base mt-2"
              >
                {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                {loading ? '登录中...' : '立即登录'}
              </button>
              <p className="text-center text-sm text-muted-foreground">
                还没有账号？
                <button type="button" onClick={() => setMode('register')} className="ml-1 font-medium" style={{ color: 'hsl(var(--primary))' }}>
                  立即注册
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">用户名</label>
                <input
                  type="text"
                  placeholder="2-20位，支持中英文和下划线"
                  value={registerForm.username}
                  onChange={e => setRegisterForm(f => ({ ...f, username: e.target.value }))}
                  className="xunwei-input"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">邮箱</label>
                <input
                  type="email"
                  placeholder="请输入邮箱"
                  value={registerForm.email}
                  onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                  className="xunwei-input"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">密码</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="至少8位"
                    value={registerForm.password}
                    onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                    className="xunwei-input pr-12"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">确认密码</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="再次输入密码"
                  value={registerForm.confirm}
                  onChange={e => setRegisterForm(f => ({ ...f, confirm: e.target.value }))}
                  className="xunwei-input"
                  autoComplete="new-password"
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  className="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ borderColor: agreed ? 'hsl(var(--primary))' : 'hsl(var(--border))', background: agreed ? 'hsl(var(--primary))' : 'white' }}
                  onClick={() => setAgreed(!agreed)}
                >
                  {agreed && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="text-sm text-muted-foreground leading-relaxed">
                  我已阅读并同意
                  <a href="#" className="mx-1" style={{ color: 'hsl(var(--primary))' }}>用户协议</a>
                  和
                  <a href="#" className="mx-1" style={{ color: 'hsl(var(--primary))' }}>隐私政策</a>
                </span>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center text-base"
              >
                {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                {loading ? '注册中...' : '立即注册'}
              </button>
              <p className="text-center text-sm text-muted-foreground">
                已有账号？
                <button type="button" onClick={() => setMode('login')} className="ml-1 font-medium" style={{ color: 'hsl(var(--primary))' }}>
                  立即登录
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
