// ============================================================
// 寻味美食探店 - 全局类型定义
// ============================================================

export type UserRole = 'user' | 'admin' | 'super_admin';
export type ShopStatus = 'active' | 'pending' | 'closed';
export type DiaryStatus = 'pending' | 'approved' | 'rejected';
export type CollectionType = 'want' | 'checked' | 'favorite';

/** 管理员邀请码 */
export interface InviteCode {
  id: string;
  code: string;
  created_by: string;
  notes: string | null;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_disabled: boolean;
  created_at: string;
  admin_invite_uses?: InviteUse[];
}

/** 邀请码使用记录 */
export interface InviteUse {
  id: string;
  invite_code_id: string;
  used_by_user_id: string | null;
  registered_email: string | null;
  used_at: string;
}
export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  followers_count: number;
  following_count: number;
  created_at: string;
}

/** 店铺 */
export interface Shop {
  id: string;
  name: string;
  type: string;
  area: string;
  address: string | null;
  description: string | null;
  images: string[];
  price_per_person: number;
  rating_avg: number;
  rating_count: number;
  rating_taste: number;
  rating_env: number;
  rating_service: number;
  rating_value: number;
  status: ShopStatus;
  created_by: string | null;
  created_at: string;
}

/** 探店日记 */
export interface Diary {
  id: string;
  user_id: string;
  shop_id: string;
  title: string;
  content: string;
  images: string[];
  rating_overall: number;
  rating_taste: number;
  rating_env: number;
  rating_service: number;
  rating_value: number;
  tags: string[];
  likes_count: number;
  comments_count: number;
  status: DiaryStatus;
  created_at: string;
  profiles?: Profile;
  shops?: Shop;
  is_liked?: boolean;
}

/** 日记评论 */
export interface DiaryComment {
  id: string;
  diary_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

/** 关注关系 */
export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
  profiles?: Profile;
}

/** 收藏/打卡 */
export interface Collection {
  user_id: string;
  shop_id: string;
  type: CollectionType;
  created_at: string;
  shops?: Shop;
}

/** 搜索结果 */
export interface SearchResult {
  type: 'shop' | 'diary';
  id: string;
  title: string;
  description: string;
  image_url: string | null;
}

/** 表单：创建/编辑店铺 */
export interface ShopFormData {
  name: string;
  type: string;
  area: string;
  address: string;
  description: string;
  images: string[];
  price_per_person: number;
  status: ShopStatus;
}

/** 表单：发布日记 */
export interface DiaryFormData {
  shop_id: string;
  title: string;
  content: string;
  images: string[];
  rating_overall: number;
  rating_taste: number;
  rating_env: number;
  rating_service: number;
  rating_value: number;
  tags: string[];
}

/** 店铺筛选参数 */
export interface ShopFilters {
  type?: string;
  area?: string;
  keyword?: string;
  sortBy?: 'rating' | 'price_asc' | 'price_desc' | 'newest';
}

/** 日记筛选参数 */
export interface DiaryFilters {
  tab?: 'recommended' | 'latest' | 'hot' | 'following';
  area?: string;
  shopId?: string;
}

/** 后台统计数据 */
export interface AdminStats {
  totalShops: number;
  totalUsers: number;
  totalDiaries: number;
  pendingDiaries: number;
}

export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}
