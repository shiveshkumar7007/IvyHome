import { findCoordinateAnomalies } from "../utils/insights";

export default function CoordinateAudit({ listings }) {
  const anomalies = findCoordinateAnomalies(listings);
  
  if (anomalies.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 my-6">
      <h3 className="text-xl font-bold text-[#1E2022] mb-2">Corrupted Location Data</h3>
      <p className="text-sm text-gray-500 mb-4">
        {anomalies.length} listing{anomalies.length !== 1 ? "s" : ""} have 
        latitude and longitude swapped, placing the property outside Pune entirely.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 uppercase">
              <th className="pb-3 font-bold">Listing ID</th>
              <th className="pb-3 font-bold">Stated Locality</th>
              <th className="pb-3 font-bold">Recorded Coordinates</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {anomalies.map((a) => (
              <tr key={a.listingId} className="hover:bg-gray-50/50">
                <td className="py-3 font-bold text-[#1E2022]">{a.listingId}</td>
                <td className="py-3 capitalize text-gray-600">{a.statedLocality}</td>
                <td className="py-3 font-mono text-red-600">
                  {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}