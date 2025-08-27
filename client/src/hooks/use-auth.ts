import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  email: string;
  name: string | null;
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has a valid token
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    const userEmail = localStorage.getItem('user-email');
    
    if (token || userEmail) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
    enabled: isAuthenticated,
  });

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('user-email');
    localStorage.removeItem('current-team-id');
    localStorage.removeItem('current-team');
    setIsAuthenticated(false);
    window.location.reload();
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}