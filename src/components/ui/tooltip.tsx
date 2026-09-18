import type { ReactNode } from 'react';

type TooltipProviderProps = {
  children: ReactNode;
};

/**
 * The current app does not render individual tooltips yet, but App keeps the
 * provider so tooltip components can be added later without changing layout.
 */
export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}