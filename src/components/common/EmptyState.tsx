import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title = '暂无数据', description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-muted-foreground/40">
        {icon || <Inbox size={48} strokeWidth={1.5} />}
      </div>
      <h3 className="font-semibold text-foreground mb-1 text-balance">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 text-pretty max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
