import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { clearAuthToken, getAuthToken } from "@/lib/utils";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAuthToken());
  const [, setLocation] = useLocation();

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
    setLocation("/login");
  };

  return {
    isAuthenticated,
    logout,
  };
}
