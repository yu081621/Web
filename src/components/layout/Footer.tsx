import { Link } from 'react-router-dom';
import { UtensilsCrossed, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ background: 'hsl(var(--primary))' }}>
                <UtensilsCrossed size={16} />
              </div>
              <span className="text-lg font-bold" style={{ color: 'hsl(var(--primary))' }}>寻味</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
              探索城市美食，记录每一次味蕾的感动。我们致力于帮助你找到身边最值得打卡的餐厅。
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">发现美食</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/shops" className="hover:text-primary transition-colors">探店</Link></li>
              <li><Link to="/diaries" className="hover:text-primary transition-colors">日记</Link></li>
              <li><Link to="/rank" className="hover:text-primary transition-colors">榜单</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">关于我们</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">用户协议</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">隐私政策</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">联系我们</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>© 2026 寻味. All rights reserved.</p>
          <p className="flex items-center gap-1">
            用 <Heart size={12} className="text-red-500 fill-current" /> 记录每一次美味
          </p>
        </div>
      </div>
    </footer>
  );
}
