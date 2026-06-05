import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import type { Diary, Collection } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import StarRating from '@/components/common/StarRating';
import MainLayout from '@/components/layout/MainLayout';
import { Edit3, BookOpen, Bookmark, BookmarkCheck, Star, Heart, MessageSquare, MapPin, Camera, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { key: 'diaries', label: '我的日记', icon: <BookOpen size={15} /> },
  { key: 'favorite', label: '我的收藏', icon: <Star size={15} /> },
  { key: 'want', label: '想去', icon: <Bookmark size={15} /> },
  { key: 'checked', label: '已打卡', icon: <BookmarkCheck size={15} /> },
];

// 支持 JPG / PNG / GIF / WEBP
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 5;
// 友好的 Storage 错误映射
const STORAGE_ERROR_MAP: Record<string, string> = {
  'The resource already exists': '文件已存在，正在覆盖...',
  'new row violates row-level security policy': '权限不足，请重新登录后重试',
  'JWT expired': '登录已过期，请重新登录',
  'invalid signature': '认证信息有误，请重新登录',
};

async function compressAvatar(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file; // GIF 不压缩
  if (file.size <= 1024 * 1024) return file;
  return new Promise((resolve) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 400;
      let { width, height } = img;
      if (width > height && width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
      else if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob || file), 'image/webp', 0.85);
    };
    img.src = url;
  });
}

