export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`anvaya-skeleton block rounded-card ${className}`} />;
}
