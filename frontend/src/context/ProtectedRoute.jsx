import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../api/ivyApi";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    // Redirect to login page, saving the attempted URL to drop them off later if needed
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}