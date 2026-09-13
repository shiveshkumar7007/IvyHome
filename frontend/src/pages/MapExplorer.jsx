import { useEffect, useState, useMemo, useRef } from "react";
import { getAllListings } from "../api/ivyApi";
import { formatPrice } from "../utils/helpers";
import { Search } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet Default Icon 403 / Missing Image Bug
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function MapExplorer() {
  const [listings, setListings] = useState(() => window.__IVY_DB_CACHE__ || []);
  const [loading, setLoading] = useState(!window.__IVY_DB_CACHE__);
  
  // Filter States for Map
  const [search, setSearch] = useState("wakad");
  const [propertyType, setPropertyType] = useState("");
  const [bedroom, setBedroom] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    async function loadMapData() {
      if (!window.__IVY_DB_CACHE__) setLoading(true);
      try {
        const data = await getAllListings();
        setListings(data || []);
      } catch (err) {
        console.error("Failed to load map data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMapData();
  }, []);

  // Filter listings + filter out sea-plotted/invalid coordinates
  const filteredListings = useMemo(() => {
    return listings.filter(item => {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);

      // Filter out missing, out-of-bounds, or "in-the-sea" coordinates 
      // (Valid Pune region roughly: Lat 18 to 19, Lng 73 to 74)
      if (isNaN(lat) || isNaN(lng)) return false;
      if (lat < 17 || lat > 20 || lng < 72 || lng > 75) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const loc = (item.locality || "").toLowerCase();
        const name = (item.apartment_name || "").toLowerCase();
        if (!loc.includes(q) && !name.includes(q)) return false;
      }
      if (propertyType && (item.property_type || "").toLowerCase() !== propertyType.toLowerCase()) return false;
      if (bedroom && Number(item.bedroom) !== Number(bedroom)) return false;
      if (maxPrice && Number(item.price) > Number(maxPrice)) return false;

      return true;
    });
  }, [listings, search, propertyType, bedroom, maxPrice]);

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

    const bounds = [];

    filteredListings.forEach(item => {
      const lat = Number(item.latitude);
      const lng = Number(item.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.push([lat, lng]);

        const marker = L.marker([lat, lng]);
        
        const popupContent = `
          <div style="font-family: sans-serif; min-width: 180px;">
            <p style="font-size: 10px; font-weight: bold; color: #D97051; text-transform: uppercase; margin-bottom: 2px;">${item.property_type || 'Apartment'}</p>
            <h4 style="font-size: 14px; font-weight: bold; color: #1E2022; margin: 0 0 4px 0;">${item.apartment_name || 'Property'}</h4>
            <p style="font-size: 12px; color: #6b7280; margin: 0 0 6px 0;">📍 ${item.locality || 'N/A'}</p>
            <p style="font-size: 14px; font-weight: 800; color: #059669; margin: 0 0 8px 0;">${formatPrice(item.price)}</p>
            <a href="/listings/${item.listing_id || item.id}" style="display: inline-block; font-size: 11px; font-weight: bold; color: #D97051; text-decoration: none;">View Details &rarr;</a>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);
      }
    });

    if (bounds.length > 0 && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredListings]);

  const clearFilters = () => {
    setSearch("");
    setPropertyType("");
    setBedroom("");
    setMaxPrice("");
  };

  return (
    <div className="min-h-screen bg-white pb-12 font-sans flex flex-col">
      <main className="mx-auto max-w-7xl px-4 py-6 w-full flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E2022]">Geospatial Map Explorer</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? "Loading database markers..." : `Displaying ${filteredListings.length.toLocaleString()} valid land-based properties on interactive map`}
            </p>
          </div>
        </div>

        <section className="mb-6 rounded-2xl bg-[#FDF1EA] p-5 shadow-sm border border-[#1E2022]/10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2 relative flex items-center">
            <Search size={16} className="absolute left-3 text-gray-400" />
            <input 
              type="text" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="eg...Wakad" 
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#D97051]" 
            />
          </div>

          <div>
            <select 
              value={propertyType} 
              onChange={(e) => setPropertyType(e.target.value)} 
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D97051] capitalize"
            >
              <option value="">All property types</option>
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
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D97051]"
            >
              <option value="">Any BHK</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4+ BHK</option>
            </select>
          </div>

          <div className="flex gap-2">
            <select 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(e.target.value)} 
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D97051]"
            >
              <option value="">Max Price</option>
              <option value="5000000">₹50 L</option>
              <option value="10000000">₹1 Cr</option>
              <option value="20000000">₹2 Cr</option>
              <option value="50000000">₹5 Cr</option>
            </select>
            <button 
              onClick={clearFilters} 
              className="rounded-xl bg-white border border-gray-300 px-3 py-2.5 text-xs font-bold text-[#1E2022] hover:border-[#D97051] hover:text-[#D97051] transition whitespace-nowrap"
            >
              Reset
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