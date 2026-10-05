type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  itemLabel: string;
  ariaLabel: string;
  onPageChange: (page: number) => void;
};

export function Pagination({
  page,
  pageSize,
  total,
  itemLabel,
  ariaLabel,
  onPageChange,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pages = new Set<number>([1, pageCount]);
  for (let candidate = Math.max(1, page - 1); candidate <= Math.min(pageCount, page + 1); candidate += 1) {
    pages.add(candidate);
  }
  const visiblePages = [...pages].sort((left, right) => left - right);

  return (
    <nav aria-label={ariaLabel} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-500" aria-live="polite">
        Showing {start}–{end} of {total} {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-masala-300 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        {visiblePages.map((currentPage, index) => (
          <span key={currentPage} className="contents">
            {index > 0 && currentPage - visiblePages[index - 1] > 1 ? (
              <span className="px-1 text-sm text-ink-400" aria-hidden="true">…</span>
            ) : null}
            <button
              type="button"
              className={`size-9 rounded-lg border text-sm font-semibold transition ${
                currentPage === page
                  ? "border-masala-700 bg-masala-700 text-white"
                  : "border-paper-200 bg-white text-ink-700 hover:border-masala-300"
              }`}
              aria-label={`Page ${currentPage}`}
              aria-current={currentPage === page ? "page" : undefined}
              onClick={() => onPageChange(currentPage)}
            >
              {currentPage}
            </button>
          </span>
        ))}
        <button
          type="button"
          className="rounded-lg border border-paper-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-masala-300 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
        </button>
      </div>
    </nav>
  );
}