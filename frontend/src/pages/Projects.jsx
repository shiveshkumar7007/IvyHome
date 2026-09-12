import { useEffect, useState, useMemo } from "react";
import ListingCards from "../components/ListingCards";
import Pagination from "../components/Pagination";
import { getProjects, extractItems } from "../api/ivyApi";

const ITEMS_PER_PAGE = 12;

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Filter States
  const [search, setSearch] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setError("");
      try {
        const response = await getProjects({ offset, limit: ITEMS_PER_PAGE });
        const items = extractItems(response).map(item => ({ ...item, __type: 'project' }));
        setProjects(items);
        setTotal(response?.total || 0);
      } catch (err) {
        setError(err.message || "Failed to load projects from server.");
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, [offset]);

  const filteredAndSortedProjects = useMemo(() => {
    let result = projects.filter((listing) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || String(listing.project_name || listing.name || "").toLowerCase().includes(query) || String(listing.locality || "").toLowerCase().includes(query);
      const matchesStatus = !projectStatus || String(listing.project_status || "").toLowerCase() === projectStatus.toLowerCase();
      const matchesPrice = !maxPrice || Number(listing.price_min || listing.price || 0) <= Number(maxPrice);
      return matchesSearch && matchesStatus && matchesPrice;
    });

    if (sortBy === "price-asc") result.sort((a, b) => (a.price_min || a.price || 0) - (b.price_min || b.price || 0));
    if (sortBy === "price-desc") result.sort((a, b) => (b.price_min || b.price || 0) - (a.price_min || a.price || 0));
    return result;
  }, [projects, search, projectStatus, maxPrice, sortBy]);

  const clearFilters = () => {
    setSearch(""); setProjectStatus(""); setMaxPrice(""); setSortBy("default");
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#1E2022]">New Residential Developments</h1>
        
        <section className="mb-8 rounded-2xl bg-[#FDF1EA] p-5 shadow-sm border border-[#1E2022]/10">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Search</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Locality or project name..." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D97051]" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Project Status</label>
              <select value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any</option>
                <option value="new launch">New Launch</option>
                <option value="ready to move">Ready to Move</option>
                <option value="under construction">Under Construction</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Max Starting Price</label>
              <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any price</option><option value="5000000">₹50 L</option><option value="10000000">₹1 Cr</option><option value="20000000">₹2 Cr</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#1E2022]/10 pt-4">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#D97051]">
              <option value="default">Sort: Relevance</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
            </select>
            <button onClick={clearFilters} className="rounded-xl bg-white border border-gray-300 px-4 py-2 text-sm font-bold text-[#1E2022] hover:border-[#D97051] hover:text-[#D97051] transition">
              Clear Filters
            </button>
          </div>
        </section>

        {loading ? (
          <div className="p-10 font-bold text-center animate-pulse text-gray-500 bg-gray-50 rounded-2xl">Loading projects...</div>
        ) : error ? (
          <div className="p-10 font-bold text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        ) : filteredAndSortedProjects.length > 0 ? (
          <>
            <ListingCards listings={filteredAndSortedProjects} />
            <Pagination offset={offset} limit={ITEMS_PER_PAGE} total={total} onChange={setOffset} />
          </>
        ) : (
          <div className="p-10 font-bold text-center text-gray-500 bg-gray-50 rounded-2xl">No projects matched your filters on this page.</div>
        )}
      </main>
    </div>
  );
}