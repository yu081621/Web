import { BrowserRouter, useRoutes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { routes } from '@/routes';

function AppRoutes() {
  return useRoutes(routes);
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              borderRadius: '12px',
              fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
