import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import type { Shop } from '@/types/index';
import StarRating from '@/components/common/StarRating';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MainLayout from '@/components/layout/MainLayout';
import { MapPin, TrendingUp, Flame, Star, Utensils, Wind } from 'lucide-react';

const RANKS = [
  { key: 'hot', label: '热门榜', icon: <Flame size={16} />, sortBy: 'rating_avg', desc: '综合评分最高' },
  { key: 'new', label: '新店榜', icon: <TrendingUp size={16} />, sortBy: 'created_at', desc: '最新入驻' },
  { key: 'value', label: '性价比榜', icon: <Star size={16} />, sortBy: 'rating_value', desc: '高分低价' },
  { key: 'taste', label: '口味榜', icon: <Utensils size={16} />, sortBy: 'rating_taste', desc: '最好吃' },
  { key: 'env', label: '环境榜', icon: <Wind size={16} />, sortBy: 'rating_env', desc: '最舒适' },
];

export default function RankPage() {
  const [activeRank, setActiveRank] = useState('hot');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRank = async (key: string) => {
    setLoading(true);
    const rank = RANKS.find(r => r.key === key)!;
    const { data } = await supabase.from('shops').select('*').eq('status', 'active').order(rank.sortBy, { ascending: false }).limit(20);
    setShops(data as Shop[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchRank(activeRank); }, [activeRank]);

  const rankConfig = RANKS.find(r => r.key === activeRank)!;
  const medalColors = ['#FF7A00', '#e67e22', '#f39c12'];

  return (
    <MainLayout>
      <div className="page-header">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-balance">美食榜单</h1>
          <p className="text-muted-foreground text-pretty">发现最受欢迎的城市美食</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {RANKS.map(rank => (
            <button
              key={rank.key}
              onClick={() => setActiveRank(rank.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all flex-shrink-0 border-2 ${activeRank === rank.key ? 'text-white border-transparent' : 'bg-card border-border text-foreground hover:border-primary hover:text-primary'}`}
              style={{ background: activeRank === rank.key ? 'hsl(var(--primary))' : undefined, borderColor: activeRank === rank.key ? 'transparent' : undefined }}
            >
              {rank.icon}
              {rank.label}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'hsl(var(--primary))' }}>
            {rankConfig.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-balance">{rankConfig.label}</h2>
            <p className="text-sm text-muted-foreground">{rankConfig.desc}</p>
          </div>
        </div>

        {loading ? <LoadingSpinner text="加载榜单..." /> : (
          <div className="space-y-3">
            {shops.map((shop, idx) => (
              <Link to={`/shops/${shop.id}`} key={shop.id}
                className="xunwei-card flex items-center gap-4 p-4 group transition-all hover:-translate-y-0.5">
                {/* Rank number */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0"
                  style={{ background: idx < 3 ? medalColors[idx] : 'hsl(var(--muted))', color: idx < 3 ? 'white' : 'hsl(var(--muted-foreground))' }}>
                  {idx + 1}
                </div>
                {/* Image */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 card-image">
                  <img
                    src={Array.isArray(shop.images) && shop.images.length > 0 ? shop.images[0] : 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=200'}
                    alt={shop.name}
                    className="w-full h-full object-cover transition-transform duration-300"
                  />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base mb-1 truncate text-balance group-hover:text-primary transition-colors">{shop.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="xunwei-tag tag-recommend text-xs py-0.5 px-2">{shop.type}</span>
                    <span className="flex items-center gap-1"><MapPin size={10} />{shop.area}</span>
                  </div>
                </div>
                {/* Score */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <div className="flex items-center gap-1 mb-1">
                    <Star size={14} className="fill-current" style={{ color: 'hsl(var(--secondary))' }} />
                    <span className="font-bold text-lg" style={{ color: 'hsl(var(--primary))' }}>
                      {activeRank === 'taste' ? shop.rating_taste?.toFixed(1) :
                       activeRank === 'env' ? shop.rating_env?.toFixed(1) :
                       activeRank === 'value' ? shop.rating_value?.toFixed(1) :
                       shop.rating_avg?.toFixed(1) || '—'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">¥{shop.price_per_person}/人</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
