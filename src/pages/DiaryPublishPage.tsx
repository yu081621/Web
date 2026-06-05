import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import type { Shop } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';
import StarRating from '@/components/common/StarRating';
import ImageUploader from '@/components/common/ImageUploader';
import MainLayout from '@/components/layout/MainLayout';
import { Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DiaryPublishPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state as { shopId?: string; shopName?: string } | null;
  const shopDropRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    shop_id: prefill?.shopId || '',
    shopName: prefill?.shopName || '',
    title: '',
    content: '',
    images: [] as string[],
    rating_overall: 5,
    rating_taste: 5,
    rating_env: 5,
    rating_service: 5,
    rating_value: 5,
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [shopSearch, setShopSearch] = useState(prefill?.shopName || '');
  const [shopResults, setShopResults] = useState<Shop[]>([]);
  const [showShopDrop, setShowShopDrop] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (shopDropRef.current && !shopDropRef.current.contains(e.target as Node)) {
        setShowShopDrop(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login', { state: { from: '/diary/publish' } }); }
  }, [user]);

  const searchShops = async (q: string) => {
    if (!q.trim()) { setShopResults([]); return; }
    const { data } = await supabase.from('shops').select('id,name,area,type').eq('status', 'active').ilike('name', `%${q}%`).limit(6);
    setShopResults(data as Shop[] || []);
  };

  useEffect(() => {
    const t = setTimeout(() => searchShops(shopSearch), 300);
    return () => clearTimeout(t);
  }, [shopSearch]);

  const setRating = (field: string, val: number) => setForm(f => ({ ...f, [field]: val }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) { setTagInput(''); return; }
    setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput('');
  };

  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('请填写日记标题'); return; }
    if (!form.content.trim()) { toast.error('请填写探店心得'); return; }
    if (!user) { toast.error('请先登录'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('diaries').insert({
      user_id: user.id,
      shop_id: form.shop_id || null,
      title: form.title.trim(),
      content: form.content.trim(),
      images: form.images,
      rating_overall: form.rating_overall,
      rating_taste: form.rating_taste,
      rating_env: form.rating_env,
      rating_service: form.rating_service,
      rating_value: form.rating_value,
      tags: form.tags,
      status: 'pending',
    });
    setSubmitting(false);
    if (error) { toast.error('发布失败: ' + error.message); return; }
    toast.success('日记已提交，等待审核后发布！');
    navigate('/profile');
  };

  const ratingFields = [
    { label: '口味', field: 'rating_taste' },
    { label: '环境', field: 'rating_env' },
    { label: '服务', field: 'rating_service' },
    { label: '性价比', field: 'rating_value' },
  ] as const;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2 text-balance">发布探店日记</h1>
        <p className="text-muted-foreground mb-8 text-pretty">分享你的探店体验，帮助更多人找到好餐厅</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 选择店铺（强烈建议） */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium">关联店铺</label>
              {form.shop_id
                ? <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'hsla(160,60%,40%,0.12)', color: 'hsl(160,60%,32%)' }}>✓ 已关联</span>
                : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">建议填写</span>
              }
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {form.shop_id
                ? '日记审核通过后将显示在该店铺的探店日记列表中'
                : '⚠️ 未关联店铺时，日记审核通过后不会出现在任何店铺页面中'}
            </p>
            <div className="relative" ref={shopDropRef}>
              <div className="xunwei-input flex items-center gap-2 cursor-text" onClick={() => { if (!form.shop_id) setShowShopDrop(true); }}>
                <Search size={16} className="text-muted-foreground flex-shrink-0" />
                {form.shop_id ? (
                  <span className="flex-1 text-sm">{form.shopName}</span>
                ) : (
                  <input
                    type="text"
                    placeholder="搜索店铺名称关联（可不填）"
                    value={shopSearch}
                    onChange={e => { setShopSearch(e.target.value); setShowShopDrop(true); }}
                    onFocus={() => setShowShopDrop(true)}
                    className="flex-1 outline-none bg-transparent text-sm"
                  />
                )}
                {form.shop_id && (
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, shop_id: '', shopName: '' })); setShopSearch(''); }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="取消关联">
                    <X size={15} />
                  </button>
                )}
              </div>
              {showShopDrop && !form.shop_id && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-lg border border-border z-50 overflow-hidden">
                  {shopResults.length > 0 ? (
                    shopResults.map(s => (
                      <button key={s.id} type="button"
                        onClick={() => { setForm(f => ({ ...f, shop_id: s.id, shopName: s.name })); setShopSearch(s.name); setShowShopDrop(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left">
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.type} · {s.area}</p>
                        </div>
                      </button>
                    ))
                  ) : shopSearch.trim() ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">未找到匹配店铺</div>
                  ) : null}
                  {/* 跳过选项 */}
                  <button type="button"
                    onClick={() => { setForm(f => ({ ...f, shop_id: '', shopName: '' })); setShopSearch(''); setShowShopDrop(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-accent border-t border-border transition-colors">
                    <X size={14} />不关联任何店铺
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium mb-2">日记标题 <span className="text-red-500">*</span></label>
            <input type="text" placeholder="给你的探店日记起个标题吧" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="xunwei-input" maxLength={50} />
            <p className="text-xs text-muted-foreground mt-1 text-right">{form.title.length}/50</p>
          </div>

          {/* 综合评分 */}
          <div>
            <label className="block text-sm font-medium mb-3">综合评分 <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-4">
              <StarRating value={form.rating_overall} size={32} interactive onChange={v => setRating('rating_overall', v)} />
              <span className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>{form.rating_overall}</span>
            </div>
          </div>

          {/* 分项评分 */}
          <div className="grid grid-cols-2 gap-4">
            {ratingFields.map(({ label, field }) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-2">{label}</label>
                <StarRating value={form[field]} size={20} interactive onChange={v => setRating(field, v)} />
              </div>
            ))}
          </div>

          {/* 探店心得 */}
          <div>
            <label className="block text-sm font-medium mb-2">探店心得 <span className="text-red-500">*</span></label>
            <textarea
              placeholder="分享你的用餐体验、菜品感受、环境评价等..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={6}
              className="xunwei-input resize-none"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{form.content.length}/2000</p>
          </div>

          {/* 图片上传 */}
          <div>
            <label className="block text-sm font-medium mb-2">上传图片（最多9张）</label>
            <ImageUploader bucket="diary-images" value={form.images} onChange={imgs => setForm(f => ({ ...f, images: imgs }))} maxFiles={9} />
          </div>

          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium mb-2">添加标签</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map(tag => (
                <span key={tag} className="xunwei-tag tag-recommend flex items-center gap-1">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="输入标签，如「性价比高」「环境好」"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                className="xunwei-input flex-1"
                maxLength={15}
              />
              <button type="button" onClick={addTag} className="btn-secondary px-4">添加</button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">取消</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting && <Loader2 size={16} className="animate-spin mr-2" />}
              {submitting ? '提交中...' : '发布日记'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
