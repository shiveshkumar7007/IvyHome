import { useEffect, useState, useMemo } from "react";
import { getFavourites, removeFavourite, addFavourite } from "../api/ivyApi";
import { ListingCard } from "../components/ListingCards";
import { Scale, X, Heart, User, Compass, Building, Maximize2, Layers } from "lucide-react";
import { formatPrice } from "../utils/helpers";
import { useToast } from "../context/ToastContext";
import { Link } from "react-router-dom";

export default function Favourites() {
  const [favourites, setFavourites] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const { showToast } = useToast();

  // Filter States (Including Category: Listing, Rental, Project)
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedroom, setBedroom] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [facing, setFacing] = useState("");

  useEffect(() => {
    getFavourites().then(setFavourites);
  }, []);

  const isCurrentFavourite = useMemo(() => {
    if (!selectedListing) return false;
    const id = selectedListing.listing_id || selectedListing.project_id || selectedListing.id;
    return favourites.some(f => String(f.listing_id || f.id || f.project_id) === String(id));
  }, [favourites, selectedListing]);

  async function handleToggleFavourite() {
    if (!selectedListing) return;
    const id = selectedListing.listing_id || selectedListing.project_id || selectedListing.id;
    try {
      if (isCurrentFavourite) {
        await removeFavourite(id);
        setFavourites(prev => prev.filter(f => String(f.listing_id || f.id || f.project_id) !== String(id)));
        setCompareList(c => c.filter(x => (x.listing_id || x.project_id || x.id) !== id));
        showToast("Removed from Favourites", "success");
      } else {
        await addFavourite(id);
        setFavourites(prev => [...prev, selectedListing]);
        showToast("Added to Favourites", "success");
      }
    } catch (err) {
      console.error("Failed to update favourite", err);
      showToast("Failed to update favourite", "error");
    }
  }

  const toggleCompare = (listing, e) => {
    if (e) e.stopPropagation();
    setCompareList(prev => {
      const exists = prev.find(p => (p.listing_id || p.project_id || p.id) === (listing.listing_id || listing.project_id || listing.id));
      if (exists) return prev.filter(p => (p.listing_id || p.project_id || p.id) !== (listing.listing_id || listing.project_id || listing.id));
      if (prev.length >= 3) {
        showToast("You can only compare up to 3 properties", "error");
        return prev; 
      }
      return [...prev, listing];
    });
  };

  const handleRemoveFav = async (id, e) => {
    if (e) e.preventDefault();
    if (e) e.stopPropagation();
    try {
      await removeFavourite(id);
      setFavourites(f => f.filter(x => (x.listing_id || x.project_id || x.id) !== id));
      setCompareList(c => c.filter(x => (x.listing_id || x.project_id || x.id) !== id));
      if (selectedListing && (selectedListing.listing_id || selectedListing.project_id || selectedListing.id) === id) {
        setSelectedListing(null);
      }
      showToast("Removed from Favourites", "success");
    } catch (err) {
      showToast("Failed to remove favourite", "error");
    }
  };

  const filteredFavourites = useMemo(() => {
    return favourites.filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || String(item.apartment_name || item.project_name || item.name || "").toLowerCase().includes(query) || String(item.locality || "").toLowerCase().includes(query);
      
      const isRental = item.__type === 'rental' || String(item.listing_id || item.id || "").startsWith("R");
      const isProject = item.__type === 'project' || String(item.project_id || item.id || "").startsWith("P") || item.project_status;
      const isListing = !isRental && !isProject;

      let matchesCategory = true;
      if (category === "rental") matchesCategory = isRental;
      else if (category === "project") matchesCategory = isProject;
      else if (category === "listing") matchesCategory = isListing;

      const matchesPropertyType = !propertyType || String(item.property_type || item.project_status || "").toLowerCase() === propertyType.toLowerCase();
      const matchesBedroom = !bedroom || Number(item.bedroom) === Number(bedroom);
      const matchesFurnishing = !furnishing || String(item.furnishing || "").toLowerCase() === furnishing.toLowerCase();
      const matchesFacing = !facing || String(item.facing_direction || "").toLowerCase() === facing.toLowerCase();

      return matchesSearch && matchesCategory && matchesPropertyType && matchesBedroom && matchesFurnishing && matchesFacing;
    });
  }, [favourites, search, category, propertyType, bedroom, furnishing, facing]);

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setPropertyType("");
    setBedroom("");
    setFurnishing("");
    setFacing("");
  };

  return (
    <div className="min-h-screen bg-white pb-20 font-sans relative overflow-hidden">
      
      {/* Left Sliding Sidebar Drawer for Property Details */}
      <div className={`fixed inset-y-0 left-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col ${selectedListing ? 'translate-x-0' : '-translate-x-full'}`}>
        {selectedListing && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#FDF1EA]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-[#D97051] text-white rounded-lg">
                    {selectedListing.project_status || selectedListing.property_type || 'Property'}
                  </span>
                  <button 
                    onClick={handleToggleFavourite} 
                    className="p-1.5 rounded-full bg-white hover:bg-gray-100 transition shadow-sm"
                  >
                    <Heart size={18} className={isCurrentFavourite ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-500"} />
                  </button>
                </div>
                <h2 className="text-xl font-black text-[#1E2022] mt-2">{selectedListing.apartment_name || selectedListing.project_name || selectedListing.name || selectedListing.title || 'Property Detail'}</h2>
              </div>
              <button 
                onClick={() => setSelectedListing(null)}
                className="p-2 rounded-xl bg-white text-gray-500 hover:text-[#D97051] hover:bg-gray-100 transition shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {(selectedListing.image_url || selectedListing.image) && (
                <img src={selectedListing.image_url || selectedListing.image} alt="Property" className="w-full h-40 rounded-2xl object-cover border border-gray-100" />
              )}

              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Price</p>
                  <p className="text-xl font-black text-[#059669]">
                    {selectedListing.__type === 'rental' || String(selectedListing.listing_id || '').startsWith("R") 
                      ? `₹${(selectedListing.price || 0).toLocaleString("en-IN")} / mo` 
                      : formatPrice(selectedListing.price || selectedListing.price_min)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Locality</p>
                  <p className="text-xs font-bold text-[#1E2022] capitalize">📍 {selectedListing.locality || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Building size={16} className="text-[#D97051]" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Type / Builder</p>
                    <p className="font-bold text-[#1E2022]">{selectedListing.builder_name || selectedListing.property_type || 'N/A'}</p>
                  </div>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Maximize2 size={16} className="text-[#D97051]" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Area</p>
                    <p className="font-bold text-[#1E2022]">{selectedListing.carpet_area || selectedListing.min_area_sqft || '--'} sq.ft</p>
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
                  <Layers size={16} className="text-[#D97051]" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Bedrooms</p>
                    <p className="font-bold text-[#1E2022]">{selectedListing.bedroom || selectedListing.bhk || '--'} BHK</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#FDF1EA]/50 rounded-2xl border border-[#D97051]/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-[#D97051] text-white flex items-center justify-center font-bold text-sm">
                    {selectedListing.posted_by_name ? selectedListing.posted_by_name.charAt(0) : <User size={16} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Contact Info</p>
                    <p className="text-xs font-bold text-[#1E2022]">{selectedListing.posted_by_name || selectedListing.builder_name || "Sales Team"}</p>
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
                to={`/listings/${selectedListing.listing_id || selectedListing.id || selectedListing.project_id}`}
                className="w-full py-3 rounded-xl bg-[#D97051] text-white text-center text-xs font-bold shadow-md hover:bg-[#c26245] transition flex items-center justify-center gap-2"
              >
                View Full Page Details &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#1E2022]">Your Favourites</h1>
        
        {favourites.length === 0 ? (
          <div className="p-10 bg-[#FDF1EA] rounded-xl text-center font-bold text-[#1E2022]/60">
            No saved properties yet. Start exploring and hit the heart icon!
          </div>
        ) : (
          <div className="mb-20">
            <div className="mb-4 text-sm font-semibold text-[#1E2022]/60">Filter and Compare Favourites:</div>
            
            {/* Filter Section */}
            <div className="mb-6 rounded-2xl bg-[#FDF1EA] p-5 shadow-sm border border-[#1E2022]/10">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-4">
                <div className="lg:col-span-2">
                  <input 
                    type="text" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    placeholder="Filter by name or locality..." 
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D97051]" 
                  />
                </div>
                <div>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)} 
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]"
                  >
                    <option value="">All Categories</option>
                    <option value="listing">Listings</option>
                    <option value="rental">Rentals</option>
                    <option value="project">Projects</option>
                  </select>
                </div>
                <div>
                  <select 
                    value={propertyType} 
                    onChange={(e) => setPropertyType(e.target.value)} 
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051] capitalize"
                  >
                    <option value="">All Types</option>
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="independent house">Independent House</option>
                    <option value="plot">Plot</option>
                    <option value="builder floor">Builder Floor</option>
                  </select>
                </div>
                <div>
                  <select 
                    value={bedroom} 
                    onChange={(e) => setBedroom(e.target.value)} 
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]"
                  >
                    <option value="">Any BHK</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4+ BHK</option>
                  </select>
                </div>
                <div>
                  <select 
                    value={furnishing} 
                    onChange={(e) => setFurnishing(e.target.value)} 
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051]"
                  >
                    <option value="">Any Furnishing</option>
                    <option value="fully-furnished">Fully Furnished</option>
                    <option value="semi-furnished">Semi Furnished</option>
                    <option value="unfurnished">Unfurnished</option>
                  </select>
                </div>
                <div>
                  <select 
                    value={facing} 
                    onChange={(e) => setFacing(e.target.value)} 
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#D97051] capitalize"
                  >
                    <option value="">Any Facing</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                    <option value="north">North</option>
                    <option value="south">South</option>
                    <option value="north-east">North-East</option>
                    <option value="north-west">North-West</option>
                    <option value="south-east">South-East</option>
                    <option value="south-west">South-West</option>
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
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFavourites.map(listing => {
                const id = listing.listing_id || listing.project_id || listing.id;
                const isSelected = compareList.some(p => (p.listing_id || p.project_id || p.id) === id);
                
                return (
                  <div key={id} className="relative h-full cursor-pointer" onClick={() => setSelectedListing(listing)}>
                    <div className="absolute top-4 left-4 z-20 flex items-center justify-center bg-white rounded-lg shadow-md p-1.5 border border-gray-100" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={(e) => toggleCompare(listing, e)}
                        className="w-5 h-5 accent-[#D97051] cursor-pointer"
                      />
                    </div>
                    
                    <div className={`h-full transition ${isSelected ? "ring-4 ring-[#D97051] ring-offset-2 rounded-2xl scale-[0.98]" : ""}`}>
                      <ListingCard 
                        listing={listing} 
                        isFav={true} 
                        onToggleFav={handleRemoveFav} 
                      />
                    </div>
                  </div>
                );
              })}
              {filteredFavourites.length === 0 && <div className="col-span-3 text-center text-gray-500 font-bold p-10">No favourites match your filters.</div>}
            </div>
          </div>
        )}

        {/* Floating Compare Bar */}
        {compareList.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-4 flex justify-center z-40">
            <div className="max-w-4xl w-full flex justify-between items-center bg-[#FDF1EA] p-4 rounded-xl border border-[#D97051]/30">
              <div className="flex gap-4 items-center">
                <Scale className="text-[#D97051]" />
                <span className="font-bold text-[#1E2022]">{compareList.length}/3 Selected for Comparison</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCompareList([])} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black">Clear</button>
                <button onClick={() => document.getElementById('compare-modal').showModal()} className="px-6 py-2 bg-[#D97051] text-white font-bold rounded-lg hover:opacity-90 shadow-md">
                  Compare Properties
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare Modal - FIXED ALIGNMENT */}
        <dialog id="compare-modal" className="w-full max-w-5xl rounded-2xl p-6 backdrop:bg-black/50 shadow-2xl">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold text-[#1E2022]">Property Comparison</h2>
            <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition" onClick={() => document.getElementById('compare-modal').close()}>
              <X size={20}/>
            </button>
          </div>
          
          <div className="w-full text-sm">
            {/* Header Row: Images & Titles */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              <div className="col-span-1 pr-4 border-r border-gray-100"></div>
              {compareList.map(p => (
                <div key={`header-${p.listing_id || p.project_id || p.id}`} className="flex flex-col">
                  <img src={p.image_url || p.image || "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"} className="h-32 w-full object-cover rounded-xl mb-4 shadow-sm" alt="Property" />
                  <p className="font-bold text-lg text-[#1E2022] line-clamp-2 leading-tight h-14">{p.apartment_name || p.project_name || p.name || p.title}</p>
                </div>
              ))}
            </div>

            {/* Structured Data Rows */}
            {[
              { 
                label: "Price", 
                render: (p) => {
                  const isRental = p.__type === 'rental' || String(p.listing_id || p.id).startsWith("R");
                  return <span className="font-extrabold text-xl text-[#D97051]">{isRental ? `₹${(p.price || 0).toLocaleString("en-IN")} / mo` : formatPrice(p.price || p.price_min)}</span>;
                }
              },
              { label: "Area", render: (p) => `${p.carpet_area || p.min_area_sqft || "N/A"} sq.ft` },
              { label: "Bedrooms", render: (p) => `${p.bedroom || p.bhk || "N/A"} Beds` },
              { label: "Furnishing", render: (p) => <span className="capitalize">{p.furnishing?.replace("-", " ") || "N/A"}</span> },
              { 
                label: "Property Type", 
                render: (p) => {
                  const isRental = p.__type === 'rental' || String(p.listing_id || p.id).startsWith("R");
                  const isProject = p.__type === 'project' || String(p.project_id || p.id).startsWith("P") || p.project_status;
                  return <span className="capitalize">{isRental ? `Rental ${p.property_type || ""}` : (isProject ? "Project" : p.property_type || "Property")}</span>;
                }
              },
              { label: "Facing", render: (p) => <span className="capitalize">{p.facing_direction || "N/A"}</span> }
            ].map((row, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-6 py-4 border-t border-gray-100">
                <div className="font-bold text-gray-500 text-right pr-4 border-r border-gray-100 flex items-center justify-end">
                  {row.label}
                </div>
                {compareList.map(p => (
                  <div key={`data-${p.listing_id || p.project_id || p.id}-${idx}`} className="font-semibold text-[#1E2022] flex items-center">
                    {row.render(p)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </dialog>
      </div>
    </div>
  );
}