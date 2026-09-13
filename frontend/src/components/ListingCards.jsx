import { useEffect, useState } from "react";
import { BedDouble, Bath, Ruler, MapPin, BadgeCheck, Heart, AlertTriangle } from "lucide-react";
import { getFavourites, addFavourite, removeFavourite } from "../api/ivyApi";
import { useToast } from "../context/ToastContext";
import { formatPrice } from "../utils/helpers";

function getImage(listing) {
  return (
    listing.image ||
    listing.image_url ||
    listing.thumbnail ||
    listing.photo ||
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"
  );
}

// Helper to check for true data anomalies and scams (Excluded MAG- since it's auto-converted)
function checkAnomalies(listing) {
  const anomalies = [];
  const desc = String(listing.description || "").toLowerCase();
  const price = Number(listing.price);

  if (desc.includes("token amount") || desc.includes("booking amount") || desc.includes("site visit only after")) {
    anomalies.push("Advance Fee Scam Risk");
  }
  if (isNaN(price) || price <= 0) {
    anomalies.push("Zero / Negative Pricing");
  }
  if (Number(listing.carpet_area) > 0 && Number(listing.super_built_up_area) > 0 && Number(listing.carpet_area) > Number(listing.super_built_up_area)) {
    anomalies.push("Carpet Area Exceeds Super Built-up");
  }
  if (Number(listing.total_floors) > 0 && Number(listing.floor) > Number(listing.total_floors)) {
    anomalies.push("Floor Exceeds Total Floors");
  }

  return anomalies;
}

// Single Card Component
export function ListingCard({ listing, isFav, onToggleFav, onCardClick }) {
  const id = listing.listing_id || listing.project_id || listing.id;
  
  const isRental = listing.__type === 'rental' || String(id).startsWith("R");
  const isProject = listing.__type === 'project' || String(id).startsWith("P") || listing.project_status;
  
  // Smart Price Formatting
  let priceDisplay;
  if (isRental) priceDisplay = `₹${(listing.price || listing.monthly_rent || 0).toLocaleString("en-IN")} / mo`;
  else if (isProject) priceDisplay = listing.price_min ? `Starts ${formatPrice(listing.price_min)}` : formatPrice(listing.price);
  else priceDisplay = formatPrice(listing.price);

  // Smart Tagging
  let tag = listing.property_type || "Property";
  if (isRental) tag = `Rental ${tag}`;
  if (isProject) tag = listing.project_status || "Project";

  // Check anomalies
  const anomalies = checkAnomalies(listing);
  const hasAnomalies = anomalies.length > 0;

  return (
    <div 
      onClick={() => onCardClick && onCardClick(listing)}
      className={`group overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-1 hover:shadow-lg block h-full flex flex-col cursor-pointer ${
        hasAnomalies 
          ? 'bg-red-50/70 border-red-300 shadow-sm' 
          : 'bg-white border-[#1E2022]/10'
      }`}
    >
      <div className="relative h-56 overflow-hidden bg-[#FDF1EA] shrink-0">
        <img
          src={getImage(listing)}
          alt={listing.apartment_name || "Property"}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80"; }}
        />
        <div className="absolute left-3 top-3 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#1E2022] capitalize shadow-sm">
          {tag}
        </div>
        <div className="absolute right-3 top-3 flex gap-2">
          {(listing.is_verified === true || listing.is_verified === 1 || listing.is_verified === "true") && (
            <div className="flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#1E2022] shadow-sm">
              <BadgeCheck size={14} className="text-[#D97051]" /> Verified
            </div>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleFav(id, e); }}
            className="flex items-center justify-center rounded-lg bg-white p-2 shadow-sm transition hover:scale-110"
          >
            <Heart size={18} className={isFav ? "fill-red-500 text-red-500" : "text-gray-300 hover:text-red-400"} />
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col grow justify-between">
        <div>
          <h2 className="line-clamp-1 text-lg font-bold text-[#1E2022]">
            {listing.apartment_name || listing.name || listing.title || "Property"}
          </h2>
          <div className="mt-1 flex items-center gap-1 text-sm text-[#1E2022]/55">
            <MapPin size={14} />
            <span className="line-clamp-1">{listing.locality || listing.address || "Location unavailable"}</span>
          </div>
          
          <div className={`mb-3 mt-3 text-xl font-bold ${hasAnomalies ? 'text-[#990000]' : 'text-[#D97051]'}`}>
            {priceDisplay}
          </div>

          {hasAnomalies && (
            <div className="mb-3 flex flex-wrap gap-1">
              {anomalies.map((anomaly, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-red-200">
                  <AlertTriangle size={11} /> {anomaly}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 border-t border-[#1E2022]/10 pt-4 text-sm text-[#1E2022]/70">
          {(listing.bedroom !== undefined || listing.bhk !== undefined) && (
            <div className="flex items-center gap-1.5">
              <BedDouble size={16} /> <span>{listing.bedroom ?? listing.bhk} Beds</span>
            </div>
          )}
          {listing.bathroom !== undefined && (
            <div className="flex items-center gap-1.5">
              <Bath size={16} /> <span>{listing.bathroom} Baths</span>
            </div>
          )}
          {(listing.carpet_area || listing.super_built_up_area || listing.min_area_sqft) && (
            <div className="flex items-center gap-1.5">
              <Ruler size={16} /> <span>{listing.carpet_area || listing.super_built_up_area || listing.min_area_sqft} sq.ft</span>
            </div>
          )}
          {listing.furnishing && (
            <div className="flex items-center gap-1.5 capitalize border-l border-[#1E2022]/20 pl-4">
              <span>{listing.furnishing.replace("-", " ")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Default Grid Component with onCardClick Support
export default function ListingCards({ listings = [], onRemoveFav, onCardClick }) {
  const [favIds, setFavIds] = useState(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    getFavourites().then(favs => {
      setFavIds(new Set(favs.map(f => f.listing_id || f.project_id || f.id)));
    });
  }, [listings]);

  async function handleToggleFavourite(id, e) {
    if (e) e.preventDefault(); 
    try {
      if (favIds.has(id)) {
        await removeFavourite(id);
        setFavIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        showToast("Removed from Favourites", "success");
        if (onRemoveFav) onRemoveFav(id); 
      } else {
        await addFavourite(id);
        setFavIds(prev => { const n = new Set(prev); n.add(id); return n; });
        showToast("Added to Favourites", "success");
      }
    } catch (err) {
      showToast("Failed to update favourites", "error");
    }
  }

  if (!listings || listings.length === 0) {
    return <div className="col-span-full p-10 text-center font-bold text-gray-500 bg-gray-50 rounded-2xl">No properties found.</div>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => {
        const id = listing.listing_id || listing.project_id || listing.id;
        return (
          <ListingCard 
            key={id} 
            listing={listing} 
            isFav={favIds.has(id)} 
            onToggleFav={handleToggleFavourite} 
            onCardClick={onCardClick}
          />
        );
      })}
    </div>
  );
}