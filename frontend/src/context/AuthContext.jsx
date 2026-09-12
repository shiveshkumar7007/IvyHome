import { createContext, useContext, useState, useEffect } from "react";
import { login as apiLogin, logout as apiLogout, isAuthenticated } from "../api/ivyApi";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuth, setIsAuth] = useState(isAuthenticated());

  useEffect(() => {
    // Check initial authentication status from the secure cookie
    setIsAuth(isAuthenticated());
  }, []);

  const login = async (email, password) => {
    // The apiLogin function now automatically sets the 24-hour cookie
    const data = await apiLogin(email, password);
    setIsAuth(true);
    return data;
  };

  const logout = () => {
    setIsAuth(false);
    // apiLogout completely erases the cookies and handles the redirect to /login
    apiLogout(); 
  };

  return (
    <AuthContext.Provider value={{ isAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};