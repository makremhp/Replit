/**
 * Toasts are not used by the current frontend state. Keeping this component
 * as a no-op makes the shared app shell safe to render and leaves a stable
 * extension point for notifications later.
 */
export function Toaster() {
  return null;
}