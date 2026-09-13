import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getListing, getRental, getProject, addFavourite, removeFavourite, getFavourites } from "../api/ivyApi";
import { useToast } from "../context/ToastContext";
import { Heart, Phone, ExternalLink, Building, Compass, Car, Layers, Calendar, User } from "lucide-react";
import { formatPrice } from "../utils/helpers";

function ListingDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { showToast } = useToast();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [isFavourite, setIsFavourite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const isRental = location.pathname.includes("/rentals") || String(id).startsWith("R");
  const isProject = location.pathname.includes("/projects") || String(id).startsWith("P");

  async function handleFavouriteToggle() {
    try {
      setFavLoading(true);
      if (isFavourite) {
        await removeFavourite(id);
        setIsFavourite(false);
        showToast("Removed from Favourites", "success");
      } else {
        await addFavourite(id);
        setIsFavourite(true);
        showToast("Added to Favourites", "success");
      }
    } catch (err) {
      showToast("Failed to update Favourites", "error");
    } finally {
      setFavLoading(false);
    }
  }

  useEffect(() => {
    async function loadListing() {
      try {
        setLoading(true);
        setError("");

        let response;
        if (isRental) response = await getRental(id);
        else if (isProject) response = await getProject(id);
        else response = await getListing(id);
        
        setListing(response?.data || response);

        const favs = await getFavourites();
        setIsFavourite(favs.some((f) => (f.listing_id || f.project_id || f.id) === id));

      } catch (err) {
        setError(err.message || "Unable to load detail view");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadListing();
  }, [id, isRental, isProject]);

  if (loading) return <div className="min-h-screen p-10 font-bold text-center text-gray-500">Loading property details...</div>;
  if (error || !listing) return <div className="min-h-screen p-10 font-bold text-center text-red-500">{error || "Property not found"}</div>;

  return (
    <div className="ivy-page font-sans bg-[#F8F9FA] pb-20">
      <div className="ivy-container mx-auto max-w-5xl px-4 py-8">
        
        <div className="rounded-3xl bg-white p-6 md:p-8 shadow-sm border border-gray-200">
          {listing.image_url && (
            <img src={listing.image_url} alt="Property" className="mb-6 max-h-[450px] w-full rounded-2xl object-cover shadow-sm" />
          )}

          {/* Title & Price Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-6 mb-6">
            <div>
              <span className="text-xs font-bold uppercase px-3 py-1 bg-[#FDF1EA] text-[#D97051] rounded-lg">
                {listing.property_type || (isRental ? 'Rental' : 'Apartment')}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-[#1E2022] mt-2">
                {listing.apartment_name || listing.title || listing.name || listing.project_name || "Property Detail"}
              </h1>
              <p className="mt-1 text-sm text-gray-500 capitalize">📍 {listing.locality || listing.location || listing.address || "Location unavailable"}</p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                {isRental ? 'Monthly Rent' : 'Listing Price'}
              </p>
              <p className="text-3xl font-black text-[#059669]">
                {isRental ? `₹${(listing.price || listing.monthly_rent || 0).toLocaleString("en-IN")} / mo` : formatPrice(listing.price_min || listing.price)}
              </p>
            </div>
          </div>

          {/* Key Metric Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {(listing.bedroom !== undefined || listing.bhk !== undefined) && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bedrooms</p>
                <p className="font-extrabold text-lg text-[#1E2022] mt-1">{listing.bedroom ?? listing.bhk} BHK</p>
              </div>
            )}
            {listing.bathroom && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bathrooms</p>
                <p className="font-extrabold text-lg text-[#1E2022] mt-1">{listing.bathroom}</p>
              </div>
            )}
            {(listing.carpet_area || listing.min_area_sqft) && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{listing.min_area_sqft ? 'Min Area' : 'Carpet Area'}</p>
                <p className="font-extrabold text-lg text-[#1E2022] mt-1">{listing.carpet_area || listing.min_area_sqft} sq ft</p>
              </div>
            )}
            {listing.covered_parking !== undefined && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Covered Parking</p>
                <p className="font-extrabold text-lg text-[#1E2022] mt-1">{listing.covered_parking} Slots</p>
              </div>
            )}
          </div>

          {/* Extended Asset Specifications Grid (Floor, Facing, Furnishing, Dates) */}
          <div className="mb-8 p-6 bg-[#F8F9FA] rounded-2xl border border-gray-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Detailed Specifications</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600 flex items-center gap-2"><Layers size={16} className="text-gray-400" /> Floor Level</span>
                <span className="font-bold text-[#1E2022]">{listing.floor !== undefined ? `${listing.floor}th of ${listing.total_floors || '?'}` : "N/A"}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600 flex items-center gap-2"><Compass size={16} className="text-gray-400" /> Facing Direction</span>
                <span className="font-bold text-[#1E2022] capitalize">{listing.facing_direction || "N/A"}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600 flex items-center gap-2"><Building size={16} className="text-gray-400" /> Furnishing Status</span>
                <span className="font-bold text-[#1E2022] capitalize">{listing.furnishing ? listing.furnishing.replace("-", " ") : "N/A"}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600 flex items-center gap-2"><Calendar size={16} className="text-gray-400" /> Listing Date</span>
                <span className="font-bold text-[#1E2022]">{listing.posted_at ? new Date(listing.posted_at).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {listing.description && (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
              <p className="leading-7 text-[#1E2022] bg-gray-50 p-5 rounded-2xl border border-gray-100 text-sm whitespace-pre-line">{listing.description}</p>
            </div>
          )}

          {/* Owner / Contact and External Source Section */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-2xl border border-gray-200 items-center">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#FDF1EA] text-[#D97051] flex items-center justify-center font-black">
                {listing.posted_by_name ? listing.posted_by_name.charAt(0) : <User size={20} />}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Posted By</p>
                <p className="font-bold text-[#1E2022]">{listing.posted_by_name || "Direct Owner"} ({listing.posted_by || "owner"})</p>
                {listing.posted_by_contact && (
                  <p className="text-xs font-semibold text-[#059669] mt-0.5">📞 {listing.posted_by_contact}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              {listing.listing_url && (
                <a 
                  href={listing.listing_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-[#ffffff] text-white rounded-xl text-xs font-bold hover:bg-[#D97051] transition"
                >
                  <ExternalLink size={14} /> Original Source
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={handleFavouriteToggle} disabled={favLoading} className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 px-6 py-4 text-sm font-bold transition disabled:opacity-50 ${isFavourite ? "border-[#D97051] text-[#D97051] bg-white hover:bg-red-50" : "border-gray-200 text-gray-600 bg-white hover:border-[#D97051] hover:text-[#D97051]"}`}>
              <Heart size={20} className={isFavourite ? "fill-[#D97051] text-[#D97051]" : ""} />
              {favLoading ? "Updating..." : (isFavourite ? "Saved to Favourites" : "Save to Favourites")}
            </button>
            <button onClick={() => setShowContact(true)} className="flex-1 rounded-2xl bg-[#D97051] px-6 py-4 text-sm font-bold text-white shadow-md transition hover:bg-[#c26245]">
              Contact Agent / Owner
            </button>
          </div>
        </div>
      </div>

      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-bold mb-1 text-[#1E2022]">Request Details</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              An agent or owner will contact you regarding <span className="font-bold text-[#1E2022]">{listing.apartment_name || "this property"}</span>.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setShowContact(false); showToast("Request sent successfully!", "success"); }} className="space-y-4">
              <input required type="text" placeholder="Full Name" className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-[#D97051]" />
              <input required type="tel" placeholder="Phone Number" className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-[#D97051]" />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowContact(false)} className="flex-1 p-3 font-bold text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition">Cancel</button>
                <button type="submit" className="flex-1 p-3 font-bold text-white bg-[#D97051] rounded-xl shadow-md transition hover:bg-[#c26245]">Request Callback</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListingDetail;