import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Bath, Ruler, MapPin, BadgeCheck, Heart } from "lucide-react";
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

// Single Card Component (Exported for custom layouts like Favourites)
export function ListingCard({ listing, isFav, onToggleFav }) {
  const id = listing.listing_id || listing.project_id || listing.id;
  
  // Smart URL & Type Detection (Uses __type tag if injected by page)
  const isRental = listing.__type === 'rental' || String(id).startsWith("R");
  const isProject = listing.__type === 'project' || String(id).startsWith("P") || listing.project_status;
  const linkPath = isProject ? `/projects/${id}` : isRental ? `/rentals/${id}` : `/listings/${id}`;
  
  // Smart Price Formatting
  let priceDisplay;
  if (isRental) priceDisplay = `₹${(listing.price || listing.monthly_rent || 0).toLocaleString("en-IN")} / mo`;
  else if (isProject) priceDisplay = listing.price_min ? `Starts ${formatPrice(listing.price_min)}` : formatPrice(listing.price);
  else priceDisplay = formatPrice(listing.price);

  // Smart Tagging
  let tag = listing.property_type || "Property";
  if (isRental) tag = `Rental ${tag}`;
  if (isProject) tag = listing.project_status || "Project";

  return (
    <Link to={linkPath} className="group overflow-hidden rounded-2xl border border-[#1E2022]/10 bg-white transition duration-200 hover:-translate-y-1 hover:shadow-lg block h-full flex flex-col">
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
            onClick={(e) => { e.preventDefault(); onToggleFav(id, e); }}
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
          <div className="mb-4 mt-3 text-xl font-bold text-[#D97051]">
            {priceDisplay}
          </div>
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
    </Link>
  );
}

// Default Grid Component
export default function ListingCards({ listings = [], onRemoveFav }) {
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
          />
        );
      })}
    </div>
  );
}