import { useEffect, useState, useMemo } from "react";
import ListingCards from "../components/ListingCards";
import { getAllProjects } from "../api/ivyApi";

export default function Projects() {
  const [allProjects, setAllProjects] = useState(() => window.__IVY_DB_CACHE__ || []);
  const [loading, setLoading] = useState(!window.__IVY_DB_CACHE__);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("wakad");
  const [builder, setBuilder] = useState("");
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    async function loadData() {
      if (!window.__IVY_DB_CACHE__) setLoading(true);
      setError("");
      try {
        const data = await getAllProjects();
        setAllProjects(data || []);
      } catch (err) {
        setError(err.message || "Failed to load projects database.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredProjects = useMemo(() => {
    let result = [...allProjects];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(item => 
        (item.locality || "").toLowerCase().includes(q) || 
        (item.project_name || item.title || "").toLowerCase().includes(q) ||
        (item.builder_name || "").toLowerCase().includes(q)
      );
    }
    if (builder.trim()) {
      const b = builder.toLowerCase().trim();
      result = result.filter(item => (item.builder_name || "").toLowerCase().includes(b));
    }

    if (sortBy === "price-asc") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    }

    return result.map(item => ({ ...item, __type: 'project' }));
  }, [allProjects, search, builder, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setBuilder("");
    setSortBy("default");
  };

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#1E2022]">Development Projects</h1>
        
        <section className="mb-8 rounded-2xl bg-[#FDF1EA] p-5 shadow-sm border border-[#1E2022]/10">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Search Project / Locality</label>
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="eg...wakad" 
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D97051]" 
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Builder Name</label>
              <input 
                type="text" 
                value={builder} 
                onChange={(e) => setBuilder(e.target.value)} 
                placeholder="e.g. salarpuria..." 
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D97051]" 
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Sort Order</label>
              <select 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value)} 
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold outline-none focus:border-[#D97051]"
              >
                <option value="default">Sort: Relevance</option>
                <option value="price-asc">Sort: Price (Low to High)</option>
                <option value="price-desc">Sort: Price (High to Low)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end border-t border-[#1E2022]/10 pt-4">
            <button 
              onClick={clearFilters} 
              className="rounded-xl bg-white border border-gray-300 px-4 py-2 text-sm font-bold text-[#1E2022] hover:border-[#D97051] hover:text-[#D97051] transition"
            >
              Clear Filters
            </button>
          </div>
        </section>

        {loading ? (
          <div className="p-16 font-bold text-center animate-pulse text-gray-500 bg-gray-50 rounded-2xl">Loading full projects database...</div>
        ) : error ? (
          <div className="p-10 font-bold text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        ) : filteredProjects.length > 0 ? (
          <>
            <div className="mb-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
              Showing all {filteredProjects.length} project records
            </div>
            <ListingCards listings={filteredProjects} />
          </>
        ) : (
          <div className="p-10 font-bold text-center text-gray-500 bg-gray-50 rounded-2xl">No projects matched your filters.</div>
        )}
      </main>
    </div>
  );
}