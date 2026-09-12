import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/Login";
import Listings from "./pages/Listings";
import ListingDetail from "./pages/ListingDetail";
import Favourites from "./pages/Favourites";
import Rentals from "./pages/Rentals";
import Projects from "./pages/Projects";
import Insights from "./pages/Insights";

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Secured Routes */}
          <Route path="/" element={<ProtectedRoute><Layout><Listings /></Layout></ProtectedRoute>} />
          <Route path="/listings" element={<ProtectedRoute><Layout><Listings /></Layout></ProtectedRoute>} />
          <Route path="/listings/:id" element={<ProtectedRoute><Layout><ListingDetail /></Layout></ProtectedRoute>} />
          
          <Route path="/rentals" element={<ProtectedRoute><Layout><Rentals /></Layout></ProtectedRoute>} />
          <Route path="/rentals/:id" element={<ProtectedRoute><Layout><ListingDetail /></Layout></ProtectedRoute>} />
          
          <Route path="/projects" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
          <Route path="/projects/:id" element={<ProtectedRoute><Layout><ListingDetail /></Layout></ProtectedRoute>} />
          
          <Route path="/favourites" element={<ProtectedRoute><Layout><Favourites /></Layout></ProtectedRoute>} />
          <Route path="/insights" element={<ProtectedRoute><Layout><Insights /></Layout></ProtectedRoute>} />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;