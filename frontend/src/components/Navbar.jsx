import { Link, useLocation } from "react-router-dom";
import { logout } from "../api/ivyApi";

export default function Navbar() {
  const location = useLocation();

  const navLinks = [
    { name: "Listings", path: "/listings" },
    { name: "Rentals", path: "/rentals" },
    { name: "Projects", path: "/projects" },
    { name: "Favourites", path: "/favourites" },
    { name: "Insights", path: "/insights" },
    { name: "Radar Map", path: "/map" }, // <-- Added Map link here
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1E2022]/10 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex flex-shrink-0 items-center">
            <Link to="/" className="text-2xl font-black text-[#1E2022] tracking-tighter">
              Ivy<span className="text-[#D97051]">Homes</span>
            </Link>
          </div>
          
          <div className="hidden md:flex md:space-x-8">
            {navLinks.map((link) => {
              const isActive = location.pathname.startsWith(link.path) || (location.pathname === "/" && link.path === "/listings");
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-bold transition ${
                    isActive 
                      ? "text-[#D97051] border-b-2 border-[#D97051]" 
                      : "text-[#1E2022]/60 hover:text-[#1E2022]"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center">
            {/* Securely wipes cookies and redirects */}
            <button
              onClick={() => logout()}
              className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-bold text-[#1E2022] transition hover:border-[#D97051] hover:text-[#D97051]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}