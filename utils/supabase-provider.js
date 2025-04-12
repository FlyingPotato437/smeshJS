'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials missing. Using mock mode.');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// Create context
const SupabaseContext = createContext(null);

// Export provider
export function SupabaseProvider({ children }) {
  const [supabase] = useState(() => createSupabaseClient());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    
    // Check for active session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
      
      // Listen for auth changes
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user || null);
        }
      );
      
      return () => {
        authListener?.subscription.unsubscribe();
      };
    };
    
    checkSession();
  }, [supabase]);

  const value = {
    supabase,
    user,
    loading,
    isConfigured: !!supabase,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Export hook
export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    // If no context, we're not within the provider
    // Return a mock version that won't break the app
    return {
      supabase: null,
      user: null,
      loading: false,
      isConfigured: false,
    };
  }
  return context;
}; 