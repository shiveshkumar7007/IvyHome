import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function PropertyMap({ listings = [] }) {
  // Fallback center coordinates (e.g., Pune / city center coordinates from dataset)
  const defaultCenter = [18.5204, 73.8567];

  // Find valid coordinates to center map if available
  const validListings = listings.filter(item => item.latitude && item.longitude);
  const mapCenter = validListings.length > 0 
    ? [validListings[0].latitude, validListings[0].longitude] 
    : defaultCenter;

  return (
    <div className="map-container-wrapper" style={{ margin: "20px 0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
      <MapContainer 
        center={mapCenter} 
        zoom={12} 
        scrollWheelZoom={false} 
        style={{ height: "450px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validListings.map((property) => {
          const id = property.listing_id || property.id;
          const name = property.apartment_name || property.title || "Property Listing";
          const price = property.price ? `₹ ${property.price.toLocaleString()}` : "Price on request";
          
          return (
            <Marker key={id} position={[property.latitude, property.longitude]}>
              <Popup>
                <div style={{ minWidth: "150px", fontFamily: "sans-serif" }}>
                  <h4 style={{ margin: "0 0 5px 0", fontSize: "14px", fontWeight: "600" }}>{name}</h4>
                  <p style={{ margin: "0 0 8px 0", color: "#2b6cb0", fontWeight: "bold", fontSize: "13px" }}>{price}</p>
                  <p style={{ margin: "0 0 8px 0", fontSize: "11px", color: "#666", textTransform: "capitalize" }}>
                    {property.locality} • {property.bedroom} BHK
                  </p>
                  <a 
                    href={`/listings/${id}`} 
                    style={{ 
                      background: "#3182ce", 
                      color: "white", 
                      padding: "4px 8px", 
                      borderRadius: "4px", 
                      textDecoration: "none", 
                      fontSize: "11px",
                      display: "inline-block"
                    }}
                  >
                    View Details
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}