import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import type { Diary, DiaryComment } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import StarRating from '@/components/common/StarRating';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MainLayout from '@/components/layout/MainLayout';
import { Heart, MessageSquare, MapPin, UserPlus, UserCheck, ChevronLeft, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DiaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const [diary, setDiary] = useState<Diary | null>(null);
  const [comments, setComments] = useState<DiaryComment[]>([]);
  const [liked, setLiked] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      const [diaryRes, commentsRes] = await Promise.all([
        supabase
          .from('diaries')
          .select('*, profiles!diaries_user_id_fkey(id,username,avatar_url), shops!diaries_shop_id_fkey(id,name,area,type)')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('diary_comments')
          .select('*, profiles!diary_comments_user_id_fkey(id,username,avatar_url)')
          .eq('diary_id', id)
          .order('created_at', { ascending: true }),
      ]);
      if (diaryRes.data) setDiary(diaryRes.data as Diary);
      if (commentsRes.data) setComments(commentsRes.data as DiaryComment[]);
      if (user && diaryRes.data) {
        const [likeRes, followRes] = await Promise.all([
          supabase.from('diary_likes').select('diary_id').eq('user_id', user.id).eq('diary_id', id).maybeSingle(),
          supabase.from('follows').select('following_id').eq('follower_id', user.id).eq('following_id', (diaryRes.data as Diary).user_id).maybeSingle(),
        ]);
        setLiked(!!likeRes.data);
        setFollowed(!!followRes.data);
      }
      setLoading(false);
    };
    fetch();
  }, [id, user]);

  const handleLike = async () => {
    if (!user || !diary) { toast.error('请先登录'); return; }
    if (liked) {
      await supabase.from('diary_likes').delete().eq('user_id', user.id).eq('diary_id', diary.id);
      setLiked(false);
      setDiary(d => d ? { ...d, likes_count: d.likes_count - 1 } : d);
    } else {
      await supabase.from('diary_likes').insert({ user_id: user.id, diary_id: diary.id });
      setLiked(true);
      setDiary(d => d ? { ...d, likes_count: d.likes_count + 1 } : d);
    }
  };

  const handleFollow = async () => {
    if (!user || !diary) { toast.error('请先登录'); return; }
    if (diary.user_id === user.id) { toast.error('不能关注自己'); return; }
    if (followed) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', diary.user_id);
      setFollowed(false);
      toast.success('已取消关注');
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: diary.user_id });
      setFollowed(true);
      toast.success('关注成功');
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !diary) { toast.error('请先登录'); return; }
    if (!commentText.trim()) { toast.error('请输入评论内容'); return; }
    setSubmitting(true);
    const { data, error } = await supabase
      .from('diary_comments')
      .insert({ diary_id: diary.id, user_id: user.id, content: commentText.trim() })
      .select('*, profiles!diary_comments_user_id_fkey(id,username,avatar_url)')
      .single();
    setSubmitting(false);
    if (error) { toast.error('评论失败'); return; }
    setComments(prev => [...prev, data as DiaryComment]);
    setDiary(d => d ? { ...d, comments_count: d.comments_count + 1 } : d);
    setCommentText('');
    toast.success('评论成功');
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    await supabase.from('diary_comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    setDiary(d => d ? { ...d, comments_count: Math.max(d.comments_count - 1, 0) } : d);
    toast.success('已删除评论');
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) return <MainLayout><LoadingSpinner fullPage /></MainLayout>;
  if (!diary) return <MainLayout><div className="text-center py-20 text-muted-foreground">日记不存在或已被删除</div></MainLayout>;

  const images = Array.isArray(diary.images) ? diary.images : [];
  const ratingItems = [
    { label: '口味', value: diary.rating_taste },
    { label: '环境', value: diary.rating_env },
    { label: '服务', value: diary.rating_service },
    { label: '性价比', value: diary.rating_value },
  ];

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-primary transition-colors">
          <ChevronLeft size={16} /> 返回
        </button>

        {/* Author */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ background: 'hsl(var(--primary))' }}>
              {diary.profiles?.avatar_url ? <img src={diary.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (diary.profiles?.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{diary.profiles?.username || '匿名用户'}</p>
              <p className="text-xs text-muted-foreground">{formatDate(diary.created_at)}</p>
            </div>
          </div>
          {user && diary.user_id !== user.id && (
            <button onClick={handleFollow}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-medium transition-all border-2"
              style={{ borderColor: followed ? 'hsl(var(--border))' : 'hsl(var(--primary))', color: followed ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))' }}>
              {followed ? <><UserCheck size={15} />已关注</> : <><UserPlus size={15} />关注</>}
            </button>
          )}
        </div>

        {/* Title & shop */}
        <h1 className="text-2xl md:text-3xl font-bold mb-3 text-balance">{diary.title}</h1>
        {diary.shops && (
          <Link to={`/shops/${diary.shop_id}`} className="inline-flex items-center gap-2 text-sm mb-4 px-3 py-1.5 rounded-full transition-colors hover:bg-accent"
            style={{ background: 'hsla(27,80%,52%,0.08)', color: 'hsl(var(--primary))' }}>
            <MapPin size={13} />
            {diary.shops.name} · {diary.shops.area}
          </Link>
        )}

        {/* Ratings */}
        <div className="flex items-center flex-wrap gap-4 mb-6 p-4 rounded-xl" style={{ background: 'hsla(27,80%,52%,0.06)' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">总评</span>
            <StarRating value={diary.rating_overall} size={18} />
            <span className="font-bold text-lg" style={{ color: 'hsl(var(--primary))' }}>{diary.rating_overall}</span>
          </div>
          {ratingItems.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <StarRating value={item.value} size={12} />
              <span className="text-xs font-medium">{item.value}</span>
            </div>
          ))}
        </div>

        {/* Images */}
        {images.length > 0 && (
          <div className="mb-6">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] mb-2">
              <img src={images[activeImg]} alt="" className="w-full h-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all"
                    style={{ borderColor: i === activeImg ? 'hsl(var(--primary))' : 'transparent' }}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="prose prose-sm max-w-none mb-6 leading-relaxed text-foreground" style={{ whiteSpace: 'pre-wrap' }}>
          {diary.content}
        </div>

        {/* Tags */}
        {(diary.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {diary.tags.map(tag => (
              <span key={tag} className="xunwei-tag tag-recommend">#{tag}</span>
            ))}
          </div>
        )}

        {/* Like */}
        <div className="flex items-center gap-6 py-4 border-t border-b border-border mb-8">
          <button onClick={handleLike}
            className={`flex items-center gap-2 text-base transition-all hover:scale-105 ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}>
            <Heart size={22} className={liked ? 'fill-current' : ''} />
            <span className="font-medium">{diary.likes_count}</span>
          </button>
          <button onClick={() => commentRef.current?.focus()}
            className="flex items-center gap-2 text-base text-muted-foreground hover:text-primary transition-colors">
            <MessageSquare size={22} />
            <span className="font-medium">{diary.comments_count}</span>
          </button>
        </div>

        {/* Comments */}
        <div id="comments">
          <h2 className="text-xl font-bold mb-5 text-balance">评论 ({comments.length})</h2>
          {user && (
            <form onSubmit={handleComment} className="flex gap-3 mb-6">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                style={{ background: 'hsl(var(--primary))' }}>
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 flex items-end gap-2">
                <textarea
                  ref={commentRef}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="说点什么..."
                  rows={2}
                  className="xunwei-input flex-1 resize-none"
                />
                <button type="submit" disabled={submitting || !commentText.trim()}
                  className="btn-primary px-4 py-2.5 flex-shrink-0 disabled:opacity-50">
                  <Send size={16} />
                </button>
              </div>
            </form>
          )}
          {!user && (
            <div className="text-center py-4 mb-6 rounded-xl bg-muted/50">
              <Link to="/login" className="text-primary font-medium hover:underline">登录</Link>
              <span className="text-muted-foreground text-sm">后发表评论</span>
            </div>
          )}
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0"
                  style={{ background: 'hsl(var(--primary))' }}>
                  {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> : (comment.profiles?.username || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{comment.profiles?.username || '匿名'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                      {user && (comment.user_id === user.id || profile?.role === 'admin' || profile?.role === 'super_admin') && (
                        <button onClick={() => handleDeleteComment(comment.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground text-pretty">{comment.content}</p>
                </div>
              </div>
            ))}
            {!comments.length && <p className="text-center text-muted-foreground text-sm py-6">暂无评论，快来抢沙发！</p>}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
