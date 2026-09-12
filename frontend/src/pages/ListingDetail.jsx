import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { getListing, getRental, getProject, addFavourite, removeFavourite, getFavourites } from "../api/ivyApi";
import { useToast } from "../context/ToastContext";
import { Heart } from "lucide-react";
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
        
        // Data is now completely cleaned automatically by api layer!
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

  if (loading) return <div className="min-h-screen p-10 font-bold text-center">Loading detail...</div>;
  if (error || !listing) return <div className="min-h-screen p-10 font-bold text-center text-red-500">{error || "Property not found"}</div>;

  return (
    <div className="ivy-page">
      <div className="ivy-container py-10">
        <div className="rounded-2xl bg-[#FDF1EA] p-6 shadow-sm border border-[#1E2022]/5">
          {listing.image_url && (
            <img src={listing.image_url} alt="Property" className="mb-6 max-h-[500px] w-full rounded-xl object-cover" />
          )}

          <h1 className="text-3xl font-bold text-[#1E2022]">
            {listing.apartment_name || listing.title || listing.name || listing.project_name || "Property Detail"}
          </h1>
          <p className="mt-3 text-[#1E2022]/60">{listing.locality || listing.location || listing.address || "Location unavailable"}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(listing.bedroom !== undefined || listing.bhk !== undefined) && (
              <div>
                <p className="text-sm font-semibold text-[#1E2022]/60 uppercase tracking-wider">Bedrooms</p>
                <p className="font-bold text-lg">{listing.bedroom ?? listing.bhk}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-[#1E2022]/60 uppercase tracking-wider">
                {isRental ? 'Monthly Rent' : (listing.price_min ? 'Starting Price' : 'Price')}
              </p>
              <p className="font-bold text-xl text-[#D97051]">
                {isRental ? `₹${(listing.price || listing.monthly_rent || 0).toLocaleString("en-IN")} / mo` : formatPrice(listing.price_min || listing.price)}
              </p>
            </div>
            {(listing.carpet_area || listing.min_area_sqft) && (
              <div>
                <p className="text-sm font-semibold text-[#1E2022]/60 uppercase tracking-wider">{listing.min_area_sqft ? 'Min Area' : 'Carpet Area'}</p>
                <p className="font-bold text-lg">{listing.carpet_area || listing.min_area_sqft} sq ft</p>
              </div>
            )}
            {(listing.super_builtup_area || listing.super_built_up_area || listing.max_area_sqft) && (
              <div>
                <p className="text-sm font-semibold text-[#1E2022]/60 uppercase tracking-wider">{listing.max_area_sqft ? 'Max Area' : 'Super Built-up Area'}</p>
                <p className="font-bold text-lg">{listing.super_builtup_area || listing.super_built_up_area || listing.max_area_sqft} sq ft</p>
              </div>
            )}
            {listing.furnishing && (
              <div>
                <p className="text-sm font-semibold text-[#1E2022]/60 uppercase tracking-wider">Furnishing</p>
                <p className="font-bold text-lg capitalize">{listing.furnishing.replace("-", " ")}</p>
              </div>
            )}
            {listing.bathroom && (
              <div>
                <p className="text-sm font-semibold text-[#1E2022]/60 uppercase tracking-wider">Bathroom</p>
                <p className="font-bold text-lg">{listing.bathroom}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-[#1E2022]/60 uppercase tracking-wider">Property ID</p>
              <p className="font-bold text-lg">{listing.listing_id || listing.project_id || listing.id}</p>
            </div>
          </div>

          {listing.description && (
            <div className="mt-8">
              <p className="text-sm font-semibold text-[#1E2022]/60 uppercase tracking-wider">Description</p>
              <p className="mt-2 leading-7 text-[#1E2022] bg-white p-4 rounded-xl border border-gray-100 shadow-sm">{listing.description}</p>
            </div>
          )}

          <div className="mt-10 flex gap-4">
            <button onClick={handleFavouriteToggle} disabled={favLoading} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-6 py-4 text-sm font-bold transition disabled:opacity-50 ${isFavourite ? "border-[#D97051] text-[#D97051] bg-white hover:bg-red-50" : "border-gray-200 text-gray-500 bg-white hover:border-[#D97051] hover:text-[#D97051]"}`}>
              <Heart size={20} className={isFavourite ? "fill-[#D97051] text-[#D97051]" : ""} />
              {favLoading ? "Updating..." : (isFavourite ? "Saved to Favourites" : "Save to Favourites")}
            </button>
            <button onClick={() => setShowContact(true)} className="flex-1 rounded-xl bg-[#D97051] px-6 py-4 text-sm font-bold text-white shadow-md transition hover:bg-[#c26245] hover:shadow-lg">
              Contact Agent
            </button>
          </div>
        </div>
      </div>

      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-2xl font-bold mb-1 text-[#1E2022]">Request Details</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              An agent will contact you shortly regarding <span className="font-bold text-[#1E2022]">{listing.apartment_name || "this property"}</span>.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setShowContact(false); showToast("Agent notified! They will call you soon.", "success"); }} className="space-y-4">
              <input required type="text" placeholder="Full Name" className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-[#D97051] focus:ring-1 focus:ring-[#D97051] transition" />
              <input required type="tel" placeholder="Phone Number" className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:border-[#D97051] focus:ring-1 focus:ring-[#D97051] transition" />
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