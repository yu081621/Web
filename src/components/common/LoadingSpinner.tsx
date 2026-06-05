interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({ size = 'md', text, fullPage = false }: LoadingSpinnerProps) {
  const sizeMap = { sm: 'w-5 h-5 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-3' };
  const spinner = (
    <div className={`${sizeMap[size]} rounded-full border-muted border-t-primary animate-spin`}
      style={{ borderTopColor: 'hsl(var(--primary))' }} />
  );
  if (fullPage) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 z-50 gap-3">
        {spinner}
        {text && <p className="text-sm text-muted-foreground">{text}</p>}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      {spinner}
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
