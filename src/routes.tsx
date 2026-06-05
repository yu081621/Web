import { type RouteObject } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import ShopsPage from '@/pages/ShopsPage';
import ShopDetailPage from '@/pages/ShopDetailPage';
import DiariesPage from '@/pages/DiariesPage';
import DiaryDetailPage from '@/pages/DiaryDetailPage';
import DiaryPublishPage from '@/pages/DiaryPublishPage';
import RankPage from '@/pages/RankPage';
import ProfilePage from '@/pages/ProfilePage';
import LoginPage from '@/pages/LoginPage';
import SearchPage from '@/pages/SearchPage';
import AdminPage from '@/pages/AdminPage';
import AdminLoginPage from '@/pages/AdminLoginPage';

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/shops', element: <ShopsPage /> },
  { path: '/shops/:id', element: <ShopDetailPage /> },
  { path: '/diaries', element: <DiariesPage /> },
  { path: '/diaries/:id', element: <DiaryDetailPage /> },
  { path: '/diary/publish', element: <DiaryPublishPage /> },
  { path: '/rank', element: <RankPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/admin', element: <AdminPage /> },
  { path: '/admin/login', element: <AdminLoginPage /> },
  { path: '/guanliyuan', element: <AdminLoginPage /> },  // 别名入口
  { path: '*', element: <HomePage /> },
];
