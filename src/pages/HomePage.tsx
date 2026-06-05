import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import type { Shop, Diary } from '@/types/index';
import StarRating from '@/components/common/StarRating';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MainLayout from '@/components/layout/MainLayout';
import { Search, MapPin, Utensils, ChevronRight, Heart, MessageSquare, TrendingUp, Star, Flame } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { label: '火锅', emoji: '🍲', value: '火锅' },
  { label: '烧烤', emoji: '🔥', value: '烧烤' },
  { label: '甜品', emoji: '🍰', value: '甜品' },
  { label: '中餐', emoji: '🥢', value: '中餐' },
  { label: '西餐', emoji: '🍝', value: '西餐' },
  { label: '日料', emoji: '🍣', value: '日料' },
  { label: '韩料', emoji: '🍜', value: '韩料' },
  { label: '小吃', emoji: '🥟', value: '小吃' },
];

const RANK_TABS = [
  { label: '热门榜', key: 'hot', icon: <Flame size={15} />, sortBy: 'rating_avg' },
  { label: '新店榜', key: 'new', icon: <TrendingUp size={15} />, sortBy: 'created_at' },
  { label: '性价比', key: 'value', icon: <Star size={15} />, sortBy: 'rating_value' },
];

const HERO_BG = 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_32aa1a3e-cc69-4254-9367-39d84c2624c0.jpg';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [featuredShops, setFeaturedShops] = useState<Shop[]>([]);
  const [rankTab, setRankTab] = useState('hot');
  const [rankShops, setRankShops] = useState<Shop[]>([]);
  const [latestDiaries, setLatestDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [shopsRes, diariesRes] = await Promise.all([
          supabase.from('shops').select('*').eq('status', 'active').order('rating_avg', { ascending: false }).limit(8),
          supabase.from('diaries').select('*, profiles!diaries_user_id_fkey(id,username,avatar_url), shops!diaries_shop_id_fkey(id,name,area)').eq('status', 'approved').order('created_at', { ascending: false }).limit(6),
        ]);
        if (shopsRes.data) setFeaturedShops(shopsRes.data as Shop[]);
        if (diariesRes.data) setLatestDiaries(diariesRes.data as Diary[]);
      } catch (err) {
        toast.error('加载数据失败');
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const fetchRank = async () => {
      const tab = RANK_TABS.find(t => t.key === rankTab);
      if (!tab) return;
      const { data } = await supabase
        .from('shops')
        .select('*')
        .eq('status', 'active')
        .order(tab.sortBy as string, { ascending: tab.key === 'value' ? false : false })
        .limit(5);
      if (data) setRankShops(data as Shop[]);
    };
    fetchRank();
  }, [rankTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) navigate(`/search?q=${encodeURIComponent(searchKeyword.trim())}`);
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <MainLayout noPadding>
      {/* Hero */}
      <section className="relative min-h-[520px] md:min-h-[600px] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="美食背景" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(230,126,34,0.85) 0%, rgba(243,156,18,0.7) 60%, rgba(0,0,0,0.3) 100%)' }} />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 pt-20 pb-12 text-center text-white w-full">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-balance" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            寻找城市美味
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8 text-pretty">
            探索身边隐藏的美食宝藏，记录每一次难忘的味觉之旅
          </p>
          <form onSubmit={handleSearch} className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 flex items-center gap-3 bg-white rounded-full px-5 py-3.5 shadow-lg">
              <Search size={18} className="text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="搜索餐厅、美食..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="flex-1 text-foreground bg-transparent outline-none text-base"
              />
            </div>
            <button type="submit" className="btn-primary flex-shrink-0 text-base px-6 py-3.5 shadow-lg">
              搜索
            </button>
          </form>
        </div>
      </section>

      {/* 美食分类 */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-balance">美食分类</h2>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.value}
              to={`/shops?type=${encodeURIComponent(cat.value)}`}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:-translate-y-1"
              style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-xs md:text-sm font-medium text-center">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 精选推荐 */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-balance">精选推荐</h2>
          <Link to="/shops" className="flex items-center gap-1 text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
            查看更多 <ChevronRight size={16} />
          </Link>
        </div>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredShops.slice(0, 8).map(shop => (
              <Link to={`/shops/${shop.id}`} key={shop.id} className="xunwei-card h-full flex flex-col">
                <div className="aspect-[4/3] overflow-hidden card-image">
                  <img
                    src={Array.isArray(shop.images) && shop.images.length > 0 ? shop.images[0] : 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400'}
                    alt={shop.name}
                    className="w-full h-full object-cover transition-transform duration-300"
                  />
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold mb-1 text-balance">{shop.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span className="xunwei-tag tag-recommend text-xs py-0.5 px-2">{shop.type}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} />{shop.area}</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <StarRating value={shop.rating_avg} size={13} />
                    <span className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                      ¥{shop.price_per_person}/人
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 榜单 + 日记 */}
      <section className="bg-muted/40 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* 榜单 */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-balance">热门榜单</h2>
                <Link to="/rank" className="flex items-center gap-1 text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
                  完整榜单 <ChevronRight size={16} />
                </Link>
              </div>
              {/* Tab */}
              <div className="flex gap-2 mb-4">
                {RANK_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setRankTab(tab.key)}
                    className={`filter-btn flex items-center gap-1.5 ${rankTab === tab.key ? 'active' : ''}`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="bg-card rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {rankShops.map((shop, idx) => (
                  <Link
                    to={`/shops/${shop.id}`}
                    key={shop.id}
                    className="flex items-center gap-4 p-4 border-b border-border last:border-0 hover:bg-accent transition-colors"
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}
                      style={{
                        background: idx === 0 ? 'hsl(var(--primary))' : idx === 1 ? 'hsl(27,70%,58%)' : idx === 2 ? 'hsl(39,86%,55%)' : 'hsl(var(--muted))',
                        color: idx < 3 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                      }}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{shop.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{shop.type} · {shop.area}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star size={13} className="fill-current" style={{ color: 'hsl(var(--secondary))' }} />
                      <span className="text-sm font-semibold">{shop.rating_avg?.toFixed(1) || '—'}</span>
                    </div>
                  </Link>
                ))}
                {!rankShops.length && (
                  <p className="text-center text-sm text-muted-foreground py-8">暂无数据</p>
                )}
              </div>
            </div>

            {/* 最新日记 */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-balance">最新日记</h2>
                <Link to="/diaries" className="flex items-center gap-1 text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
                  查看更多 <ChevronRight size={16} />
                </Link>
              </div>
              {loading ? (
                <LoadingSpinner />
              ) : (
                <div className="space-y-4">
                  {latestDiaries.slice(0, 4).map(diary => (
                    <Link to={`/diaries/${diary.id}`} key={diary.id} className="xunwei-card flex gap-4 p-4 group">
                      {Array.isArray(diary.images) && diary.images.length > 0 && (
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 card-image">
                          <img src={diary.images[0]} alt="" className="w-full h-full object-cover transition-transform duration-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-primary flex items-center justify-center text-white text-xs flex-shrink-0"
                            style={{ background: 'hsl(var(--primary))' }}>
                            {diary.profiles?.avatar_url ? (
                              <img src={diary.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{(diary.profiles?.username || '?')[0].toUpperCase()}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{diary.profiles?.username || '匿名用户'}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{formatDate(diary.created_at)}</span>
                        </div>
                        <h3 className="font-medium text-sm mb-1 truncate text-balance">{diary.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 text-pretty">{diary.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart size={12} /> {diary.likes_count}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare size={12} /> {diary.comments_count}
                          </span>
                          {diary.shops && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                              <MapPin size={11} /> {diary.shops.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-balance">分享你的探店故事</h2>
        <p className="text-muted-foreground mb-8 text-pretty">记录每一次美食探索，和更多人分享你的味蕾感受</p>
        <Link to="/diary/publish" className="btn-primary text-base px-8 py-4">
          立即发布日记
        </Link>
      </section>
    </MainLayout>
  );
}
