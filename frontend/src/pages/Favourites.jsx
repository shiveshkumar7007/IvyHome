import { useEffect, useState, useMemo } from "react";
import { getFavourites, removeFavourite } from "../api/ivyApi";
import { ListingCard } from "../components/ListingCards";
import { Scale, X } from "lucide-react";
import { formatPrice } from "../utils/helpers";
import { useToast } from "../context/ToastContext";

export default function Favourites() {
  const [favourites, setFavourites] = useState([]);
  const [compareList, setCompareList] = useState([]);
  const { showToast } = useToast();

  // Filter States
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState("");

  useEffect(() => {
    getFavourites().then(setFavourites);
  }, []);

  const toggleCompare = (listing) => {
    setCompareList(prev => {
      const exists = prev.find(p => (p.listing_id || p.id) === (listing.listing_id || listing.id));
      if (exists) return prev.filter(p => (p.listing_id || p.id) !== (listing.listing_id || listing.id));
      if (prev.length >= 3) {
        showToast("You can only compare up to 3 properties", "error");
        return prev; 
      }
      return [...prev, listing];
    });
  };

  const handleRemoveFav = async (id, e) => {
    if (e) e.preventDefault();
    try {
      await removeFavourite(id);
      setFavourites(f => f.filter(x => (x.listing_id || x.project_id || x.id) !== id));
      setCompareList(c => c.filter(x => (x.listing_id || x.project_id || x.id) !== id));
      showToast("Removed from Favourites", "success");
    } catch (err) {
      showToast("Failed to remove favourite", "error");
    }
  };

  const filteredFavourites = useMemo(() => {
    return favourites.filter((listing) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || String(listing.apartment_name || listing.name || "").toLowerCase().includes(query) || String(listing.locality || "").toLowerCase().includes(query);
      const matchesPropertyType = !propertyType || String(listing.property_type || listing.project_status || "").toLowerCase() === propertyType.toLowerCase();
      return matchesSearch && matchesPropertyType;
    });
  }, [favourites, search, propertyType]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-[#1E2022]">Your Favourites</h1>
        
        {favourites.length === 0 ? (
          <div className="p-10 bg-[#FDF1EA] rounded-xl text-center font-bold text-[#1E2022]/60">
            No saved properties yet. Start exploring and hit the heart icon!
          </div>
        ) : (
          <div className="mb-20">
            <div className="mb-4 text-sm font-semibold text-[#1E2022]/60">Filter and Compare:</div>
            
            <div className="mb-6 flex gap-4">
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by name or locality..." className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 outline-none focus:border-[#D97051]" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFavourites.map(listing => {
                const id = listing.listing_id || listing.project_id || listing.id;
                const isSelected = compareList.some(p => (p.listing_id || p.project_id || p.id) === id);
                
                return (
                  <div key={id} className="relative h-full">
                    <div className="absolute top-4 left-4 z-20 flex items-center justify-center bg-white rounded-lg shadow-md p-1.5 border border-gray-100">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleCompare(listing)}
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
              {filteredFavourites.length === 0 && <div className="col-span-3 text-center text-gray-500 font-bold p-10">No favourites match your search.</div>}
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

        {/* Compare Modal */}
        <dialog id="compare-modal" className="w-full max-w-5xl rounded-2xl p-6 backdrop:bg-black/50 shadow-2xl">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-bold">Property Comparison</h2>
            <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition" onClick={() => document.getElementById('compare-modal').close()}>
              <X size={20}/>
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-6 text-sm">
            <div className="font-bold text-gray-500 space-y-6 pt-32 text-right pr-4 border-r border-gray-100">
              <p>Price</p><p>Area</p><p>Bedrooms</p><p>Furnishing</p><p>Property Type</p>
            </div>
            
            {compareList.map(p => {
              const isRental = p.__type === 'rental' || String(p.listing_id || p.id).startsWith("R");
              const isProject = p.__type === 'project' || String(p.project_id || p.id).startsWith("P") || p.project_status;
              
              return (
                <div key={p.listing_id || p.id} className="space-y-6">
                  <img src={p.image_url || p.image || "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"} className="h-28 w-full object-cover rounded-xl mb-4 shadow-sm" />
                  <p className="font-bold text-lg line-clamp-2 leading-tight h-12">{p.apartment_name || p.name || p.title}</p>
                  
                  <p className="font-bold text-lg text-[#D97051]">
                    {isRental ? `₹${(p.price || 0).toLocaleString("en-IN")} / mo` : formatPrice(p.price || p.price_min)}
                  </p>
                  <p className="font-medium">{p.carpet_area || p.min_area_sqft || "N/A"} sq.ft</p>
                  <p className="font-medium">{p.bedroom || p.bhk || "N/A"} Beds</p>
                  <p className="capitalize font-medium">{p.furnishing?.replace("-", " ") || "N/A"}</p>
                  <p className="capitalize font-medium">{isRental ? `Rental ${p.property_type || ""}` : (isProject ? "Project" : p.property_type || "Property")}</p>
                </div>
              )
            })}
          </div>
        </dialog>
      </div>
    </div>
  );
}