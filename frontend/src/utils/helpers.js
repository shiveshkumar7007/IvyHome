export function formatPrice(price) {
  if (!price || isNaN(Number(price))) return "NA";
  const value = Number(price);
  
  if (value < 0) {
    const absVal = Math.abs(value);
    if (absVal >= 10000000) return `-₹${(absVal / 10000000).toFixed(2)} Cr`;
    if (absVal >= 100000) return `-₹${(absVal / 100000).toFixed(2)} L`;
    return `-₹${absVal.toLocaleString("en-IN")}`;
  }

  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function fixPropertyData(data) {
  if (!data) return data;
  const updated = { ...data };

  // Keep negative or raw pricing intact as requested, sanitize only completely invalid values
  if (updated.price !== undefined && updated.price !== null) {
    const p = Number(updated.price);
    if (!isNaN(p)) updated.price = p;
  }
  if (updated.price_min !== undefined && updated.price_min !== null) {
    const p = Number(updated.price_min);
    if (!isNaN(p)) updated.price_min = p;
  }
  if (updated.price_max !== undefined && updated.price_max !== null) {
    const p = Number(updated.price_max);
    if (!isNaN(p)) updated.price_max = p;
  }

  // 1. Fix MagicHomes (MAG-) Area Units (Sq Meters to Sq Ft)
  if (updated.listing_id?.startsWith("MAG-") || updated.project_id?.startsWith("MAG-")) {
    if (updated.carpet_area) updated.carpet_area = Math.round(updated.carpet_area * 10.764);
    if (updated.super_built_up_area) updated.super_built_up_area = Math.round(updated.super_built_up_area * 10.764);
    if (updated.super_builtup_area) updated.super_builtup_area = Math.round(updated.super_builtup_area * 10.764);
    if (updated.min_area_sqft) updated.min_area_sqft = Math.round(updated.min_area_sqft * 10.764);
    if (updated.max_area_sqft) updated.max_area_sqft = Math.round(updated.max_area_sqft * 10.764);
  }

  // 2. Fix Project Prices (Lakhs to Rupees)
  if (updated.project_status || updated.project_id || updated.price_min) {
    if (updated.price_min && updated.price_min > 0 && updated.price_min < 100000) updated.price_min = updated.price_min * 100000;
    if (updated.price_max && updated.price_max > 0 && updated.price_max < 100000) updated.price_max = updated.price_max * 100000;
  }

  return updated;
}