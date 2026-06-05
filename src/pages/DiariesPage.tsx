import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import type { Diary } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import StarRating from '@/components/common/StarRating';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import EmptyState from '@/components/common/EmptyState';
import MainLayout from '@/components/layout/MainLayout';
import { Heart, MessageSquare, MapPin, UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const TABS = [
  { label: '推荐', key: 'recommended' },
  { label: '最新', key: 'latest' },
  { label: '热门', key: 'hot' },
  { label: '关注', key: 'following' },
];
const AREAS = ['全部', '春熙路', '太古里', 'IFS', '宽窄巷子', '九眼桥'];

export default function DiariesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('recommended');
  const [area, setArea] = useState('全部');
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchDiaries = async () => {
    setLoading(true);

    // 先获取符合商圈筛选条件的店铺ID列表
    let shopIds: string[] | null = null;
    if (area !== '全部') {
      const { data: shopData } = await supabase
        .from('shops')
        .select('id')
        .eq('area', area)
        .eq('status', 'active');
      shopIds = (shopData || []).map((s: { id: string }) => s.id);
      if (!shopIds.length) { setDiaries([]); setLoading(false); return; }
    }

    // 关注Tab：先获取关注用户ID
    if (tab === 'following' && user) {
      const { data: followData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
      const followIds = (followData || []).map((f: { following_id: string }) => f.following_id);
      if (!followIds.length) { setDiaries([]); setLoading(false); return; }
      let q = supabase.from('diaries')
        .select('*, profiles!diaries_user_id_fkey(id,username,avatar_url), shops!diaries_shop_id_fkey(id,name,area)')
        .eq('status', 'approved')
        .in('user_id', followIds)
        .order('created_at', { ascending: false });
      if (shopIds) q = q.in('shop_id', shopIds);
      const { data } = await q.limit(30);
      setDiaries(data as Diary[] || []);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('diaries')
      .select('*, profiles!diaries_user_id_fkey(id,username,avatar_url), shops!diaries_shop_id_fkey(id,name,area)')
      .eq('status', 'approved');

    if (shopIds) query = query.in('shop_id', shopIds);
    if (tab === 'hot') query = query.order('likes_count', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data } = await query.limit(30);
    setDiaries(data as Diary[] || []);
    setLoading(false);
  };

  const fetchLikesFollows = async () => {
    if (!user) return;
    const [likesRes, followsRes] = await Promise.all([
      supabase.from('diary_likes').select('diary_id').eq('user_id', user.id),
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
    ]);
    setLikes(new Set((likesRes.data || []).map((l: { diary_id: string }) => l.diary_id)));
    setFollows(new Set((followsRes.data || []).map((f: { following_id: string }) => f.following_id)));
  };

  useEffect(() => { fetchDiaries(); }, [tab, area, user]);
  useEffect(() => { fetchLikesFollows(); }, [user]);

  const handleLike = async (diary: Diary) => {
    if (!user) { toast.error('请先登录'); return; }
    const liked = likes.has(diary.id);
    if (liked) {
      await supabase.from('diary_likes').delete().eq('user_id', user.id).eq('diary_id', diary.id);
      setLikes(prev => { const n = new Set(prev); n.delete(diary.id); return n; });
      setDiaries(prev => prev.map(d => d.id === diary.id ? { ...d, likes_count: d.likes_count - 1 } : d));
    } else {
      await supabase.from('diary_likes').insert({ user_id: user.id, diary_id: diary.id });
      setLikes(prev => new Set([...prev, diary.id]));
      setDiaries(prev => prev.map(d => d.id === diary.id ? { ...d, likes_count: d.likes_count + 1 } : d));
    }
  };

  const handleFollow = async (authorId: string) => {
    if (!user) { toast.error('请先登录'); return; }
    if (authorId === user.id) { toast.error('不能关注自己'); return; }
    const following = follows.has(authorId);
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', authorId);
      setFollows(prev => { const n = new Set(prev); n.delete(authorId); return n; });
      toast.success('已取消关注');
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: authorId });
      setFollows(prev => new Set([...prev, authorId]));
      toast.success('关注成功');
    }
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };

  return (
    <MainLayout>
      <div className="page-header">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-balance">探店日记</h1>
          <p className="text-muted-foreground text-pretty">看看大家的美食探索故事</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 whitespace-nowrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => {
              if (t.key === 'following' && !user) { toast.error('请先登录'); return; }
              setTab(t.key);
            }} className={`filter-btn flex-shrink-0 ${tab === t.key ? 'active' : ''}`}>{t.label}</button>
          ))}
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 whitespace-nowrap">
          {AREAS.map(a => (
            <button key={a} onClick={() => setArea(a)} className={`filter-btn flex-shrink-0 text-xs ${area === a ? 'active' : ''}`}>{a}</button>
          ))}
        </div>

        {loading ? <LoadingSpinner text="加载中..." /> : diaries.length === 0 ? (
          <EmptyState title={tab === 'following' ? '还没有关注的人发布日记' : '暂无日记'} description="快去发布你的探店日记吧！" />
        ) : (
          <div className="space-y-4">
            {diaries.map(diary => (
              <div key={diary.id} className="xunwei-card p-5">
                {/* Author */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: 'hsl(var(--primary))' }}>
                      {diary.profiles?.avatar_url ? <img src={diary.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (diary.profiles?.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{diary.profiles?.username || '匿名用户'}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(diary.created_at)}</span>
                        {diary.shops && <span className="flex items-center gap-1"><MapPin size={10} />{diary.shops.name}</span>}
                      </div>
                    </div>
                  </div>
                  {user && diary.user_id !== user.id && diary.profiles && (
                    <button
                      onClick={() => handleFollow(diary.profiles!.id)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${follows.has(diary.profiles.id) ? 'border-border text-muted-foreground' : 'border-primary text-primary'}`}
                      style={{ borderColor: follows.has(diary.profiles.id) ? 'hsl(var(--border))' : 'hsl(var(--primary))' }}
                    >
                      {follows.has(diary.profiles.id) ? <><UserCheck size={13} />已关注</> : <><UserPlus size={13} />关注</>}
                    </button>
                  )}
                </div>

                {/* Content */}
                <Link to={`/diaries/${diary.id}`} className="block group">
                  <h3 className="font-semibold text-base mb-2 group-hover:text-primary transition-colors text-balance">{diary.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3 text-pretty">{diary.content}</p>
                  {Array.isArray(diary.images) && diary.images.length > 0 && (
                    <div className={`grid gap-2 mb-3 ${diary.images.length === 1 ? '' : diary.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                      {diary.images.slice(0, 3).map((img, i) => (
                        <div key={i} className={`overflow-hidden rounded-xl card-image ${diary.images.length === 1 ? 'aspect-[16/9]' : 'aspect-square'}`}>
                          <img src={img} alt="" className="w-full h-full object-cover transition-transform duration-300" />
                          {i === 2 && diary.images.length > 3 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold">
                              +{diary.images.length - 3}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StarRating value={diary.rating_overall} size={13} />
                    {(diary.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="xunwei-tag tag-recommend text-xs py-0.5 px-2">#{tag}</span>
                    ))}
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => handleLike(diary)}
                    className={`flex items-center gap-1.5 text-sm transition-all hover:scale-105 ${likes.has(diary.id) ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                  >
                    <Heart size={16} className={likes.has(diary.id) ? 'fill-current' : ''} />
                    {diary.likes_count}
                  </button>
                  <Link to={`/diaries/${diary.id}#comments`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <MessageSquare size={16} />
                    {diary.comments_count}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
