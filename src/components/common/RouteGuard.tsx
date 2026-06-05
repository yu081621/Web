import { type ReactNode } from 'react';

// RouteGuard is a passthrough - auth is handled per-page in each component
export function RouteGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
