import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: { id: string; full_name: string; company_id: string | null; role: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [loading, setLoading] = useState(true);

  const setupCompanyIfNeeded = async (userId: string, userMeta: any) => {
    // Check if profile has company_id
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, company_id, role")
      .eq("id", userId)
      .maybeSingle();

    if (profileData && !profileData.company_id && userMeta?.company_name) {
      // User confirmed email but company wasn't created yet
      try {
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .insert({
            name: userMeta.company_name,
            cnpj: userMeta.cnpj || null,
            phone: userMeta.phone || null,
          })
          .select("id")
          .single();

        if (!companyError && company) {
          await supabase
            .from("profiles")
            .update({
              company_id: company.id,
              full_name: userMeta.full_name || profileData.full_name,
              phone: userMeta.phone || null,
            })
            .eq("id", userId);

          return { ...profileData, company_id: company.id, full_name: userMeta.full_name || profileData.full_name };
        }
      } catch (e) {
        console.error("Error setting up company:", e);
      }
    }

    return profileData;
  };

  const fetchProfile = async (userId: string, userMeta?: any) => {
    const data = await setupCompanyIfNeeded(userId, userMeta);
    setProfile(data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id, session.user.user_metadata), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.user_metadata);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
