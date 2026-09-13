import { useEffect, useState, useMemo, useRef } from "react";
import { getAllListings, getAllRentals, getAllProjects, addFavourite, removeFavourite, getFavourites } from "../api/ivyApi";
import { formatPrice } from "../utils/helpers";
import { Search, X, MapPin, Bed, Maximize2, Heart, Phone, User, Compass, Building, Car, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Define Custom Blue and Red Leaflet Markers via CDN (Zero Build Errors)
const blueIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapExplorer() {
  const [listings, setListings] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Sidebar & Favorite States
  const [selectedListing, setSelectedListing] = useState(null);
  const [favourites, setFavourites] = useState([]);
  const [activeMarkerId, setActiveMarkerId] = useState(null);

  // Multi-select Checkbox States for Data Sources (Projects enabled by default)
  const [showProjects, setShowProjects] = useState(true);
  const [showListings, setShowListings] = useState(false);
  const [showRentals, setShowRentals] = useState(false);

  // Filter States for Map (Including Money/Budget Slider)
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const markerInstancesRef = useRef({});

  useEffect(() => {
    async function loadMapData() {
      setLoading(true);
      try {
        const [listingsData, rentalsData, projectsData, favs] = await Promise.all([
          getAllListings(),
          getAllRentals(),
          getAllProjects(),
          getFavourites()
        ]);
        setListings((listingsData || []).map(l => ({ ...l, __type: 'listing' })));
        setRentals((rentalsData || []).map(r => ({ ...r, price: r.monthly_rent || r.price, __type: 'rental' })));
        setProjects((projectsData || []).map(p => ({ ...p, price: p.price_min || p.price, __type: 'project' })));
        setFavourites(favs || []);
      } catch (err) {
        console.error("Failed to load map data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMapData();
  }, []);

  // Combine datasets based on active checkboxes
  const currentDataset = useMemo(() => {
    let combined = [];
    if (showProjects) combined = [...combined, ...projects];
    if (showListings) combined = [...combined, ...listings];
    if (showRentals) combined = [...combined, ...rentals];
    return combined;
  }, [showProjects, showListings, showRentals, projects, listings, rentals]);

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
      } else {
        await addFavourite(id);
        setFavourites(prev => [...prev, selectedListing]);
      }
    } catch (err) {
      console.error("Failed to update favourite", err);
    }
  }

  // Filter items + filter out sea-plotted/invalid coordinates
  const filteredListings = useMemo(() => {
    return currentDataset.filter(item => {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);

      if (isNaN(lat) || isNaN(lng)) return false;
      if (lat < 17 || lat > 20 || lng < 72 || lng > 75) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const loc = (item.locality || "").toLowerCase();
        const name = (item.apartment_name || item.project_name || item.name || "").toLowerCase();
        if (!loc.includes(q) && !name.includes(q)) return false;
      }
      if (propertyType && (item.property_type || item.project_status || "").toLowerCase() !== propertyType.toLowerCase()) return false;
      if (maxPrice && Number(item.price) > Number(maxPrice)) return false;

      return true;
    });
  }, [currentDataset, search, propertyType, maxPrice]);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView([18.5204, 73.8567], 12);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers dynamically when filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();
    markerInstancesRef.current = {};

    const bounds = [];

    filteredListings.forEach(item => {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);
      const id = String(item.listing_id || item.project_id || item.id);

      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.push([lat, lng]);

        const initialIcon = activeMarkerId === id ? redIcon : blueIcon;
        const marker = L.marker([lat, lng], { icon: initialIcon });
        
        markerInstancesRef.current[id] = marker;
        
        marker.on('click', () => {
          if (activeMarkerId && markerInstancesRef.current[activeMarkerId]) {
            markerInstancesRef.current[activeMarkerId].setIcon(blueIcon);
          }
          
          marker.setIcon(redIcon);
          setActiveMarkerId(id);
          setSelectedListing(item);
        });

        markersLayer.addLayer(marker);
      }
    });

    if (bounds.length > 0 && mapInstanceRef.current && !selectedListing) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredListings, activeMarkerId]);

  const closeSidebar = () => {
    if (activeMarkerId && markerInstancesRef.current[activeMarkerId]) {
      markerInstancesRef.current[activeMarkerId].setIcon(blueIcon);
    }
    setActiveMarkerId(null);
    setSelectedListing(null);
  };

  const clearFilters = () => {
    setSearch("");
    setShowProjects(true);
    setShowListings(false);
    setShowRentals(false);
    setPropertyType("");
    setMaxPrice("");
  };

  return (
    <div className="min-h-screen bg-white pb-12 font-sans flex flex-col relative overflow-hidden">
      
      {/* Left Sliding Sidebar Drawer for Details */}
      <div className={`fixed inset-y-0 left-0 z-50 w-full sm:w-[440px] bg-white shadow-2xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col ${selectedListing ? 'translate-x-0' : '-translate-x-full'}`}>
        {selectedListing && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#FDF1EA]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-[#D97051] text-white rounded-lg">
                    {selectedListing.__type === 'project' ? (selectedListing.project_status || 'Project') : (selectedListing.property_type || 'Apartment')}
                  </span>
                  <button 
                    onClick={handleToggleFavourite} 
                    className="p-1.5 rounded-full bg-white hover:bg-gray-100 transition shadow-sm"
                  >
                    <Heart size={18} className={isCurrentFavourite ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-500"} />
                  </button>
                </div>
                <h2 className="text-xl font-black text-[#1E2022] mt-2">{selectedListing.apartment_name || selectedListing.project_name || selectedListing.name || 'Property Detail'}</h2>
              </div>
              <button 
                onClick={closeSidebar}
                className="p-2 rounded-xl bg-white text-gray-500 hover:text-[#D97051] hover:bg-gray-100 transition shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {selectedListing.image_url && (
                <img src={selectedListing.image_url} alt="Property" className="w-full h-40 rounded-2xl object-cover border border-gray-100" />
              )}

              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedListing.__type === 'rental' ? 'Monthly Rent' : 'Price'}</p>
                  <p className="text-xl font-black text-[#059669]">
                    {selectedListing.__type === 'rental' ? `₹${(selectedListing.price || 0).toLocaleString("en-IN")} / mo` : formatPrice(selectedListing.price || selectedListing.price_min)}
                  </p>
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
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Contact / Developer</p>
                    <p className="text-xs font-bold text-[#1E2022]">{selectedListing.posted_by_name || selectedListing.builder_name || "Direct Owner"}</p>
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
                to={`/listings/${selectedListing.listing_id || selectedListing.project_id || selectedListing.id}`}
                className="w-full py-3 rounded-xl bg-[#D97051] text-white text-center text-xs font-bold shadow-md hover:bg-[#c26245] transition flex items-center justify-center gap-2"
              >
                View Full Page Details &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 w-full flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E2022]">Geospatial Map Explorer</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? "Loading database markers..." : `Showing ${filteredListings.length.toLocaleString()} of ${currentDataset.length.toLocaleString()} total records matching your filters`}
            </p>
          </div>
        </div>

        <section className="mb-6 rounded-2xl bg-[#FDF1EA] p-5 shadow-sm border border-[#1E2022]/10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Checkbox Group for Data Sources */}
          <div className="lg:col-span-3 flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#1E2022]/10">
            <div className="flex flex-wrap items-center gap-6">
              <span className="text-xs font-bold text-gray-500 uppercase">Data Sources:</span>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-[#1E2022]">
                <input 
                  type="checkbox" 
                  checked={showProjects} 
                  onChange={(e) => setShowProjects(e.target.checked)} 
                  className="w-4 h-4 accent-[#D97051] rounded"
                />
                Projects ({projects.length})
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-[#1E2022]">
                <input 
                  type="checkbox" 
                  checked={showListings} 
                  onChange={(e) => setShowListings(e.target.checked)} 
                  className="w-4 h-4 accent-[#D97051] rounded"
                />
                Listings ({listings.length})
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-[#1E2022]">
                <input 
                  type="checkbox" 
                  checked={showRentals} 
                  onChange={(e) => setShowRentals(e.target.checked)} 
                  className="w-4 h-4 accent-[#D97051] rounded"
                />
                Rentals ({rentals.length})
              </label>
            </div>

            {/* Total Number of Results Badge */}
            <div className="bg-white px-4 py-1.5 rounded-xl border border-gray-200 shadow-sm text-xs font-bold text-[#1E2022]">
              Total Results: <span className="text-[#D97051] font-black">{filteredListings.length.toLocaleString()}</span>
            </div>
          </div>

          <div className="relative flex flex-col justify-end">
            <label className="mb-1 block text-xs font-bold text-gray-500 uppercase">Search Locality / Name</label>
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-3 text-gray-400" />
              <input 
                type="text" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="eg...Wakad" 
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#D97051]" 
              />
            </div>
          </div>

          {/* Money Slider Filter for Max Budget */}
          <div className="flex flex-col justify-end bg-white p-3 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Max Budget</label>
              <span className="text-xs font-black text-[#D97051]">{maxPrice ? formatPrice(maxPrice) : "No Limit"}</span>
            </div>
            <input 
              type="range" 
              min="1000000" 
              max="50000000" 
              step="1000000"
              value={maxPrice || 50000000} 
              onChange={(e) => setMaxPrice(e.target.value)} 
              className="w-full accent-[#D97051] cursor-pointer"
            />
          </div>

          <div className="flex items-end gap-2 justify-end lg:col-span-3">
            <button 
              onClick={clearFilters} 
              className="rounded-xl bg-white border border-gray-300 px-5 py-2.5 text-xs font-bold text-[#1E2022] hover:border-[#D97051] hover:text-[#D97051] transition whitespace-nowrap shadow-sm"
            >
              Reset Filters
            </button>
          </div>
        </section>

        <div className="relative w-full h-[650px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
          <div ref={mapRef} className="w-full h-full z-10" />
        </div>
      </main>
    </div>
  );
}