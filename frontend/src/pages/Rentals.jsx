import { useEffect, useState, useMemo } from "react";
import ListingCards from "../components/ListingCards";
import { getAllRentals, addFavourite, removeFavourite, getFavourites } from "../api/ivyApi";
import { formatPrice } from "../utils/helpers";
import { X, Bed, Maximize2, Heart, User, Compass, Building, Car, Layers } from "lucide-react";
import { Link } from "react-router-dom";

export default function Rentals() {
  const [allRentals, setAllRentals] = useState(() => window.__IVY_DB_CACHE__ || []);
  const [loading, setLoading] = useState(!window.__IVY_DB_CACHE__);
  const [error, setError] = useState("");

  // Sidebar & Favorite States
  const [selectedListing, setSelectedListing] = useState(null);
  const [favourites, setFavourites] = useState([]);

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
        const [data, favs] = await Promise.all([
          getAllRentals(),
          getFavourites()
        ]);
        setAllRentals(data || []);
        setFavourites(favs || []);
      } catch (err) {
        setError(err.message || "Failed to load rentals database.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const isCurrentFavourite = useMemo(() => {
    if (!selectedListing) return false;
    const id = selectedListing.listing_id || selectedListing.id;
    return favourites.some(f => String(f.listing_id || f.id || f.project_id) === String(id));
  }, [favourites, selectedListing]);

  async function handleToggleFavourite() {
    if (!selectedListing) return;
    const id = selectedListing.listing_id || selectedListing.id;
    try {
      if (isCurrentFavourite) {
        await removeFavourite(id);
        setFavourites(prev => prev.filter(f => String(f.listing_id || f.id || f.project_id) !== String(id)));
      } else {
        await addFavourite(id);
        setFavourites(prev => [...prev, selectedListing]);
      }
    } catch (err) {
      console.error("Failed to update favourite", err);
    }
  }

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
    <div className="min-h-screen bg-white pb-20 font-sans relative overflow-hidden">
      
      {/* Left Sliding Sidebar Drawer for Rental Details */}
      <div className={`fixed inset-y-0 left-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col ${selectedListing ? 'translate-x-0' : '-translate-x-full'}`}>
        {selectedListing && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#FDF1EA]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-[#D97051] text-white rounded-lg">
                    Rental Property
                  </span>
                  <button 
                    onClick={handleToggleFavourite} 
                    className="p-1.5 rounded-full bg-white hover:bg-gray-100 transition shadow-sm"
                  >
                    <Heart size={18} className={isCurrentFavourite ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-500"} />
                  </button>
                </div>
                <h2 className="text-xl font-black text-[#1E2022] mt-2">{selectedListing.apartment_name || selectedListing.title || 'Rental Detail'}</h2>
              </div>
              <button 
                onClick={() => setSelectedListing(null)}
                className="p-2 rounded-xl bg-white text-gray-500 hover:text-[#D97051] hover:bg-gray-100 transition shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {selectedListing.image_url && (
                <img src={selectedListing.image_url} alt="Rental" className="w-full h-40 rounded-2xl object-cover border border-gray-100" />
              )}

              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Monthly Rent</p>
                  <p className="text-xl font-black text-[#059669]">₹{(selectedListing.price || 0).toLocaleString("en-IN")} / mo</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Locality</p>
                  <p className="text-xs font-bold text-[#1E2022] capitalize">📍 {selectedListing.locality || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Bed size={16} className="text-[#D97051]" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Bedrooms</p>
                    <p className="font-bold text-[#1E2022]">{selectedListing.bedroom || '--'} BHK</p>
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Maximize2 size={16} className="text-[#D97051]" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Carpet Area</p>
                    <p className="font-bold text-[#1E2022]">{selectedListing.carpet_area || '--'} sq.ft</p>
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Layers size={16} className="text-[#D97051]" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Floor Level</p>
                    <p className="font-bold text-[#1E2022]">{selectedListing.floor !== undefined ? `${selectedListing.floor}th of ${selectedListing.total_floors || '?'}` : 'N/A'}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Compass size={16} className="text-[#D97051]" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Facing</p>
                    <p className="font-bold text-[#1E2022] capitalize">{selectedListing.facing_direction || 'N/A'}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Building size={16} className="text-[#D97051]" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Furnishing</p>
                    <p className="font-bold text-[#1E2022] capitalize">{selectedListing.furnishing ? selectedListing.furnishing.replace('-', ' ') : 'N/A'}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Car size={16} className="text-[#D97051]" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Parking</p>
                    <p className="font-bold text-[#1E2022]">{selectedListing.covered_parking !== undefined ? `${selectedListing.covered_parking} Slots` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#FDF1EA]/50 rounded-2xl border border-[#D97051]/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-[#D97051] text-white flex items-center justify-center font-bold text-sm">
                    {selectedListing.posted_by_name ? selectedListing.posted_by_name.charAt(0) : <User size={16} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Landlord / Contact</p>
                    <p className="text-xs font-bold text-[#1E2022]">{selectedListing.posted_by_name || "Direct Owner"}</p>
                    {selectedListing.posted_by_contact && (
                      <p className="text-[11px] font-semibold text-[#059669]">📞 {selectedListing.posted_by_contact}</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedListing.description && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 line-clamp-3">{selectedListing.description}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white">
              <Link 
                to={`/rentals/${selectedListing.listing_id || selectedListing.id}`}
                className="w-full py-3 rounded-xl bg-[#D97051] text-white text-center text-xs font-bold shadow-md hover:bg-[#c26245] transition flex items-center justify-center gap-2"
              >
                View Full Page Details &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

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
            <ListingCards listings={filteredRentals} onCardClick={(item) => setSelectedListing(item)} />
          </>
        ) : (
          <div className="p-10 font-bold text-center text-gray-500 bg-gray-50 rounded-2xl">No rentals matched your filters.</div>
        )}
      </main>
    </div>
  );
}