export default function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`admin-skeleton ${className}`} aria-hidden="true" />;
}
