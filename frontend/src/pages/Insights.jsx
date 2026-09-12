import { useEffect, useState } from "react";
import { Database, Home, TrendingUp, Ruler, PieChart, Download } from "lucide-react";
import { formatPrice, fixPropertyData } from "../utils/helpers";
import { getInsights } from "../api/ivyApi";
import { useToast } from "../context/ToastContext";

export default function Insights() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        const data = await getInsights();
        setMetrics(data);
      } catch (err) {
        setError(err.message || "Unable to load market insights");
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  const exportToCSV = () => {
    if (!metrics) return;
    const rows = [
      ["Metric", "Value"],
      ["City", metrics.city || "N/A"],
      ["Total Listings", metrics.total_listings || 0],
      ["Median Price", metrics.median_price || 0],
      ["Median Price Per Sqft", metrics.median_price_per_sqft || 0]
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ivyhomes_market_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Summary Exported Successfully!", "success");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1E2022]/10 pb-6">
          <div>
            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-[#D97051]">Executive BI Workspace</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1E2022] sm:text-4xl">Market Intelligence & Summary</h1>
            <p className="mt-1 text-sm text-[#1E2022]/60">
              Pre-computed analytics feed directly from the server engine.
            </p>
          </div>

          {!loading && !error && metrics && (
            <button onClick={exportToCSV} className="flex items-center gap-2 rounded-2xl bg-[#1E2022] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#D97051] shadow-sm">
              <Download size={16} /> Export CSV
            </button>
          )}
        </div>

        {loading && <div className="h-12 w-72 animate-pulse rounded-xl bg-gray-200" />}
        {error && <div className="rounded-xl bg-red-50 p-6 text-center text-red-600 font-semibold border border-red-200">{error}</div>}

        {!loading && !error && metrics && (
          <div className="space-y-10">
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <TrendingUp size/={16} className="text-[#D97051]" /> Primary City Aggregates
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Total City Listings</span>
                    <div className="p-2 bg-gray-50 rounded-xl"><Database size={18} className="text-gray-500" /></div>
                  </div>
                  <p className="text-4xl font-extrabold text-[#1E2022]">{metrics.total_listings?.toLocaleString() || 0}</p>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Median Property Price</span>
                    <div className="p-2 bg-blue-50 rounded-xl"><TrendingUp size={18} className="text-blue-500" /></div>
                  </div>
                  <p className="text-4xl font-extrabold text-[#1E2022]">{formatPrice(metrics.median_price)}</p>
                </div>

                <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Median Price / Sqft</span>
                    <div className="p-2 bg-purple-50 rounded-xl"><Ruler size={18} className="text-purple-500" /></div>
                  </div>
                  <p className="text-4xl font-extrabold text-purple-700">₹{(metrics.median_price_per_sqft || 0).toLocaleString()}</p>
                </div>
              </div>
            </section>

            {metrics.by_locality && metrics.by_locality.length > 0 && (
              <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                  <PieChart size={16} className="text-[#D97051]" /> Locality Breakdown
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {metrics.by_locality.map((loc, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-[#1E2022] capitalize">{loc.locality}</p>
                        <p className="text-xs text-gray-500">{loc.count} listings</p>
                      </div>
                      <p className="font-extrabold text-[#D97051]">{formatPrice(loc.median_price)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}