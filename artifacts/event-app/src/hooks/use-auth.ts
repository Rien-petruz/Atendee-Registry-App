import { useState, useEffect } from "react";
import { clearAuthToken, getAuthToken } from "@/lib/utils.js";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken());

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!getAuthToken());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const logout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    window.location.href = "/login";
  };

  return {
    isAuthenticated,
    logout,
  };
}
