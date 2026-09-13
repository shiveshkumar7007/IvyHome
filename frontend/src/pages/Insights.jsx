import { useEffect, useState, useMemo } from "react";
import { 
  Database, 
  Home, 
  TrendingUp, 
  Ruler, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle,
  BadgeCheck,
  UserCheck,
  MapPin,
  Maximize,
  Filter,
  X,
  PieChart,
  Eye,
  Download
} from "lucide-react";
import { formatPrice } from "../utils/helpers";
import { useToast } from "../context/ToastContext";
import { getAllListings } from "../api/ivyApi";

export default function Insights() {
  const [rawListings, setRawListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Loading complete dataset corpus into memory...");
  const [error, setError] = useState("");
  const { showToast } = useToast();
  
  const [selectedLocality, setSelectedLocality] = useState("all");
  const [activeOnly, setActiveOnly] = useState(false);
  const [inspectModal, setInspectModal] = useState(null);

  useEffect(() => {
    async function loadFullData() {
      try {
        setLoading(true);
        setError("");
        setLoadingText("Fetching full listing records across all offsets...");

        const fullListings = await getAllListings();
        setRawListings(fullListings || []);
      } catch (err) {
        setError(err.message || "Unable to load market intelligence data");
      } finally {
        setLoading(false);
      }
    }
    loadFullData();
  }, []);

  const localities = useMemo(() => {
    const locSet = new Set();
    rawListings.forEach((item) => {
      if (item.locality) locSet.add(item.locality.toLowerCase().trim());
    });
    return Array.from(locSet).sort();
  }, [rawListings]);

  const auditData = useMemo(() => {
    const scamList = [];
    const corruptList = [];
    const magList = [];

    rawListings.forEach((l) => {
      const desc = String(l.description || "").toLowerCase();
      if (desc.includes("token amount") || desc.includes("booking amount") || desc.includes("site visit only after")) {
        scamList.push({ ...l, flagReason: "Demands upfront payment before viewing" });
      }

      const isNegative = Number(l.price) < 0;
      const isBadArea = Number(l.carpet_area) > 0 && Number(l.super_built_up_area) > 0 && Number(l.carpet_area) > Number(l.super_built_up_area);
      const isBadFloor = Number(l.total_floors) > 0 && Number(l.floor) > Number(l.total_floors);

      if (isNegative || isBadArea || isBadFloor) {
        corruptList.push({
          ...l,
          flagReason: isNegative ? "Negative pricing" : isBadArea ? "Carpet area exceeds Super Built-up" : "Floor higher than total floors"
        });
      }

      if (l.listing_id && String(l.listing_id).startsWith("MAG-")) {
        magList.push({ ...l, flagReason: "Area originally in Sq. Meters instead of Sq. Feet" });
      }
    });

    return { scamList, corruptList, magList };
  }, [rawListings]);

  const filteredMetrics = useMemo(() => {
    let dataset = rawListings;

    if (selectedLocality !== "all") {
      dataset = dataset.filter((l) => String(l.locality || "").toLowerCase().trim() === selectedLocality);
    }
    if (activeOnly) {
      dataset = dataset.filter((l) => l.is_live === true || l.is_live === "true" || l.is_live === 1);
    }

    const activeListings = dataset.filter((l) => l.is_live === true || l.is_live === "true" || l.is_live === 1);
    
    // Compute median price locally from active records
    const pricedPrices = activeListings.filter((l) => Number(l.price) > 0).map((l) => Number(l.price)).sort((a, b) => a - b);
    const medianPrice = pricedPrices.length > 0 ? pricedPrices[Math.floor(pricedPrices.length / 2)] : 0;

    const excludedIds = new Set([
      ...auditData.scamList.map((l) => l.listing_id),
      ...auditData.corruptList.map((l) => l.listing_id)
    ]);

    const valid2BHK = activeListings.filter((l) => 
      Number(l.bedroom) === 2 && 
      !excludedIds.has(l.listing_id) && 
      Number(l.carpet_area) > 0 && 
      Number(l.price) > 0
    );

    const avg2BHKPriceSqft = valid2BHK.length === 0 ? 0 : valid2BHK.reduce((sum, l) => sum + (Number(l.price) / Number(l.carpet_area)), 0) / valid2BHK.length;
    const verifiedCount = dataset.filter((l) => l.is_verified === true || l.is_verified === "true" || l.is_verified === 1).length;
    const ownerCount = dataset.filter((l) => String(l.posted_by || "").toLowerCase() === "owner").length;

    const validAreas = dataset.filter((l) => Number(l.carpet_area) > 0).map((l) => Number(l.carpet_area));
    const avgArea = validAreas.length > 0 ? validAreas.reduce((a, b) => a + b, 0) / validAreas.length : 0;

    const bhkDistribution = { "1 BHK": 0, "2 BHK": 0, "3 BHK": 0, "4+ BHK": 0 };
    dataset.forEach((l) => {
      const b = Number(l.bedroom);
      if (b === 1) bhkDistribution["1 BHK"]++;
      else if (b === 2) bhkDistribution["2 BHK"]++;
      else if (b === 3) bhkDistribution["3 BHK"]++;
      else if (b >= 4) bhkDistribution["4+ BHK"]++;
    });

    const propertyTypes = {};
    dataset.forEach((l) => {
      const type = l.property_type ? l.property_type.toLowerCase() : "other";
      propertyTypes[type] = (propertyTypes[type] || 0) + 1;
    });

    return {
      totalCount: dataset.length,
      activeCount: activeListings.length,
      medianPrice,
      avg2BHKPriceSqft: Math.round(avg2BHKPriceSqft),
      verifiedCount,
      ownerCount,
      avgArea: Math.round(avgArea),
      bhkDistribution,
      propertyTypes
    };
  }, [rawListings, selectedLocality, activeOnly, auditData]);

  const exportToCSV = () => {
    if (!filteredMetrics) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Evaluated Records", filteredMetrics.totalCount],
      ["Active Listings", filteredMetrics.activeCount],
      ["Scam Listings Blocked", auditData.scamList.length],
      ["Corrupt Records Flagged", auditData.corruptList.length],
      ["Median Price", filteredMetrics.medianPrice],
      ["Avg 2BHK Price/Sqft", filteredMetrics.avg2BHKPriceSqft],
      ["Area Unit Errors (MAG-)", auditData.magList.length]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ivyhomes_corpus_audit.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Audit Report Exported Successfully!", "success");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16 font-sans">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1E2022]/10 pb-6">
          <div>
            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-[#D97051]">Executive BI Workspace</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1E2022] sm:text-4xl">Full Market Intelligence & Audit</h1>
            <p className="mt-1 text-sm text-[#1E2022]/60">
              Interactive analytics engine processing 100% of downloaded database records with real-time audit tracing.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 px-2 text-sm font-semibold text-[#1E2022]">
                <Filter size={16} className="text-[#D97051]" />
                Locality:
              </div>
              <select
                value={selectedLocality}
                onChange={(e) => setSelectedLocality(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-[#1E2022] text-sm rounded-xl px-3 py-1.5 outline-none font-medium capitalize"
              >
                <option value="all">All Localities ({rawListings.length} loaded)</option>
                {localities.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              <label className="flex items-center gap-2 cursor-pointer border-l border-gray-200 pl-3 text-sm font-semibold text-[#1E2022]">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                  className="h-4 w-4 accent-[#D97051] rounded"
                />
                Active Only
              </label>
            </div>
            
            <button onClick={exportToCSV} className="flex h-full items-center gap-2 rounded-2xl bg-[#1E2022] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#D97051] shadow-sm">
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100 space-y-4">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#D97051] border-r-transparent"></div>
            <p className="font-bold text-[#1E2022]">{loadingText}</p>
          </div>
        )}

        {error && <div className="rounded-xl bg-red-50 p-6 text-center text-red-600 font-semibold border border-red-200">{error}</div>}

        {!loading && !error && filteredMetrics && (
          <div className="space-y-10">

            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <TrendingUp size={16} className="text-[#D97051]" />
                Primary KPI Indicators {selectedLocality !== "all" && `— Filtering: ${selectedLocality}`}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Evaluated Units</span>
                    <div className="p-2 bg-gray-50 rounded-xl"><Database size={18} className="text-gray-500" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-[#1E2022]">{filteredMetrics.totalCount.toLocaleString()}</p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Live Listings</span>
                    <div className="p-2 bg-green-50 rounded-xl"><Home size={18} className="text-green-500" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-green-600">{filteredMetrics.activeCount.toLocaleString()}</p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Median Price</span>
                    <div className="p-2 bg-blue-50 rounded-xl"><TrendingUp size={18} className="text-blue-500" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-[#1E2022]">{formatPrice(filteredMetrics.medianPrice)}</p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Avg 2BHK Price/Sqft</span>
                    <div className="p-2 bg-purple-50 rounded-xl"><Ruler size={18} className="text-purple-500" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-purple-700">₹{filteredMetrics.avg2BHKPriceSqft.toLocaleString()}</p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Verified Portfolios</span>
                    <div className="p-2 bg-teal-50 rounded-xl"><BadgeCheck size={18} className="text-teal-600" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-[#1E2022]">{filteredMetrics.verifiedCount.toLocaleString()}</p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Direct From Owner</span>
                    <div className="p-2 bg-indigo-50 rounded-xl"><UserCheck size={18} className="text-indigo-600" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-[#1E2022]">{filteredMetrics.ownerCount.toLocaleString()}</p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Average Floor Plan</span>
                    <div className="p-2 bg-amber-50 rounded-xl"><Maximize size={18} className="text-amber-600" /></div>
                  </div>
                  <p className="text-3xl font-extrabold text-[#1E2022]">{filteredMetrics.avgArea.toLocaleString()} <span className="text-base font-bold text-gray-400">sq.ft</span></p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Selected Area</span>
                    <div className="p-2 bg-rose-50 rounded-xl"><MapPin size={18} className="text-rose-600" /></div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#1E2022] capitalize truncate">{selectedLocality === "all" ? "All Localities" : selectedLocality}</p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="mb-6 flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <PieChart size={16} className="text-[#D97051]" />
                    BHK Volume Distribution
                  </h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(filteredMetrics.bhkDistribution).map(([label, count]) => {
                    const pct = Math.round((count / (filteredMetrics.totalCount || 1)) * 100);
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs font-bold mb-1 text-[#1E2022]">
                          <span>{label}</span>
                          <span>{count.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#D97051] rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <div className="mb-6 flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                    <PieChart size={16} className="text-[#D97051]" />
                    Inventory Category Share
                  </h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(filteredMetrics.propertyTypes).map(([label, count]) => {
                    const pct = Math.round((count / (filteredMetrics.totalCount || 1)) * 100);
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-xs font-bold mb-1 text-[#1E2022] capitalize">
                          <span>{label}</span>
                          <span>{count.toLocaleString()} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-500" />
                  Security & Integrity Radar (Click card to audit)
                </h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-3">
                <div onClick={() => setInspectModal({ title: "Flagged Fraudulent / Advance-Payment Listings", items: auditData.scamList })} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 border-l-4 border-l-red-500 cursor-pointer transition hover:-translate-y-1 hover:shadow-md">
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Advance Fee Scams</span><ShieldAlert size={20} className="text-red-500" /></div>
                  <p className="text-4xl font-black text-red-600 mb-1">{auditData.scamList.length}</p>
                  <p className="text-xs text-gray-500 mb-3">Solicit upfront non-refundable fees prior to inspection.</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-red-600"><Eye size={14} /> Inspect listings</div>
                </div>

                <div onClick={() => setInspectModal({ title: "Flagged Corrupt / Impossible Database Records", items: auditData.corruptList })} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 border-l-4 border-l-orange-500 cursor-pointer transition hover:-translate-y-1 hover:shadow-md">
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Corrupt Records</span><AlertTriangle size={20} className="text-orange-500" /></div>
                  <p className="text-4xl font-black text-orange-500 mb-1">{auditData.corruptList.length}</p>
                  <p className="text-xs text-gray-500 mb-3">Negative prices, impossible floors, or inverted areas.</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-orange-500"><Eye size={14} /> Inspect listings</div>
                </div>

                <div onClick={() => setInspectModal({ title: "MagicHomes Area Unit Inconsistencies", items: auditData.magList })} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 border-l-4 border-l-blue-500 cursor-pointer transition hover:-translate-y-1 hover:shadow-md">
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Unit Contradictions</span><AlertCircle size={20} className="text-blue-500" /></div>
                  <p className="text-4xl font-black text-blue-600 mb-1">{auditData.magList.length}</p>
                  <p className="text-xs text-gray-500 mb-3">Records measured in Square Meters instead of Square Feet.</p>
                  <div className="flex items-center gap-1 text-xs font-bold text-blue-600"><Eye size={14} /> Inspect listings</div>
                </div>
              </div>
            </section>

          </div>
        )}

        {inspectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-gray-50">
                <div>
                  <h3 className="text-lg font-bold text-[#1E2022]">{inspectModal.title}</h3>
                  <p className="text-xs text-gray-500 font-medium">Found {inspectModal.items.length} records matching this query</p>
                </div>
                <button onClick={() => setInspectModal(null)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto divide-y divide-gray-100">
                {inspectModal.items.map((item, idx) => (
                  <div key={item.listing_id || idx} className="py-3 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold bg-[#FDF1EA] text-[#D97051] px-2 py-0.5 rounded-md">{item.listing_id}</span>
                      <span className="text-xs font-bold text-red-500">{item.flagReason}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <p className="font-bold text-[#1E2022]">{item.apartment_name || "Property Listing"}</p>
                      <span className="font-bold text-gray-600">{formatPrice(item.price)}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 italic line-clamp-2 mt-0.5 bg-gray-50 p-2 rounded-lg">"{item.description}"</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-end">
                <button onClick={() => setInspectModal(null)} className="rounded-xl bg-[#1E2022] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#D97051]">Close Audit</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}