import { useEffect, useState, useMemo } from "react";
import ListingCards from "../components/ListingCards";
import { getAllRentals } from "../api/ivyApi";

export default function Rentals() {
  const [allRentals, setAllRentals] = useState(() => window.__IVY_DB_CACHE__ || []);
  const [loading, setLoading] = useState(!window.__IVY_DB_CACHE__);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [bedroom, setBedroom] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    async function loadData() {
      if (!window.__IVY_DB_CACHE__) setLoading(true);
      setError("");
      try {
        const data = await getAllRentals();
        setAllRentals(data || []);
      } catch (err) {
        setError(err.message || "Failed to load rentals database.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredRentals = useMemo(() => {
    let result = [...allRentals];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(item => 
        (item.locality || "").toLowerCase().includes(q) || 
        (item.apartment_name || "").toLowerCase().includes(q)
      );
    }
    if (bedroom) {
      result = result.filter(item => Number(item.bedroom) === Number(bedroom));
    }
    if (furnishing) {
      result = result.filter(item => (item.furnishing || "").toLowerCase() === furnishing.toLowerCase());
    }
    if (maxPrice) {
      result = result.filter(item => Number(item.price) <= Number(maxPrice));
    }

    if (sortBy === "price-asc") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "area-desc") {
      result.sort((a, b) => Number(b.carpet_area) - Number(a.carpet_area));
    }

    return result.map(item => ({ ...item, __type: 'rental' }));
  }, [allRentals, search, bedroom, furnishing, maxPrice, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setBedroom("");
    setFurnishing("");
    setMaxPrice("");
    setSortBy("default");
  };

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#1E2022]">Rental Properties</h1>
        
        <section className="mb-8 rounded-2xl bg-[#FDF1EA] p-5 shadow-sm border border-[#1E2022]/10">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-4">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Search Locality</label>
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="e.g. viman nagar..." 
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D97051]" 
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Bedrooms</label>
              <select 
                value={bedroom} 
                onChange={(e) => setBedroom(e.target.value)} 
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]"
              >
                <option value="">Any</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4 BHK</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Furnishing</label>
              <select 
                value={furnishing} 
                onChange={(e) => setFurnishing(e.target.value)} 
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]"
              >
                <option value="">Any</option>
                <option value="fully-furnished">Fully Furnished</option>
                <option value="semi-furnished">Semi Furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Max Rent / Mo</label>
              <select 
                value={maxPrice} 
                onChange={(e) => setMaxPrice(e.target.value)} 
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]"
              >
                <option value="">Any rent</option>
                <option value="25000">₹25,000</option>
                <option value="50000">₹50,000</option>
                <option value="75000">₹75,000</option>
                <option value="100000">₹1,00,000+</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#1E2022]/10 pt-4">
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)} 
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#D97051]"
            >
              <option value="default">Sort: Relevance</option>
              <option value="price-asc">Sort: Rent (Low to High)</option>
              <option value="price-desc">Sort: Rent (High to Low)</option>
              <option value="area-desc">Sort: Area (Largest First)</option>
            </select>
            <button 
              onClick={clearFilters} 
              className="rounded-xl bg-white border border-gray-300 px-4 py-2 text-sm font-bold text-[#1E2022] hover:border-[#D97051] hover:text-[#D97051] transition"
            >
              Clear Filters
            </button>
          </div>
        </section>

        {loading ? (
          <div className="p-16 font-bold text-center animate-pulse text-gray-500 bg-gray-50 rounded-2xl">Loading full rentals database...</div>
        ) : error ? (
          <div className="p-10 font-bold text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        ) : filteredRentals.length > 0 ? (
          <>
            <div className="mb-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
              Showing all {filteredRentals.length} rental records
            </div>
            <ListingCards listings={filteredRentals} />
          </>
        ) : (
          <div className="p-10 font-bold text-center text-gray-500 bg-gray-50 rounded-2xl">No rentals matched your filters.</div>
        )}
      </main>
    </div>
  );
}