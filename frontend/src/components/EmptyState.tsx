export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-line bg-surface-muted/50 px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface">
        <span className="text-sm text-faint">—</span>
      </div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-pale focus-visible:outline-brand"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
