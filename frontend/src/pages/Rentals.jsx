import { useEffect, useState, useMemo } from "react";
import ListingCards from "../components/ListingCards";
import Pagination from "../components/Pagination";
import { getRentals, extractItems } from "../api/ivyApi";

const ITEMS_PER_PAGE = 12;

export default function Rentals() {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Filter States
  const [search, setSearch] = useState("");
  const [bedroom, setBedroom] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    async function loadRentals() {
      setLoading(true);
      setError("");
      try {
        const response = await getRentals({ offset, limit: ITEMS_PER_PAGE });
        const items = extractItems(response).map(item => ({ ...item, __type: 'rental' }));
        setRentals(items); 
        setTotal(response?.total || 0);
      } catch (err) {
        setError(err.message || "Failed to load rentals from server.");
      } finally {
        setLoading(false);
      }
    }
    loadRentals();
  }, [offset]);

  const filteredAndSortedRentals = useMemo(() => {
    let result = rentals.filter((listing) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || String(listing.apartment_name || "").toLowerCase().includes(query) || String(listing.locality || "").toLowerCase().includes(query);
      const matchesBedroom = !bedroom || Number(listing.bedroom || listing.bhk) === Number(bedroom);
      const matchesFurnishing = !furnishing || String(listing.furnishing || "").toLowerCase() === furnishing.toLowerCase();
      const matchesPrice = !maxPrice || Number(listing.price || listing.monthly_rent || 0) <= Number(maxPrice);
      return matchesSearch && matchesBedroom && matchesFurnishing && matchesPrice;
    });

    if (sortBy === "price-asc") result.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortBy === "price-desc") result.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortBy === "area-desc") result.sort((a, b) => (b.carpet_area || 0) - (a.carpet_area || 0));

    return result;
  }, [rentals, search, bedroom, furnishing, maxPrice, sortBy]);

  const clearFilters = () => {
    setSearch(""); setBedroom(""); setFurnishing(""); setMaxPrice(""); setSortBy("default");
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#1E2022]">Find your next rental home</h1>
        
        <section className="mb-8 rounded-2xl bg-[#FDF1EA] p-5 shadow-sm border border-[#1E2022]/10">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-4">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Search</label>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Locality or property..." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D97051]" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Bedrooms</label>
              <select value={bedroom} onChange={(e) => setBedroom(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any</option><option value="1">1 BHK</option><option value="2">2 BHK</option><option value="3">3 BHK</option><option value="4">4+ BHK</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Furnishing</label>
              <select value={furnishing} onChange={(e) => setFurnishing(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any</option><option value="fully-furnished">Fully Furnished</option><option value="semi-furnished">Semi Furnished</option><option value="unfurnished">Unfurnished</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Max Monthly Rent</label>
              <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any price</option><option value="25000">₹25,000</option><option value="50000">₹50,000</option><option value="100000">₹1 L</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#1E2022]/10 pt-4">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#D97051]">
              <option value="default">Sort: Relevance</option>
              <option value="price-asc">Sort: Rent (Low to High)</option>
              <option value="price-desc">Sort: Rent (High to Low)</option>
            </select>
            <button onClick={clearFilters} className="rounded-xl bg-white border border-gray-300 px-4 py-2 text-sm font-bold text-[#1E2022] hover:border-[#D97051] hover:text-[#D97051] transition">
              Clear Filters
            </button>
          </div>
        </section>

        {loading ? (
          <div className="p-10 font-bold text-center animate-pulse text-gray-500 bg-gray-50 rounded-2xl">Loading rentals...</div>
        ) : error ? (
          <div className="p-10 font-bold text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        ) : filteredAndSortedRentals.length > 0 ? (
          <>
            <ListingCards listings={filteredAndSortedRentals} />
            <Pagination offset={offset} limit={ITEMS_PER_PAGE} total={total} onChange={setOffset} />
          </>
        ) : (
          <div className="p-10 font-bold text-center text-gray-500 bg-gray-50 rounded-2xl">No rentals matched your filters on this page.</div>
        )}
      </main>
    </div>
  );
}