function FilterBar({ filters, setFilters, onSearch }) {
  function update(name, value) {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function reset() {
    setFilters({
      locality: "",
      bedroom: "",
      property_type: "",
      furnishing: "",
      min_price: "",
      max_price: "",
    });
  }

  return (
    <section className="filter-box">
      <div className="filter-grid">
        <div className="field">
          <label>Locality</label>
          <input
            value={filters.locality}
            onChange={(e) => update("locality", e.target.value)}
            placeholder="Kharadi"
          />
        </div>

        <div className="field">
          <label>Bedrooms</label>
          <select
            value={filters.bedroom}
            onChange={(e) => update("bedroom", e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4 BHK</option>
          </select>
        </div>

        <div className="field">
          <label>Property Type</label>
          <select
            value={filters.property_type}
            onChange={(e) => update("property_type", e.target.value)}
          >
            <option value="">Any</option>
            <option value="Apartment">Apartment</option>
            <option value="Villa">Villa</option>
            <option value="Independent House">Independent House</option>
          </select>
        </div>

        <div className="field">
          <label>Furnishing</label>
          <select
            value={filters.furnishing}
            onChange={(e) => update("furnishing", e.target.value)}
          >
            <option value="">Any</option>
            <option value="Furnished">Furnished</option>
            <option value="Semi-Furnished">Semi-Furnished</option>
            <option value="Unfurnished">Unfurnished</option>
          </select>
        </div>

        <div className="field">
          <label>Min Price</label>
          <input
            type="number"
            value={filters.min_price}
            onChange={(e) => update("min_price", e.target.value)}
            placeholder="₹"
          />
        </div>

        <div className="field">
          <label>Max Price</label>
          <input
            type="number"
            value={filters.max_price}
            onChange={(e) => update("max_price", e.target.value)}
            placeholder="₹"
          />
        </div>
      </div>

      <div className="filter-actions">
        <button className="secondary-btn" onClick={reset}>
          Reset
        </button>

        <button className="primary-btn" onClick={onSearch}>
          Search Properties
        </button>
      </div>
    </section>
  );
}

export default FilterBar;