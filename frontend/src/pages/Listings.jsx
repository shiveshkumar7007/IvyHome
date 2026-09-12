import { useEffect, useMemo, useState } from "react";
import ListingCards from "../components/ListingCards";
import Pagination from "../components/Pagination";
import { fixPropertyData } from "../utils/helpers";

const ITEMS_PER_PAGE = 12;

export default function Listings() {
  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedroom, setBedroom] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState("default");
  const [localOffset, setLocalOffset] = useState(0);

  useEffect(() => {
    async function loadListings() {
      try {
        const response = await fetch("/listings.json");
        const data = await response.json();
        let allData = data.results || data || [];
        setAllListings(allData.map(fixPropertyData));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, []);

  const propertyTypes = useMemo(() => {
    return [...new Set(allListings.map((item) => item.property_type).filter(Boolean))].sort();
  }, [allListings]);

  const filteredAndSortedListings = useMemo(() => {
    let result = allListings.filter((listing) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || String(listing.apartment_name || "").toLowerCase().includes(query) || String(listing.locality || "").toLowerCase().includes(query);
      const matchesPropertyType = !propertyType || String(listing.property_type || "").toLowerCase() === propertyType.toLowerCase();
      const matchesBedroom = !bedroom || Number(listing.bedroom) === Number(bedroom);
      const matchesFurnishing = !furnishing || String(listing.furnishing || "").toLowerCase() === furnishing.toLowerCase();
      const matchesPrice = !maxPrice || Number(listing.price || 0) <= Number(maxPrice);
      const matchesActive = !activeOnly || listing.is_live === true || listing.is_live === 1 || listing.is_live === "true";

      return matchesSearch && matchesPropertyType && matchesBedroom && matchesFurnishing && matchesPrice && matchesActive;
    });

    if (sortBy === "price-asc") result.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortBy === "price-desc") result.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (sortBy === "area-desc") result.sort((a, b) => (b.carpet_area || 0) - (a.carpet_area || 0));

    return result;
  }, [allListings, search, propertyType, bedroom, furnishing, maxPrice, activeOnly, sortBy]);

  const currentListings = filteredAndSortedListings.slice(localOffset, localOffset + ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearch("");
    setPropertyType("");
    setBedroom("");
    setFurnishing("");
    setMaxPrice("");
    setActiveOnly(false);
    setSortBy("default");
    setLocalOffset(0);
  };

  if (loading) return <div className="min-h-screen p-10 font-bold text-center">Loading properties...</div>;

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#1E2022]">Find your next home</h1>
        
        {/* Full Filter Block */}
        <section className="mb-8 rounded-2xl bg-[#FDF1EA] p-5 shadow-sm border border-[#1E2022]/10">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-4">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Search</label>
              <input type="text" value={search} onChange={(e) => {setSearch(e.target.value); setLocalOffset(0);}} placeholder="Locality or property..." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D97051]" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Property type</label>
              <select value={propertyType} onChange={(e) => {setPropertyType(e.target.value); setLocalOffset(0);}} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051] capitalize">
                <option value="">All types</option>
                {propertyTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Bedrooms</label>
              <select value={bedroom} onChange={(e) => {setBedroom(e.target.value); setLocalOffset(0);}} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4 BHK</option>
                <option value="5">5+ BHK</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Furnishing</label>
              <select value={furnishing} onChange={(e) => {setFurnishing(e.target.value); setLocalOffset(0);}} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any</option>
                <option value="fully-furnished">Fully Furnished</option>
                <option value="semi-furnished">Semi Furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#1E2022]">Max Price</label>
              <select value={maxPrice} onChange={(e) => {setMaxPrice(e.target.value); setLocalOffset(0);}} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]">
                <option value="">Any price</option>
                <option value="5000000">₹50 L</option>
                <option value="10000000">₹1 Cr</option>
                <option value="20000000">₹2 Cr</option>
                <option value="50000000">₹5 Cr</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#1E2022]/10 pt-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-bold text-[#1E2022] cursor-pointer">
                <input type="checkbox" checked={activeOnly} onChange={(e) => {setActiveOnly(e.target.checked); setLocalOffset(0);}} className="h-4 w-4 accent-[#D97051]" />
                Show Active Only
              </label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#D97051]">
                <option value="default">Sort: Relevance</option>
                <option value="price-asc">Sort: Price (Low to High)</option>
                <option value="price-desc">Sort: Price (High to Low)</option>
                <option value="area-desc">Sort: Area (Largest First)</option>
              </select>
            </div>
            <button onClick={clearFilters} className="rounded-xl bg-white border border-gray-300 px-4 py-2 text-sm font-bold text-[#1E2022] hover:border-[#D97051] hover:text-[#D97051] transition">
              Clear Filters
            </button>
          </div>
        </section>

        {currentListings.length > 0 ? (
          <>
            <ListingCards listings={currentListings} />
            <Pagination offset={localOffset} limit={ITEMS_PER_PAGE} total={filteredAndSortedListings.length} onChange={setLocalOffset} />
          </>
        ) : (
          <div className="p-10 font-bold text-center text-gray-500 bg-gray-50 rounded-2xl">No properties matched your filters.</div>
        )}
      </main>
    </div>
  );
}