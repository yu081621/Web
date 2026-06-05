import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import type { Shop, Diary, Profile, InviteCode } from '@/types/index';
import type { DiaryComment } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import ImageUploader from '@/components/common/ImageUploader';
import {
  LayoutDashboard, Store, BookOpen, Users, MessageSquare, Menu, X,
  Plus, Edit, Trash2, Check, XCircle, Loader2, Search,
  KeyRound, Copy, Ban, RefreshCw, Clock, Shield, Share2, AlertCircle,
  LogOut, Home, ChevronDown, ChevronUp, Eye, Image, FileText,
  BarChart2, Hash,
} from 'lucide-react';
import type { ShopStatus } from '@/types/index';
import { toast } from 'sonner';

const SHOP_TYPES = ['火锅', '烧烤', '中餐', '西餐', '日料', '韩料', '甜品', '小吃'];
const SHOP_AREAS = ['春熙路', '太古里', 'IFS', '宽窄巷子', '九眼桥', '其他'];

type ShopModalData = typeof EMPTY_SHOP & { id?: string };
type ShopModalState = { open: boolean; mode: 'create' | 'edit'; data: ShopModalData };

const EMPTY_SHOP: { name: string; type: string; area: string; address: string; description: string; images: string[]; price_per_person: number; status: ShopStatus } = { name: '', type: '火锅', area: '春熙路', address: '', description: '', images: [], price_per_person: 0, status: 'active' as ShopStatus };

type Section = 'overview' | 'shops' | 'diaries' | 'users' | 'comments' | 'invites';

