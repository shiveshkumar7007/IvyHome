function Pagination({ offset, limit, total, onChange }) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) return null;

  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      <button
        className="rounded-xl border border-[#1E2022]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E2022] disabled:cursor-not-allowed disabled:opacity-40 transition hover:border-[#D97051] hover:text-[#D97051]"
        disabled={currentPage === 1}
        onClick={() => onChange(offset - limit)}
      >
        Previous
      </button>

      <span className="rounded-xl bg-[#FDF1EA] px-4 py-2.5 text-sm font-semibold text-[#1E2022]">
        Page {currentPage} of {totalPages}
      </span>

      <button
        className="rounded-xl border border-[#1E2022]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#1E2022] disabled:cursor-not-allowed disabled:opacity-40 transition hover:border-[#D97051] hover:text-[#D97051]"
        disabled={currentPage === totalPages}
        onClick={() => onChange(offset + limit)}
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;