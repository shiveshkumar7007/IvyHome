import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuth } = useAuth();

  if (!isAuth) {
    // Redirect to login page, saving the attempted URL to drop them off later
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}