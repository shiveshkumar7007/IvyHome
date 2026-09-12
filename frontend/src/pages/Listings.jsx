import { useEffect, useState } from "react";
import ListingCards from "../components/ListingCards";
import Pagination from "../components/Pagination";
import { getListings, extractItems } from "../api/ivyApi";

const ITEMS_PER_PAGE = 12;

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  // Filter States
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedroom, setBedroom] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("default");

  useEffect(() => {
    async function loadListings() {
      setLoading(true);
      setError("");
      try {
        const params = {
          offset,
          limit: ITEMS_PER_PAGE,
        };
        if (search) params.locality = search.toLowerCase().trim();
        if (propertyType) params.property_type = propertyType;
        if (bedroom) params.bhk = bedroom;
        if (furnishing) params.furnishing = furnishing;
        if (maxPrice) params.max_price = maxPrice;

        if (sortBy === "price-asc") { params.sort_by = "price"; params.order = "asc"; }
        else if (sortBy === "price-desc") { params.sort_by = "price"; params.order = "desc"; }
        else if (sortBy === "area-desc") { params.sort_by = "carpet_area"; params.order = "desc"; }

        const response = await getListings(params);
        const items = extractItems(response).map(item => ({ ...item, __type: 'listing' }));
        setListings(items);
        setTotal(response?.total || 0);
      } catch (err) {
        setError(err.message || "Failed to load listings from server.");
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, [offset, search, propertyType, bedroom, furnishing, maxPrice, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setPropertyType("");
    setBedroom("");
    setFurnishing("");
    setMaxPrice("");
    setSortBy("default");
    setOffset(0);
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#1E2022]">Find your next home</h1>
        
        <section className="mb-8 rounded-2xl bg-[#FDF1EA] p-5 shadow-sm border border-[#1E2022]/10">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-4">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Search Locality</label>
              <input type="text" value={search} onChange={(e) => {setSearch(e.target.value); setOffset(0);}} placeholder="e.g. koramangala..." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D97051]" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Property type</label>
              <select value={propertyType} onChange={(e) => {setPropertyType(e.target.value); setOffset(0);}} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051] capitalize">
                <option value="">All types</option>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="independent house">Independent House</option>
                <option value="plot">Plot</option>
                <option value="builder floor">Builder Floor</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Bedrooms</label>
              <select value={bedroom} onChange={(e) => {setBedroom(e.target.value); setOffset(0);}} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4 BHK</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Furnishing</label>
              <select value={furnishing} onChange={(e) => {setFurnishing(e.target.value); setOffset(0);}} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any</option>
                <option value="fully-furnished">Fully Furnished</option>
                <option value="semi-furnished">Semi Furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Max Price</label>
              <select value={maxPrice} onChange={(e) => {setMaxPrice(e.target.value); setOffset(0);}} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any price</option>
                <option value="5000000">₹50 L</option>
                <option value="10000000">₹1 Cr</option>
                <option value="20000000">₹2 Cr</option>
                <option value="50000000">₹5 Cr</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#1E2022]/10 pt-4">
            <select value={sortBy} onChange={e => {setSortBy(e.target.value); setOffset(0);}} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#D97051]">
              <option value="default">Sort: Relevance</option>
              <option value="price-asc">Sort: Price (Low to High)</option>
              <option value="price-desc">Sort: Price (High to Low)</option>
              <option value="area-desc">Sort: Area (Largest First)</option>
            </select>
            <button onClick={clearFilters} className="rounded-xl bg-white border border-gray-300 px-4 py-2 text-sm font-bold text-[#1E2022] hover:border-[#D97051] hover:text-[#D97051] transition">
              Clear Filters
            </button>
          </div>
        </section>

        {loading ? (
          <div className="p-10 font-bold text-center animate-pulse text-gray-500 bg-gray-50 rounded-2xl">Loading properties...</div>
        ) : error ? (
          <div className="p-10 font-bold text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">{error}</div>
        ) : listings.length > 0 ? (
          <>
            <ListingCards listings={listings} />
            <Pagination offset={offset} limit={ITEMS_PER_PAGE} total={total} onChange={setOffset} />
          </>
        ) : (
          <div className="p-10 font-bold text-center text-gray-500 bg-gray-50 rounded-2xl">No properties matched your filters.</div>
        )}
      </main>
    </div>
  );
}