export default function ProfilePage() {
  const { user, profile, loading: authLoading, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState('diaries');
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', bio: '', avatar_url: '' });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  // 本地预览URL（上传成功后更新）
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  /**
   * 头像上传 — 完全重构版本
   * 直接调用 Supabase Storage + profiles 表，完全绕过 AuthContext.updateProfile
   * 限制：单张图片，最大5MB，支持 JPG/PNG/GIF/WEBP
   */
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允许重复选同一文件
    if (!file || !user) return;

    // 格式校验
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('仅支持 JPG、PNG、GIF、WEBP 格式图片');
      return;
    }
    // 大小校验（5MB）
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`头像文件不得超过 ${MAX_SIZE_MB}MB`);
      return;
    }

    setAvatarUploading(true);
    try {
      // Step 1: 压缩图片（GIF 不压缩，其他 >1MB 才压缩）
      const compressed = await compressAvatar(file);
      const ext = file.type === 'image/gif' ? 'gif' : 'webp';
      const storagePath = `${user.id}/avatar_${Date.now()}.${ext}`;
      const contentType = file.type === 'image/gif' ? 'image/gif' : 'image/webp';

      // Step 2: 上传到 Supabase Storage avatars 桶
      const { error: storageErr } = await supabase.storage
        .from('avatars')
        .upload(storagePath, compressed, { contentType, upsert: true });

      if (storageErr) {
        const friendlyMsg = Object.entries(STORAGE_ERROR_MAP)
          .find(([key]) => storageErr.message.includes(key))?.[1]
          ?? `存储上传失败：${storageErr.message}`;
        console.error('[头像上传] Storage error:', storageErr.message);
        throw new Error(friendlyMsg);
      }

      // Step 3: 获取公开URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // Step 4: 直接更新 profiles 表（绕过 AuthContext.updateProfile，避免 RLS 策略干扰）
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (dbErr) {
        const friendlyMsg = Object.entries(STORAGE_ERROR_MAP)
          .find(([key]) => dbErr.message.includes(key))?.[1]
          ?? `资料更新失败：${dbErr.message}`;
        console.error('[头像上传] DB update error:', dbErr.message, dbErr.details, dbErr.hint);
        throw new Error(friendlyMsg);
      }

      // Step 5: 本地立即预览（加时间戳防缓存）
      setAvatarPreview(`${publicUrl}?t=${Date.now()}`);
      // 同步编辑表单（如果正在编辑）
      setEditForm(f => ({ ...f, avatar_url: publicUrl }));
      // 刷新全局 profile
      refreshProfile();
      toast.success('头像更新成功 🎉');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '未知错误';
      toast.error(`头像上传失败：${msg}`);
      console.error('[头像上传] 完整错误:', err);
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/profile' } });
  }, [user, authLoading]);

  useEffect(() => {
    if (!user || !profile) return;
    setEditForm({ username: profile.username || '', bio: profile.bio || '', avatar_url: profile.avatar_url || '' });
    // 有新预览时不覆盖
    if (!avatarPreview) setAvatarPreview(null);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      if (tab === 'diaries') {
        const { data } = await supabase.from('diaries').select('*, shops!diaries_shop_id_fkey(id,name,area)').eq('user_id', user.id).order('created_at', { ascending: false });
        setDiaries(data as Diary[] || []);
      } else {
        const { data } = await supabase.from('collections').select('*, shops(*)').eq('user_id', user.id).eq('type', tab).order('created_at', { ascending: false });
        setCollections(data as Collection[] || []);
      }
      setLoading(false);
    };
    fetch();
  }, [tab, user]);

  const handleSaveProfile = async () => {
    if (!editForm.username.trim()) { toast.error('用户名不能为空'); return; }
    setSaving(true);
    const { error } = await updateProfile({ username: editForm.username.trim(), bio: editForm.bio.trim() || null as unknown as string, avatar_url: editForm.avatar_url || null as unknown as string });
    setSaving(false);
    if (error) { toast.error('保存失败'); return; }
    setEditing(false);
    toast.success('资料已更新');
  };

  const diaryStatusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: '审核中', color: 'hsl(var(--secondary))' },
    approved: { label: '已发布', color: 'hsl(160,60%,40%)' },
    rejected: { label: '已拒绝', color: 'hsl(var(--destructive))' },
  };

  if (authLoading) return <MainLayout><LoadingSpinner fullPage /></MainLayout>;

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile header */}
        <div className="xunwei-card p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar — 随时可更换，点击即可上传 */}
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold cursor-pointer group/avatar ring-2 ring-border hover:ring-primary transition-all"
                style={{ background: 'hsl(var(--primary))' }}
                onClick={() => avatarInputRef.current?.click()}
                title="点击更换头像"
              >
                {(avatarPreview || profile?.avatar_url) ? (
                  <img
                    src={avatarPreview || profile?.avatar_url!}
                    alt="头像"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (profile?.username || user?.email || '?')[0].toUpperCase()
                )}
                {/* 悬停蒙层 */}
                <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                  {avatarUploading
                    ? <Loader2 size={18} className="animate-spin text-white" />
                    : <Camera size={18} className="text-white" />
                  }
                  {!avatarUploading && <span className="text-white text-[10px] mt-0.5">更换</span>}
                </div>
              </div>
              {/* 右下角相机角标 */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow border-2 border-background"
                style={{ background: 'hsl(var(--primary))' }}
                title="更换头像"
              >
                {avatarUploading
                  ? <Loader2 size={11} className="animate-spin text-white" />
                  : <Camera size={11} className="text-white" />
                }
              </button>
              {/* 隐藏 file input */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <input type="text" value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="用户名" className="xunwei-input text-lg font-semibold" />
                  <textarea value={editForm.bio} onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="写一段个人简介..." rows={2} className="xunwei-input resize-none text-sm" />
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} disabled={saving} className="btn-primary px-4 py-2 text-sm">
                      {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : <Check size={14} className="mr-1" />}保存
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-secondary px-4 py-2 text-sm"><X size={14} className="mr-1" />取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-xl font-bold text-balance">{profile?.username || '未设置用户名'}</h1>
                    <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Edit3 size={16} />
                    </button>
                  </div>
                  {profile?.bio && <p className="text-sm text-muted-foreground mb-3 text-pretty">{profile.bio}</p>}
                  <div className="flex items-center gap-5 text-sm">
                    <div><span className="font-bold text-lg">{profile?.following_count || 0}</span><span className="text-muted-foreground ml-1">关注</span></div>
                    <div><span className="font-bold text-lg">{profile?.followers_count || 0}</span><span className="text-muted-foreground ml-1">粉丝</span></div>
                  </div>
                </>
              )}
            </div>

            {!editing && (
              <Link to="/diary/publish" className="btn-primary text-sm px-4 py-2 flex-shrink-0 hidden md:flex">
                <BookOpen size={14} className="mr-1.5" /> 发布日记
              </Link>
            )}
          </div>
          {!editing && (
            <div className="mt-4 md:hidden">
              <Link to="/diary/publish" className="btn-primary text-sm w-full justify-center">
                <BookOpen size={14} className="mr-1.5" /> 发布日记
              </Link>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 whitespace-nowrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`filter-btn flex-shrink-0 flex items-center gap-1.5 ${tab === t.key ? 'active' : ''}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? <LoadingSpinner /> : (
          tab === 'diaries' ? (
            diaries.length === 0 ? (
              <EmptyState title="还没有发布日记" description="分享你的探店体验吧！"
                action={<Link to="/diary/publish" className="btn-primary">立即发布</Link>} />
            ) : (
              <div className="space-y-4">
                {diaries.map(diary => (
                  <Link to={`/diaries/${diary.id}`} key={diary.id} className="xunwei-card flex gap-4 p-4 group block">
                    {Array.isArray(diary.images) && diary.images.length > 0 && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 card-image">
                        <img src={diary.images[0]} alt="" className="w-full h-full object-cover transition-transform duration-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate text-balance">{diary.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${diaryStatusLabel[diary.status]?.color}22`, color: diaryStatusLabel[diary.status]?.color }}>
                          {diaryStatusLabel[diary.status]?.label}
                        </span>
                      </div>
                      {diary.shops && <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><MapPin size={10} />{diary.shops.name}</p>}
                      <div className="flex items-center gap-3">
                        <StarRating value={diary.rating_overall} size={12} />
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Heart size={10} />{diary.likes_count}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare size={10} />{diary.comments_count}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            collections.length === 0 ? (
              <EmptyState title={`还没有${TABS.find(t => t.key === tab)?.label}`}
                action={<Link to="/shops" className="btn-primary">去探店</Link>} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {collections.map(coll => coll.shops && (
                  <Link to={`/shops/${coll.shop_id}`} key={coll.shop_id} className="xunwei-card h-full flex flex-col">
                    <div className="aspect-[4/3] overflow-hidden card-image">
                      <img src={Array.isArray(coll.shops.images) && coll.shops.images.length > 0 ? coll.shops.images[0] : 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400'} alt={coll.shops.name} className="w-full h-full object-cover transition-transform duration-300" />
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold mb-1 text-balance">{coll.shops.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className="xunwei-tag tag-recommend text-xs py-0.5 px-2">{coll.shops.type}</span>
                        <span className="flex items-center gap-1"><MapPin size={11} />{coll.shops.area}</span>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <StarRating value={coll.shops.rating_avg} size={13} />
                        <span className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>¥{coll.shops.price_per_person}/人</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )
        )}
      </div>
    </MainLayout>
  );
}