export default function AdminPage() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Overview
  const [stats, setStats] = useState({ shops: 0, users: 0, diaries: 0, pending: 0 });
  // Shops
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopKeyword, setShopKeyword] = useState('');
  const [shopModal, setShopModal] = useState<ShopModalState>({ open: false, mode: 'create', data: { ...EMPTY_SHOP } });
  const [shopSaving, setShopSaving] = useState(false);
  // Diaries
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [diaryTab, setDiaryTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  // 批量选中（存 diary id 集合）
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  // 拒绝理由弹窗
  const [rejectModal, setRejectModal] = useState<{ open: boolean; diaryId: string; diaryUserId: string; diaryTitle: string; reason: string }>({
    open: false, diaryId: '', diaryUserId: '', diaryTitle: '', reason: '',
  });
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  // Users
  const [users, setUsers] = useState<Profile[]>([]);
  const [userKeyword, setUserKeyword] = useState('');
  // Comments
  const [comments, setComments] = useState<DiaryComment[]>([]);
  // Invites (super_admin only)
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ notes: '', max_uses: 1, expires_days: 7, batch: 1 });
  const [inviteGenerating, setInviteGenerating] = useState(false);
  const [expandedInvites, setExpandedInvites] = useState<Set<string>>(new Set());
  // 日记预览
  const [diaryPreview, setDiaryPreview] = useState<(Diary & { user_id: string }) | null>(null);
  const [previewImgIdx, setPreviewImgIdx] = useState(0);
  // 审核时补填店铺
  const [previewShopSearch, setPreviewShopSearch] = useState('');
  const [previewShopResults, setPreviewShopResults] = useState<Shop[]>([]);
  const [previewShopDropOpen, setPreviewShopDropOpen] = useState(false);
  // 权限升级二次确认弹窗
  const [roleModal, setRoleModal] = useState<{
    open: boolean; userId: string; targetRole: 'user' | 'admin'; username: string;
    password: string; verifying: boolean; error: string;
  }>({ open: false, userId: '', targetRole: 'admin', username: '', password: '', verifying: false, error: '' });

  useEffect(() => {
    if (!authLoading && (!user || (profile?.role !== 'admin' && profile?.role !== 'super_admin'))) {
      toast.error('无权访问管理后台');
      navigate('/');
    }
  }, [user, profile, authLoading]);

  useEffect(() => {
    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) return;
    fetchSection(section);
  }, [section, profile]);

  const fetchSection = async (s: Section) => {
    setLoading(true);
    switch (s) {
      case 'overview': await fetchStats(); break;
      case 'shops': await fetchShops(); break;
      case 'diaries': await fetchDiaries(diaryTab); break;
      case 'users': await fetchUsers(); break;
      case 'comments': await fetchComments(); break;
      case 'invites': await fetchInvites(); break;
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    const [shopRes, userRes, diaryRes, pendingRes] = await Promise.all([
      supabase.from('shops').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('diaries').select('id', { count: 'exact', head: true }),
      supabase.from('diaries').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setStats({ shops: shopRes.count || 0, users: userRes.count || 0, diaries: diaryRes.count || 0, pending: pendingRes.count || 0 });
  };

  const fetchShops = async () => {
    let q = supabase.from('shops').select('*').order('created_at', { ascending: false });
    if (shopKeyword) q = q.ilike('name', `%${shopKeyword}%`);
    const { data } = await q;
    setShops(data as Shop[] || []);
  };

  const fetchDiaries = async (status: typeof diaryTab) => {
    // 使用显式外键名避免联表歧义
    const { data, error } = await supabase
      .from('diaries')
      .select('*, profiles!diaries_user_id_fkey(id,username,avatar_url), shops!diaries_shop_id_fkey(id,name)')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[日记审核] 加载失败:', error.message, error.code);
      toast.error(`日记列表加载失败: ${error.message}`);
      setDiaries([]);
      return;
    }
    setDiaries((data as Diary[]) || []);
    // 切换 tab 时清空批量选中
    setSelectedIds(new Set());
  };

  useEffect(() => {
    if (section === 'diaries' && (profile?.role === 'admin' || profile?.role === 'super_admin')) {
      setLoading(true);
      fetchDiaries(diaryTab).then(() => setLoading(false));
    }
  }, [diaryTab]);

  const fetchUsers = async () => {
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (userKeyword) q = q.ilike('username', `%${userKeyword}%`);
    const { data } = await q;
    setUsers(data as Profile[] || []);
  };

  const fetchComments = async () => {
    const { data } = await supabase.from('diary_comments').select('*, profiles!diary_comments_user_id_fkey(id,username), diaries!diary_comments_diary_id_fkey(id,title)').order('created_at', { ascending: false }).limit(50);
    setComments(data as DiaryComment[] || []);
  };

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: d } = shopModal;
    if (!d.name.trim() || !d.type || !d.area) { toast.error('请填写必填项'); return; }
    setShopSaving(true);
    const payload = { name: d.name.trim(), type: d.type, area: d.area, address: d.address || null, description: d.description || null, images: d.images, price_per_person: Number(d.price_per_person) || 0, status: d.status };
    if (shopModal.mode === 'edit' && d.id) {
      await supabase.from('shops').update(payload).eq('id', d.id);
      toast.success('店铺已更新');
    } else {
      await supabase.from('shops').insert({ ...payload, created_by: user!.id });
      toast.success('店铺已创建');
    }
    setShopSaving(false);
    setShopModal(m => ({ ...m, open: false }));
    fetchShops();
  };

  const handleDeleteShop = async (id: string) => {
    if (!confirm('确认删除该店铺？')) return;
    const { error } = await supabase.from('shops').delete().eq('id', id);
    if (error) { toast.error('删除失败: ' + error.message); return; }
    toast.success('已删除');
    fetchShops();
  };

  // 发送审核通知给日记作者
  const sendAuditNotification = async (diaryUserId: string, diaryId: string, diaryTitle: string, status: 'approved' | 'rejected', reason?: string) => {
    const isApproved = status === 'approved';
    await supabase.from('notifications').insert({
      user_id: diaryUserId,
      type: isApproved ? 'diary_approved' : 'diary_rejected',
      title: isApproved ? '日记审核通过 🎉' : '日记未通过审核',
      content: isApproved
        ? `您的日记《${diaryTitle}》已通过审核，现已公开展示！`
        : `您的日记《${diaryTitle}》未通过审核${reason ? `，原因：${reason}` : ''}。如有疑问请重新发布。`,
      diary_id: diaryId,
    });
  };

  // 通过审核
  const handleApprove = async (diary: Diary & { user_id: string }) => {
    const { error } = await supabase
      .from('diaries')
      .update({ status: 'approved', reject_reason: null, review_note: null } as object)
      .eq('id', diary.id);
    if (error) { toast.error('审核操作失败: ' + error.message); return; }
    toast.success('✅ 已通过审核');
    sendAuditNotification(diary.user_id, diary.id, diary.title, 'approved');
    fetchDiaries(diaryTab);
  };

  // 打开拒绝弹窗
  const openRejectModal = (diary: Diary & { user_id: string }) => {
    setRejectModal({ open: true, diaryId: diary.id, diaryUserId: diary.user_id, diaryTitle: diary.title, reason: '' });
  };

  // ── 批量操作 ──────────────────────────────────────────────
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === diaries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(diaries.map(d => d.id)));
    }
  };

  const handleBatchApprove = async () => {
    if (!selectedIds.size) return;
    setBatchProcessing(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('diaries')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() } as object)
      .in('id', ids);
    setBatchProcessing(false);
    if (error) { toast.error('批量通过失败: ' + error.message); return; }
    toast.success(`已批量通过 ${ids.length} 篇日记`);
    setSelectedIds(new Set());
    fetchDiaries(diaryTab);
    fetchStats();
  };

  const handleBatchReject = async () => {
    if (!selectedIds.size) return;
    setBatchProcessing(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('diaries')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() } as object)
      .in('id', ids);
    setBatchProcessing(false);
    if (error) { toast.error('批量拒绝失败: ' + error.message); return; }
    toast.success(`已批量拒绝 ${ids.length} 篇日记`);
    setSelectedIds(new Set());
    fetchDiaries(diaryTab);
    fetchStats();
  };

  // 确认拒绝
  const handleConfirmReject = async () => {
    setRejectSubmitting(true);
    const { diaryId, diaryUserId, diaryTitle, reason } = rejectModal;
    const { error } = await supabase
      .from('diaries')
      .update({ status: 'rejected', reject_reason: reason.trim() || null } as object)
      .eq('id', diaryId);
    if (error) { toast.error('操作失败: ' + error.message); setRejectSubmitting(false); return; }
    await sendAuditNotification(diaryUserId, diaryId, diaryTitle, 'rejected', reason.trim());
    toast.success('已拒绝，通知已发送');
    setRejectModal(m => ({ ...m, open: false }));
    setRejectSubmitting(false);
    fetchDiaries(diaryTab);
  };

  // 角色修改 —— 升级为管理员需二次确认
  const handleUserRole = (userId: string, targetRole: 'user' | 'admin', username: string) => {
    if (targetRole === 'admin') {
      // 升级必须输入当前超管密码确认
      setRoleModal({ open: true, userId, targetRole, username, password: '', verifying: false, error: '' });
    } else {
      // 降级直接执行
      supabase.from('profiles').update({ role: targetRole }).eq('id', userId)
        .then(({ error }) => {
          if (error) { toast.error('操作失败: ' + error.message); return; }
          toast.success('已将账号降为普通用户');
          fetchUsers();
        });
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!user || !roleModal.password) {
      setRoleModal(m => ({ ...m, error: '请输入当前账户密码' }));
      return;
    }
    setRoleModal(m => ({ ...m, verifying: true, error: '' }));
    try {
      // 用当前超管邮箱+密码重新验证身份
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: roleModal.password,
      });
      if (authErr) throw new Error('密码验证失败，请重新输入');

      const { error: updateErr } = await supabase
        .from('profiles').update({ role: roleModal.targetRole }).eq('id', roleModal.userId);
      if (updateErr) throw new Error('权限更新失败: ' + updateErr.message);

      toast.success(`✅ 已将「${roleModal.username}」升级为管理员`);
      setRoleModal(m => ({ ...m, open: false, password: '' }));
      fetchUsers();
    } catch (err) {
      setRoleModal(m => ({ ...m, error: err instanceof Error ? err.message : '操作失败', verifying: false }));
    }
  };

  const handleDeleteComment = async (id: string) => {
    await supabase.from('diary_comments').delete().eq('id', id);
    toast.success('已删除');
    setComments(prev => prev.filter(c => c.id !== id));
  };

  // ── 邀请码管理（super_admin only）──────────────────────────
  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from('admin_invite_codes')
      .select('*, admin_invite_uses(id, used_email, used_at, used_by)')
      .order('created_at', { ascending: false });
    if (error) toast.error('加载邀请码失败: ' + error.message);
    setInvites((data as InviteCode[]) || []);
  };

  const toggleExpandInvite = (id: string) => {
    setExpandedInvites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 审核预览中搜索店铺
  const searchPreviewShops = async (keyword: string) => {
    setPreviewShopSearch(keyword);
    if (!keyword.trim()) { setPreviewShopResults([]); return; }
    const { data } = await supabase.from('shops').select('id,name,type,area').ilike('name', `%${keyword}%`).limit(8);
    setPreviewShopResults((data as Shop[]) || []);
  };

  // 给日记补填/修改店铺关联
  const handleAssignShop = async (diaryId: string, shopId: string, shopName: string) => {
    const { error } = await supabase.from('diaries').update({ shop_id: shopId } as object).eq('id', diaryId);
    if (error) { toast.error('关联店铺失败: ' + error.message); return; }
    toast.success(`已关联到「${shopName}」`);
    // 同步更新预览状态
    if (diaryPreview && diaryPreview.id === diaryId) {
      setDiaryPreview({ ...diaryPreview, shop_id: shopId, shops: { id: shopId, name: shopName } } as any);
    }
    setPreviewShopSearch('');
    setPreviewShopResults([]);
    setPreviewShopDropOpen(false);
    fetchDiaries(diaryTab);
  };

  const generateSecureCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符 O/0/I/1
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => chars[b % chars.length]).join('').replace(/(.{4})/g, '$1-').slice(0, -1);
  };

  const handleGenerateInvite = async () => {
    if (!user) return;
    setInviteGenerating(true);
    try {
      const count = Math.min(Math.max(inviteForm.batch, 1), 20); // 最多批量20条
      const expires_at = inviteForm.expires_days > 0
        ? new Date(Date.now() + inviteForm.expires_days * 86400000).toISOString()
        : null;
      const rows = Array.from({ length: count }, () => ({
        code: generateSecureCode(),
        created_by: user.id,
        notes: inviteForm.notes.trim() || null,
        max_uses: inviteForm.max_uses,
        expires_at,
      }));
      const { error } = await supabase.from('admin_invite_codes').insert(rows);
      if (error) throw error;
      toast.success(count === 1 ? `邀请码已生成：${rows[0].code}` : `批量生成 ${count} 条邀请码成功`);
      setInviteModal(false);
      setInviteForm({ notes: '', max_uses: 1, expires_days: 7, batch: 1 });
      await fetchInvites();
    } catch (err) {
      toast.error('生成失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setInviteGenerating(false);
    }
  };

  const handleToggleInvite = async (id: string, disabled: boolean) => {
    await supabase.from('admin_invite_codes').update({ is_disabled: disabled }).eq('id', id);
    setInvites(prev => prev.map(i => i.id === id ? { ...i, is_disabled: disabled } : i));
    toast.success(disabled ? '已禁用邀请码' : '已启用邀请码');
  };

  const handleDeleteInvite = async (id: string) => {
    await supabase.from('admin_invite_codes').delete().eq('id', id);
    setInvites(prev => prev.filter(i => i.id !== id));
    toast.success('邀请码已删除');
  };

  const getInviteStatus = (invite: InviteCode): { label: string; color: string } => {
    if (invite.is_disabled) return { label: '已禁用', color: '#ef4444' };
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return { label: '已过期', color: '#94a3b8' };
    if (invite.used_count >= invite.max_uses) return { label: '已用完', color: '#f59e0b' };
    return { label: '有效', color: '#22c55e' };
  };

  const handleShareInvite = async (code: string) => {
    const url = `${window.location.origin}/admin/login?code=${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: '管理员注册邀请', text: `使用邀请码注册管理员账号：${code}`, url });
        return;
      } catch { /* 用户取消分享，降级到复制 */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success('注册链接已复制到剪贴板');
  };

  const isSuperAdmin = profile?.role === 'super_admin';

  const navItems = [
    { key: 'overview', label: '数据概览', icon: <LayoutDashboard size={18} /> },
    { key: 'shops', label: '店铺管理', icon: <Store size={18} /> },
    { key: 'diaries', label: '日记审核', icon: <BookOpen size={18} /> },
    { key: 'users', label: '用户管理', icon: <Users size={18} /> },
    { key: 'comments', label: '评论管理', icon: <MessageSquare size={18} /> },
    ...(isSuperAdmin ? [{ key: 'invites', label: '邀请码管理', icon: <KeyRound size={18} /> }] : []),
  ] as { key: Section; label: string; icon: React.ReactNode }[];

  const SidebarContent = () => (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'hsl(var(--primary))' }}>
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-base leading-none block" style={{ color: 'hsl(var(--primary))' }}>寻味管理</span>
            <span className="text-xs mt-0.5 block" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {isSuperAdmin ? '超级管理员' : '管理员'}后台
            </span>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button key={item.key} onClick={() => { setSection(item.key); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all
              ${section === item.key ? 'text-white shadow-sm' : 'text-foreground hover:bg-accent'}`}
            style={{ background: section === item.key ? 'hsl(var(--primary))' : undefined }}>
            <span className="flex-shrink-0">{item.icon}</span>
            <span className="truncate">{item.label}</span>
            {item.key === 'diaries' && stats.pending > 0 && section !== 'diaries' && (
              <span className="ml-auto flex-shrink-0 bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bottom: user info + actions */}
      <div className="p-3 border-t border-border space-y-1">
        {/* Back to site */}
        <button onClick={() => navigate('/')}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:bg-accent hover:text-foreground">
          <Home size={16} className="flex-shrink-0" />
          <span>返回网站首页</span>
        </button>

        {/* User card */}
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl" style={{ background: 'hsl(var(--muted))' }}>
          <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-accent flex items-center justify-center"
            style={{ border: '2px solid hsl(var(--border))' }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-sm font-bold" style={{ color: 'hsl(var(--primary))' }}>
                  {(profile?.username || 'A')[0].toUpperCase()}
                </span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{profile?.username || '管理员'}</p>
            <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {isSuperAdmin ? '超级管理员' : '管理员'}
            </p>
          </div>
          <button onClick={() => { signOut(); navigate('/'); }}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-destructive/10"
            title="退出登录">
            <LogOut size={14} style={{ color: 'hsl(var(--muted-foreground))' }} />
          </button>
        </div>
      </div>
    </nav>
  );

  if (authLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="flex min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-col w-60 bg-card border-r border-border flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-60 bg-card z-50 lg:hidden shadow-xl">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-muted-foreground"><X size={20} /></button>
            <SidebarContent />
          </div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <div className="h-14 border-b border-border bg-card flex items-center gap-3 px-4 flex-shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <h1 className="font-semibold text-sm flex-1 min-w-0 truncate">
            {navItems.find(n => n.key === section)?.label}
          </h1>
          {/* Right: role badge + logout (desktop; sidebar handles these for desktop but shown on mobile) */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: isSuperAdmin ? 'hsla(39,86%,51%,0.15)' : 'hsla(27,80%,52%,0.1)',
                color: isSuperAdmin ? 'hsl(39,65%,35%)' : 'hsl(var(--primary))',
              }}>
              {isSuperAdmin ? '超级管理员' : '管理员'}
            </span>
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{ background: 'hsl(var(--accent))', border: '1.5px solid hsl(var(--border))' }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-xs font-bold" style={{ color: 'hsl(var(--primary))' }}>
                    {(profile?.username || 'A')[0].toUpperCase()}
                  </span>
              }
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Overview */}
          {section === 'overview' && (
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: '入驻店铺', value: stats.shops, color: 'hsl(var(--primary))' },
                  { label: '注册用户', value: stats.users, color: 'hsl(220,70%,55%)' },
                  { label: '发布日记', value: stats.diaries, color: 'hsl(160,60%,40%)' },
                  { label: '待审日记', value: stats.pending, color: 'hsl(var(--destructive))' },
                ].map(stat => (
                  <div key={stat.label} className="xunwei-card p-5 h-full">
                    <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shops */}
          {section === 'shops' && (
            <div>
              {/* 店铺管理 section header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg">店铺管理</h2>
                <button onClick={() => setShopModal({ open: true, mode: 'create', data: { ...EMPTY_SHOP } })}
                  className="btn-primary text-sm py-2 px-4">
                  <Plus size={15} />新增店铺
                </button>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border">
                  <Search size={15} className="text-muted-foreground" />
                  <input type="text" placeholder="搜索店铺..." value={shopKeyword} onChange={e => setShopKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchShops()} className="flex-1 outline-none bg-transparent text-sm" />
                </div>
                <button onClick={fetchShops} className="btn-secondary text-sm px-4 py-2">搜索</button>
              </div>
              {loading ? <LoadingSpinner /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['店铺名称', '类型', '商圈', '人均', '评分', '状态', '操作'].map(h => (
                          <th key={h} className="text-left py-3 px-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shops.map(shop => (
                        <tr key={shop.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-3 font-medium whitespace-nowrap">{shop.name}</td>
                          <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{shop.type}</td>
                          <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{shop.area}</td>
                          <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">¥{shop.price_per_person}</td>
                          <td className="py-3 px-3 whitespace-nowrap">{shop.rating_avg?.toFixed(1) || '—'}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-xs"
                              style={{ background: shop.status === 'active' ? '#dcfce7' : '#fee2e2', color: shop.status === 'active' ? '#16a34a' : '#dc2626' }}>
                              {shop.status === 'active' ? '营业中' : shop.status === 'closed' ? '已关闭' : '待审核'}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button onClick={() => setShopModal({ open: true, mode: 'edit', data: { id: shop.id, name: shop.name, type: shop.type, area: shop.area, address: shop.address || '', description: shop.description || '', images: Array.isArray(shop.images) ? shop.images : [], price_per_person: shop.price_per_person, status: shop.status } })}
                                className="text-blue-500 hover:text-blue-700 transition-colors"><Edit size={15} /></button>
                              <button onClick={() => handleDeleteShop(shop.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!shops.length && <EmptyState title="暂无店铺" />}
                </div>
              )}
            </div>
          )}

          {/* Diaries */}
          {section === 'diaries' && (
            <div>
              <h2 className="font-bold text-lg mb-5">日记审核</h2>

              {/* Tab 筛选 */}
              <div className="flex gap-2 mb-4">
                {([
                  { key: 'pending', label: '待审核', dot: stats.pending },
                  { key: 'approved', label: '已通过', dot: 0 },
                  { key: 'rejected', label: '已拒绝', dot: 0 },
                ] as const).map(t => (
                  <button key={t.key} onClick={() => setDiaryTab(t.key as typeof diaryTab)}
                    className={`filter-btn flex items-center gap-1.5 ${diaryTab === t.key ? 'active' : ''}`}>
                    {t.label}
                    {t.dot > 0 && (
                      <span className={`text-xs rounded-full px-1.5 font-bold leading-5 ${diaryTab === t.key ? 'bg-white/30 text-white' : 'bg-destructive text-white'}`}>
                        {t.dot}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {loading ? <LoadingSpinner /> : (
                <>
                  {/* 批量操作工具栏（仅待审核 tab 且有数据时显示） */}
                  {diaryTab === 'pending' && diaries.length > 0 && (
                    <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl border border-border bg-card">
                      {/* 全选框 */}
                      <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={diaries.length > 0 && selectedIds.size === diaries.length}
                          ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < diaries.length; }}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground">
                          {selectedIds.size > 0 ? `已选 ${selectedIds.size}/${diaries.length}` : `全选（${diaries.length}）`}
                        </span>
                      </label>

                      {/* 批量操作按钮（有选中时才显示） */}
                      {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-xs text-muted-foreground hidden md:block">批量操作：</span>
                          <button
                            onClick={handleBatchApprove}
                            disabled={batchProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                            style={{ background: 'hsl(160,60%,40%)' }}>
                            {batchProcessing ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            通过 {selectedIds.size} 篇
                          </button>
                          <button
                            onClick={handleBatchReject}
                            disabled={batchProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-85 disabled:opacity-50"
                            style={{ background: 'hsl(var(--destructive))' }}>
                            {batchProcessing ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            拒绝 {selectedIds.size} 篇
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 日记列表 */}
                  <div className="space-y-3">
                    {diaries.map(diary => {
                      const d = diary as Diary & { user_id: string };
                      const imgs = Array.isArray(d.images) ? d.images as string[] : [];
                      const isSelected = selectedIds.has(d.id);
                      return (
                        <div key={d.id}
                          className={`xunwei-card overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                          {/* 主行 */}
                          <div className="p-4 flex items-start gap-3">
                            {/* 待审核时显示复选框 */}
                            {diaryTab === 'pending' && (
                              <label className="flex-shrink-0 mt-0.5 cursor-pointer" onClick={e => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectId(d.id)}
                                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                                />
                              </label>
                            )}

                            {/* 缩略图 */}
                            {imgs.length > 0 && (
                              <button onClick={() => { setDiaryPreview(d); setPreviewImgIdx(0); }}
                                className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 hover:ring-2 ring-primary transition-all">
                                <img src={imgs[0]} alt="" className="w-full h-full object-cover" />
                              </button>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-sm leading-snug text-balance">{d.title}</h3>
                                {/* 单条审核按钮 */}
                                {diaryTab === 'pending' && (
                                  <div className="flex gap-1.5 flex-shrink-0">
                                    <button onClick={() => handleApprove(d)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80"
                                      style={{ background: 'hsl(160,60%,40%)' }}>
                                      <Check size={12} />通过
                                    </button>
                                    <button onClick={() => openRejectModal(d)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80"
                                      style={{ background: 'hsl(var(--destructive))' }}>
                                      <XCircle size={12} />拒绝
                                    </button>
                                  </div>
                                )}
                                {diaryTab !== 'pending' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                                    style={{
                                      background: diaryTab === 'approved' ? 'hsla(160,60%,40%,0.12)' : 'hsla(0,84%,60%,0.1)',
                                      color: diaryTab === 'approved' ? 'hsl(160,60%,30%)' : 'hsl(var(--destructive))',
                                    }}>
                                    {diaryTab === 'approved' ? '✓ 已通过' : '✗ 已拒绝'}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Users size={10} />{(d as any).profiles?.username || '未知用户'}
                                </span>
                                {(d as any).shops?.name ? (
                                  <span className="flex items-center gap-1">
                                    <Store size={10} />{(d as any).shops.name}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-amber-600">
                                    <Store size={10} />未关联店铺
                                  </span>
                                )}
                                {imgs.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Image size={10} />{imgs.length} 张图片
                                  </span>
                                )}
                                <span>{new Date(d.created_at).toLocaleDateString('zh-CN')}</span>
                              </div>

                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 text-pretty">{d.content}</p>

                              {diaryTab === 'rejected' && (d as any).reject_reason && (
                                <p className="text-xs mt-1.5 px-2.5 py-1.5 rounded-lg text-destructive"
                                  style={{ background: 'hsla(0,84%,60%,0.08)' }}>
                                  拒绝理由：{(d as any).reject_reason}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* 查看全文 */}
                          <button onClick={() => { setDiaryPreview(d); setPreviewImgIdx(0); }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs border-t border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                            <Eye size={12} />查看全文 / 图片预览
                          </button>
                        </div>
                      );
                    })}
                    {!diaries.length && (
                      <EmptyState title={`暂无${diaryTab === 'pending' ? '待审核' : diaryTab === 'approved' ? '已通过' : '已拒绝'}的日记`} />
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Users */}
          {section === 'users' && (
            <div>
              <h2 className="font-bold text-lg mb-5">用户管理</h2>
              <div className="flex gap-3 mb-6">
                <div className="flex-1 flex items-center gap-2 bg-card rounded-full px-4 py-2 border border-border">
                  <Search size={15} className="text-muted-foreground" />
                  <input type="text" placeholder="搜索用户名..." value={userKeyword} onChange={e => setUserKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsers()} className="flex-1 outline-none bg-transparent text-sm" />
                </div>
                <button onClick={fetchUsers} className="btn-secondary text-sm px-4 py-2">搜索</button>
              </div>
              {loading ? <LoadingSpinner /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['用户名', '邮箱', '角色', '注册时间', '操作'].map(h => (
                          <th key={h} className="text-left py-3 px-3 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-3 font-medium whitespace-nowrap">{u.username || '未设置'}</td>
                          <td className="py-3 px-3 text-muted-foreground whitespace-nowrap max-w-[180px] truncate">{u.email}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                background: u.role === 'super_admin'
                                  ? 'hsla(39,86%,51%,0.18)'
                                  : u.role === 'admin'
                                    ? 'hsla(27,80%,52%,0.12)'
                                    : 'hsl(var(--muted))',
                                color: u.role === 'super_admin'
                                  ? 'hsl(39,65%,30%)'
                                  : u.role === 'admin'
                                    ? 'hsl(var(--primary))'
                                    : 'hsl(var(--muted-foreground))',
                              }}>
                              {u.role === 'super_admin' ? '超级管理员' : u.role === 'admin' ? '管理员' : '普通用户'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {u.id !== user?.id && u.role !== 'super_admin' && (
                              <button
                                onClick={() => handleUserRole(u.id, u.role === 'admin' ? 'user' : 'admin', u.username || u.email || '未知用户')}
                                className="text-xs px-3 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors">
                                {u.role === 'admin' ? '降为用户' : '升为管理员'}
                              </button>
                            )}
                            {u.role === 'super_admin' && (
                              <span className="text-xs text-muted-foreground">最高权限</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!users.length && <EmptyState title="暂无用户" />}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          {section === 'comments' && (
            <div>
              <h2 className="font-bold text-lg mb-5">评论管理</h2>
              {loading ? <LoadingSpinner /> : (
                <div className="space-y-3">
                  {comments.map(comment => (
                    <div key={comment.id} className="xunwei-card p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm mb-1 text-pretty">{comment.content}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>作者: {(comment as any).profiles?.username || '未知'}</span>
                          <span>日记: {(comment as any).diaries?.title || '未知'}</span>
                          <span>{new Date(comment.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteComment(comment.id)} className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  {!comments.length && <EmptyState title="暂无评论" />}
                </div>
              )}
            </div>
          )}

          {/* 邀请码管理（仅 super_admin 可见） */}
          {section === 'invites' && isSuperAdmin && (
            <div>
              {/* 标题栏 */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-lg">邀请码管理</h2>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Shield size={11} />仅超级管理员可见
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchInvites}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent transition-all text-muted-foreground" title="刷新">
                    <RefreshCw size={14} />
                  </button>
                  <button onClick={() => setInviteModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
                    <Plus size={15} />生成邀请码
                  </button>
                </div>
              </div>

              {/* 统计概览 */}
              {invites.length > 0 && (() => {
                const total = invites.length;
                const active = invites.filter(i => {
                  const notDisabled = !i.is_disabled;
                  const notExpired = !i.expires_at || new Date(i.expires_at) >= new Date();
                  const hasUses = i.used_count < i.max_uses;
                  return notDisabled && notExpired && hasUses;
                }).length;
                const used = invites.filter(i => i.used_count >= i.max_uses).length;
                const disabled = invites.filter(i => i.is_disabled).length;
                const totalUses = invites.reduce((sum, i) => sum + (i.used_count || 0), 0);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {[
                      { label: '邀请码总数', value: total, icon: <Hash size={14} />, color: 'hsl(var(--primary))' },
                      { label: '可用', value: active, icon: <Check size={14} />, color: 'hsl(160,60%,40%)' },
                      { label: '已用完', value: used, icon: <XCircle size={14} />, color: 'hsl(var(--muted-foreground))' },
                      { label: '注册人数', value: totalUses, icon: <Users size={14} />, color: 'hsl(220,70%,55%)' },
                    ].map(s => (
                      <div key={s.label} className="xunwei-card p-3.5">
                        <div className="flex items-center gap-1.5 mb-1.5" style={{ color: s.color }}>{s.icon}<span className="text-xs font-medium">{s.label}</span></div>
                        <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {loading ? <LoadingSpinner /> : (
                <div className="space-y-3">
                  {invites.map(invite => {
                    const status = getInviteStatus(invite);
                    const uses = (invite.admin_invite_uses as any[]) || [];
                    const isExpanded = expandedInvites.has(invite.id);
                    // 使用进度百分比
                    const pct = invite.max_uses > 0 ? Math.min((invite.used_count / invite.max_uses) * 100, 100) : 0;
                    return (
                      <div key={invite.id} className="xunwei-card overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              {/* 邀请码 + 状态 + 操作 */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="font-mono text-sm font-bold tracking-widest px-2.5 py-1 rounded-lg"
                                  style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}>
                                  {invite.code}
                                </code>
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ background: status.color + '22', color: status.color }}>
                                  {status.label}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  <button onClick={() => { navigator.clipboard.writeText(invite.code); toast.success('邀请码已复制'); }}
                                    className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="复制邀请码">
                                    <Copy size={12} className="text-muted-foreground" />
                                  </button>
                                  <button onClick={() => handleShareInvite(invite.code)}
                                    className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="分享注册链接">
                                    <Share2 size={12} className="text-muted-foreground" />
                                  </button>
                                </div>
                              </div>

                              {invite.notes && (
                                <p className="text-xs mt-1.5 text-muted-foreground text-pretty">{invite.notes}</p>
                              )}

                              {/* 使用进度条 */}
                              <div className="mt-2.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                                  <div className="h-full rounded-full transition-all"
                                    style={{ width: `${pct}%`, background: pct >= 100 ? 'hsl(var(--muted-foreground))' : status.color }} />
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                  <BarChart2 size={10} />{invite.used_count}/{invite.max_uses} 次
                                </span>
                              </div>

                              {/* 属性行 */}
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {invite.expires_at && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock size={10} />到期：{new Date(invite.expires_at).toLocaleDateString('zh-CN')}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  创建：{new Date(invite.created_at).toLocaleDateString('zh-CN')}
                                </span>
                              </div>
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button onClick={() => handleToggleInvite(invite.id, !invite.is_disabled)}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent transition-all"
                                title={invite.is_disabled ? '启用' : '禁用'}>
                                <Ban size={12} />{invite.is_disabled ? '启用' : '禁用'}
                              </button>
                              <button onClick={() => handleDeleteInvite(invite.id)}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/8 transition-all"
                                title="删除">
                                <Trash2 size={12} />删除
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 使用记录展开 */}
                        {uses.length > 0 && (
                          <>
                            <button onClick={() => toggleExpandInvite(invite.id)}
                              className="w-full flex items-center justify-between px-4 py-2 text-xs border-t border-border hover:bg-accent transition-colors text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <FileText size={11} />使用记录（{uses.length} 条）
                              </span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-3 space-y-1.5 border-t border-border bg-muted/30">
                                <div className="pt-2.5 grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium pb-1 border-b border-border">
                                  <span>注册邮箱</span>
                                  <span>使用者ID</span>
                                  <span>使用时间</span>
                                </div>
                                {uses.map((u: any, idx: number) => (
                                  <div key={u.id || idx} className="grid grid-cols-3 gap-2 text-xs py-1">
                                    <span className="truncate text-foreground">{u.used_email || '—'}</span>
                                    <span className="truncate text-muted-foreground font-mono text-[10px]">{u.used_by?.slice(0, 8) || '—'}…</span>
                                    <span className="text-muted-foreground">{u.used_at ? new Date(u.used_at).toLocaleDateString('zh-CN') : '—'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                  {!invites.length && (
                    <EmptyState
                      title="暂无邀请码"
                      description="点击「生成邀请码」按钮创建邀请码，并将其分发给需要注册管理员账号的人员"
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shop Modal */}
      {shopModal.open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShopModal(m => ({ ...m, open: false }))} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card rounded-2xl shadow-2xl max-h-[90dvh] overflow-y-auto mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">{shopModal.mode === 'create' ? '新增店铺' : '编辑店铺'}</h2>
                <button onClick={() => setShopModal(m => ({ ...m, open: false }))} className="text-muted-foreground hover:text-foreground transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleShopSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">店铺名称 *</label>
                  <input type="text" value={shopModal.data.name} onChange={e => setShopModal(m => ({ ...m, data: { ...m.data, name: e.target.value } }))} className="xunwei-input" placeholder="请输入店铺名称" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">菜系类型 *</label>
                    <select value={shopModal.data.type} onChange={e => setShopModal(m => ({ ...m, data: { ...m.data, type: e.target.value } }))} className="xunwei-input appearance-none">
                      {SHOP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">商圈 *</label>
                    <select value={shopModal.data.area} onChange={e => setShopModal(m => ({ ...m, data: { ...m.data, area: e.target.value } }))} className="xunwei-input appearance-none">
                      {SHOP_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">地址</label>
                  <input type="text" value={shopModal.data.address} onChange={e => setShopModal(m => ({ ...m, data: { ...m.data, address: e.target.value } }))} className="xunwei-input" placeholder="店铺详细地址" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">人均价格 (¥)</label>
                  <input type="number" min="0" value={shopModal.data.price_per_person} onChange={e => setShopModal(m => ({ ...m, data: { ...m.data, price_per_person: Number(e.target.value) } }))} className="xunwei-input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">简介</label>
                  <textarea value={shopModal.data.description} onChange={e => setShopModal(m => ({ ...m, data: { ...m.data, description: e.target.value } }))} rows={3} className="xunwei-input resize-none" placeholder="店铺简介" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">状态</label>
                  <select value={shopModal.data.status} onChange={e => setShopModal(m => ({ ...m, data: { ...m.data, status: e.target.value as 'active' | 'pending' | 'closed' } }))} className="xunwei-input appearance-none">
                    <option value="active">营业中</option>
                    <option value="pending">待审核</option>
                    <option value="closed">已关闭</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">店铺图片</label>
                  <ImageUploader bucket="shop-images" value={shopModal.data.images} onChange={imgs => setShopModal(m => ({ ...m, data: { ...m.data, images: imgs } }))} maxFiles={5} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShopModal(m => ({ ...m, open: false }))} className="btn-secondary flex-1">取消</button>
                  <button type="submit" disabled={shopSaving} className="btn-primary flex-1 justify-center">
                    {shopSaving && <Loader2 size={15} className="animate-spin mr-2" />}{shopModal.mode === 'create' ? '创建' : '保存'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* 拒绝理由弹窗 */}
      {rejectModal.open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => !rejectSubmitting && setRejectModal(m => ({ ...m, open: false }))} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-[calc(100%-2rem)] md:max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-balance">拒绝发布</h3>
                <button type="button" onClick={() => !rejectSubmitting && setRejectModal(m => ({ ...m, open: false }))}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-4 text-pretty">
                即将拒绝日记《{rejectModal.diaryTitle}》，拒绝后将通知作者。
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5">
                  拒绝理由 <span className="text-muted-foreground font-normal">（可选）</span>
                </label>
                <textarea
                  value={rejectModal.reason}
                  onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value }))}
                  placeholder="请填写拒绝原因，将一并通知作者（如：内容不符合社区规范）"
                  rows={3}
                  className="xunwei-input resize-none"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{rejectModal.reason.length}/200</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModal(m => ({ ...m, open: false }))}
                  disabled={rejectSubmitting}
                  className="btn-secondary flex-1">
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={rejectSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white transition-opacity hover:opacity-80"
                  style={{ background: '#ef4444' }}>
                  {rejectSubmitting
                    ? <><Loader2 size={15} className="animate-spin" />处理中...</>
                    : <><XCircle size={15} />确认拒绝</>
                  }
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 生成邀请码弹窗 */}
      {inviteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => !inviteGenerating && setInviteModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[calc(100%-2rem)] md:max-w-md bg-card rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <KeyRound size={18} style={{ color: 'hsl(var(--primary))' }} />
                <h2 className="text-lg font-bold">生成邀请码</h2>
              </div>
              <button onClick={() => setInviteModal(false)} disabled={inviteGenerating}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">备注（可选）</label>
                <input
                  type="text" placeholder="如：分配给张三，用于注册管理账号"
                  value={inviteForm.notes}
                  onChange={e => setInviteForm(f => ({ ...f, notes: e.target.value }))}
                  className="xunwei-input" disabled={inviteGenerating}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">最大使用次数</label>
                  <input
                    type="number" min={1} max={100}
                    value={inviteForm.max_uses}
                    onChange={e => setInviteForm(f => ({ ...f, max_uses: Math.max(1, Number(e.target.value)) }))}
                    className="xunwei-input" disabled={inviteGenerating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">有效天数（0=永不过期）</label>
                  <input
                    type="number" min={0} max={365}
                    value={inviteForm.expires_days}
                    onChange={e => setInviteForm(f => ({ ...f, expires_days: Math.max(0, Number(e.target.value)) }))}
                    className="xunwei-input" disabled={inviteGenerating}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">批量数量（1-20）</label>
                <input
                  type="number" min={1} max={20}
                  value={inviteForm.batch}
                  onChange={e => setInviteForm(f => ({ ...f, batch: Math.min(20, Math.max(1, Number(e.target.value))) }))}
                  className="xunwei-input" disabled={inviteGenerating}
                  placeholder="默认生成 1 条，最多 20 条"
                />
                {inviteForm.batch > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">将一次性生成 {inviteForm.batch} 条独立邀请码</p>
                )}
              </div>
              <div className="p-3 rounded-xl text-xs space-y-1" style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                <p>• 邀请码采用加密随机算法生成，格式：XXXX-XXXX-XXXX</p>
                <p>• 生成后可在列表中复制并分发给需要注册的管理员</p>
                <p>• 邀请码使用完毕或过期后自动失效，全程记录审计日志</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setInviteModal(false)} disabled={inviteGenerating}
                  className="btn-secondary flex-1">取消</button>
                <button onClick={handleGenerateInvite} disabled={inviteGenerating}
                  className="btn-primary flex-1 justify-center">
                  {inviteGenerating
                    ? <><Loader2 size={15} className="animate-spin mr-1.5" />生成中...</>
                    : <><KeyRound size={15} className="mr-1.5" />{inviteForm.batch > 1 ? `批量生成 ${inviteForm.batch} 条` : '生成邀请码'}</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 日记全文预览弹窗 */}
      {diaryPreview && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setDiaryPreview(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
            w-full max-w-[calc(100%-2rem)] md:max-w-lg bg-card rounded-2xl shadow-2xl
            max-h-[90dvh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-5 py-3.5 flex items-center justify-between z-10">
              <h2 className="font-bold text-sm text-balance pr-4 flex-1 min-w-0 truncate">{diaryPreview.title}</h2>
              <button onClick={() => setDiaryPreview(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 作者 & 元信息 */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center text-xs font-bold"
                  style={{ color: 'hsl(var(--primary))' }}>
                  {(diaryPreview as any).profiles?.avatar_url
                    ? <img src={(diaryPreview as any).profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    : ((diaryPreview as any).profiles?.username?.[0] || 'U').toUpperCase()
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{(diaryPreview as any).profiles?.username || '匿名用户'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    {(diaryPreview as any).shops?.name && <span className="flex items-center gap-1"><Store size={10} />{(diaryPreview as any).shops.name}</span>}
                    <span>{new Date(diaryPreview.created_at).toLocaleDateString('zh-CN')}</span>
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: diaryPreview.status === 'approved' ? 'hsl(160,60%,40%,0.12)' : diaryPreview.status === 'rejected' ? 'hsla(0,84%,60%,0.1)' : 'hsl(var(--muted))',
                      color: diaryPreview.status === 'approved' ? 'hsl(160,60%,30%)' : diaryPreview.status === 'rejected' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))',
                    }}>
                    {diaryPreview.status === 'approved' ? '✓ 已通过' : diaryPreview.status === 'rejected' ? '✗ 已拒绝' : '⏳ 待审核'}
                  </span>
                </div>
              </div>

              {/* 关联店铺（可补填） */}
              <div className="px-3 py-2.5 rounded-xl border border-border bg-muted/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <Store size={13} style={{ color: 'hsl(var(--primary))' }} />
                  <span className="text-xs font-medium">关联店铺</span>
                  {(diaryPreview as any).shops?.name
                    ? <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-auto"
                        style={{ background: 'hsla(160,60%,40%,0.12)', color: 'hsl(160,60%,32%)' }}>
                        {(diaryPreview as any).shops.name}
                      </span>
                    : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium ml-auto">未关联</span>
                  }
                </div>
                {/* 搜索修改店铺 */}
                <div className="relative">
                  <input
                    type="text"
                    value={previewShopSearch}
                    onChange={e => searchPreviewShops(e.target.value)}
                    onFocus={() => setPreviewShopDropOpen(true)}
                    placeholder={(diaryPreview as any).shops?.name ? '搜索更换关联店铺…' : '搜索店铺名称关联…'}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card outline-none focus:border-primary transition-colors"
                  />
                  {previewShopDropOpen && previewShopSearch && previewShopResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-lg border border-border z-10 overflow-hidden">
                      {previewShopResults.map(s => (
                        <button key={s.id} type="button"
                          onClick={() => handleAssignShop(diaryPreview.id, s.id, s.name)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left text-xs">
                          <Store size={11} className="flex-shrink-0 text-muted-foreground" />
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground">{s.type} · {s.area}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 图片画廊 */}
              {(diaryPreview.images as string[])?.length > 0 && (
                <div>
                  <div className="aspect-[16/9] rounded-xl overflow-hidden bg-muted">
                    <img src={(diaryPreview.images as string[])[previewImgIdx]}
                      alt="" className="w-full h-full object-cover" />
                  </div>
                  {(diaryPreview.images as string[]).length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {(diaryPreview.images as string[]).map((img, i) => (
                        <button key={i} onClick={() => setPreviewImgIdx(i)}
                          className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all ${i === previewImgIdx ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 正文 */}
              <div className="text-sm leading-relaxed text-pretty whitespace-pre-wrap">{diaryPreview.content}</div>

              {/* 评分 */}
              {diaryPreview.rating_overall && (
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl" style={{ background: 'hsl(var(--muted))' }}>
                  {[
                    { label: '综合', val: diaryPreview.rating_overall },
                    { label: '口味', val: diaryPreview.rating_taste },
                    { label: '环境', val: diaryPreview.rating_env },
                    { label: '服务', val: diaryPreview.rating_service },
                    { label: '性价比', val: diaryPreview.rating_value },
                  ].map(r => r.val && (
                    <div key={r.label} className="text-center">
                      <p className="text-xs text-muted-foreground">{r.label}</p>
                      <p className="font-bold text-sm" style={{ color: 'hsl(var(--primary))' }}>{r.val?.toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 待审核时显示操作按钮 */}
              {diaryPreview.status === 'pending' && (
                <div className="flex gap-3 pt-2 border-t border-border">
                  <button onClick={() => { handleApprove(diaryPreview); setDiaryPreview(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80"
                    style={{ background: 'hsl(160,60%,40%)' }}>
                    <Check size={15} />通过审核
                  </button>
                  <button onClick={() => { openRejectModal(diaryPreview); setDiaryPreview(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-80"
                    style={{ background: 'hsl(var(--destructive))' }}>
                    <XCircle size={15} />拒绝发布
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 权限升级二次确认弹窗 */}
      {roleModal.open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => !roleModal.verifying && setRoleModal(m => ({ ...m, open: false }))} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[calc(100%-2rem)] md:max-w-sm bg-card rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={18} style={{ color: '#f59e0b' }} />
                <h2 className="text-base font-bold">权限升级确认</h2>
              </div>
              <button onClick={() => setRoleModal(m => ({ ...m, open: false }))} disabled={roleModal.verifying}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}>
                即将将用户 <strong>「{roleModal.username}」</strong> 升级为管理员。<br />
                <span className="text-xs mt-1 block" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  请输入您（超级管理员）的当前密码以确认此操作。
                </span>
              </div>
              {roleModal.error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {roleModal.error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">超级管理员密码</label>
                <input
                  type="password" placeholder="请输入当前账户密码"
                  value={roleModal.password}
                  onChange={e => setRoleModal(m => ({ ...m, password: e.target.value, error: '' }))}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmRoleChange()}
                  className="xunwei-input"
                  disabled={roleModal.verifying}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRoleModal(m => ({ ...m, open: false }))} disabled={roleModal.verifying}
                  className="btn-secondary flex-1 text-sm">取消</button>
                <button onClick={handleConfirmRoleChange} disabled={roleModal.verifying || !roleModal.password}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-80"
                  style={{ background: '#f59e0b' }}>
                  {roleModal.verifying
                    ? <><Loader2 size={14} className="animate-spin" />验证中...</>
                    : <><Check size={14} />确认升级</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
