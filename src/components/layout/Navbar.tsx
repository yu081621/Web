import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import {
  UtensilsCrossed, Search, Menu, X, User, LogOut,
  BookOpen, LayoutDashboard, ChevronDown, Bell, CheckCheck
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  is_read: boolean;
  diary_id: string | null;
  created_at: string;
}

export default function Navbar() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // 获取通知
  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data as Notification[] || []);
  };

  // 标记全部已读
  const markAllRead = async () => {
    if (!user || !unreadCount) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  // 点击通知 → 跳转日记
  const handleNotifClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
    }
    setNotifOpen(false);
    if (n.diary_id) navigate(`/diaries/${n.diary_id}`);
  };

  useEffect(() => {
    if (user) fetchNotifications();
    else setNotifications([]);
  }, [user]);

  // Realtime 订阅新通知
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`notif-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, payload => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
        toast.info((payload.new as Notification).title);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // 点击外部关闭通知面板
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMenuOpen(false); setUserDropOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    toast.success('已退出登录');
    navigate('/');
  };

  const navLinks = [
    { href: '/', label: '首页' },
    { href: '/shops', label: '探店' },
    { href: '/diaries', label: '日记' },
    { href: '/rank', label: '榜单' },
  ];

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <nav
      className="xunwei-navbar"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.95)',
        borderBottom: scrolled ? '1px solid hsl(var(--border))' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <UtensilsCrossed size={18} />
          </div>
          <span className="text-xl font-bold" style={{ color: 'hsl(var(--primary))' }}>寻味</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                color: isActive(href) ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                background: isActive(href) ? 'hsla(27,80%,52%,0.1)' : 'transparent',
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/search"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-accent"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            <Search size={18} />
          </Link>

          {/* 通知铃铛（仅登录用户） */}
          {!loading && user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(v => !v); if (!notifOpen) fetchNotifications(); }}
                className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-accent"
                style={{ color: 'hsl(var(--muted-foreground))' }}
                title="通知"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-xl shadow-xl border border-border z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-semibold text-sm">消息通知</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="flex items-center gap-1 text-xs transition-colors hover:opacity-70" style={{ color: 'hsl(var(--primary))' }}>
                        <CheckCheck size={13} />全部已读
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">暂无通知</div>
                    ) : notifications.map(n => (
                      <button key={n.id} onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 border-b border-border last:border-0 transition-colors hover:bg-accent ${!n.is_read ? 'bg-primary/5' : ''}`}>
                        <div className="flex items-start gap-2">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-balance">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 text-pretty line-clamp-2">{n.content}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {new Date(n.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 用户头像下拉 / 登录按钮 */}
          {!loading && (
            <>
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropOpen(!userDropOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:bg-accent"
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-primary text-white text-xs font-bold"
                      style={{ background: 'hsl(var(--primary))' }}>
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{(profile?.username || user.email || '?')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <span className="hidden md:block text-sm font-medium max-w-[80px] truncate">
                      {profile?.username || '用户'}
                    </span>
                    <ChevronDown size={14} className="hidden md:block text-muted-foreground" />
                  </button>

                  {userDropOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-card rounded-xl shadow-lg border border-border z-50 py-1 overflow-hidden">
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-sm">
                        <User size={15} style={{ color: 'hsl(var(--primary))' }} />
                        <span>个人中心</span>
                      </Link>
                      <Link to="/diary/publish" className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-sm">
                        <BookOpen size={15} style={{ color: 'hsl(var(--primary))' }} />
                        <span>发布日记</span>
                      </Link>
                      {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                        <Link to="/admin" className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-sm">
                          <LayoutDashboard size={15} style={{ color: 'hsl(var(--primary))' }} />
                          <span>管理后台</span>
                        </Link>
                      )}
                      <hr className="border-border my-1" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-sm text-left"
                        style={{ color: 'hsl(var(--destructive))' }}
                      >
                        <LogOut size={15} />
                        <span>退出登录</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* 管理员入口（未登录时常驻显示） */}
                  <Link
                    to="/admin/login"
                    className="hidden md:flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all hover:opacity-80"
                    style={{
                      color: 'hsl(var(--muted-foreground))',
                      borderColor: 'hsl(var(--border))',
                    }}
                    title="管理员后台入口"
                  >
                    <LayoutDashboard size={12} />
                    <span>管理后台</span>
                  </Link>
                  <Link
                    to="/login"
                    className="btn-primary text-sm px-5 py-2"
                  >
                    登录 / 注册
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden w-9 h-9 rounded-full flex items-center justify-center hover:bg-accent transition-all"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              className="flex items-center px-6 py-4 text-sm font-medium border-b border-border last:border-0 transition-colors hover:bg-accent"
              style={{ color: isActive(href) ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          {user && (
            <>
              <Link to="/profile" className="flex items-center px-6 py-4 text-sm font-medium border-b border-border transition-colors hover:bg-accent">
                个人中心
              </Link>
              <Link to="/diary/publish" className="flex items-center px-6 py-4 text-sm font-medium border-b border-border transition-colors hover:bg-accent">
                发布日记
              </Link>
              {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
                <Link to="/admin" className="flex items-center px-6 py-4 text-sm font-medium border-b border-border transition-colors hover:bg-accent">
                  管理后台
                </Link>
              )}
              {profile?.role !== 'admin' && profile?.role !== 'super_admin' && (
                <Link to="/admin/login" className="flex items-center px-6 py-4 text-sm font-medium border-b border-border transition-colors hover:bg-accent"
                  style={{ color: 'hsl(var(--muted-foreground))' }}>
                  管理员登录
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-6 py-4 text-sm font-medium transition-colors hover:bg-accent"
                style={{ color: 'hsl(var(--destructive))' }}
              >
                退出登录
              </button>
            </>
          )}
          {!user && !loading && (
            <Link to="/admin/login" className="flex items-center px-6 py-4 text-sm font-medium border-b border-border transition-colors hover:bg-accent"
              style={{ color: 'hsl(var(--muted-foreground))' }}>
              <LayoutDashboard size={15} className="mr-3" style={{ color: 'hsl(var(--primary))' }} />
              管理后台
            </Link>
          )}
        </div>
      )}
      {/* Overlay for closing dropdowns */}
      {userDropOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserDropOpen(false)} />
      )}
    </nav>
  );
}
