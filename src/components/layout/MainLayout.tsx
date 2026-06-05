import { type ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

interface MainLayoutProps {
  children: ReactNode;
  noFooter?: boolean;
  noPadding?: boolean;
}

export default function MainLayout({ children, noFooter = false, noPadding = false }: MainLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className={`flex-1 ${noPadding ? '' : 'pt-16'}`}>
        {children}
      </main>
      {!noFooter && <Footer />}
    </div>
  );
}
