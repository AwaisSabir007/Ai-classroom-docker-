import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!user && !error,
  };
}
