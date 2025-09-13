import { useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";

export function useIsAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancel = false;

    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!cancel) {
          // User is admin if they're authenticated with Supabase
          setIsAdmin(!!user);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!cancel) {
        setIsAdmin(!!session?.user);
        setLoading(false);
      }
    });

    return () => { 
      cancel = true;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
}
