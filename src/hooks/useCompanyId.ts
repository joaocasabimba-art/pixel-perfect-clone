import { useAuth } from "@/contexts/AuthContext";

export function useCompanyId() {
  const { profile } = useAuth();
  return profile?.company_id ?? null;
}
