import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Falls keine Umgebungsvariablen gesetzt sind (z.B. auf Vercel/GitHub Pages ohne
// manuell konfigurierte Vars), werden die Projekt-Standardwerte verwendet.
// Der Publishable Key (sb_publishable_…) ist der Nachfolger des anon-Keys: Er ist
// öffentlich und sicher für Client-seitigen Code (Row-Level Security schützt die Daten).
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://dphhqwisluirihmahyee.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'sb_publishable_-VhbMGsUIHDW_Z0U4v9iQw_qw0xiSTf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in AsyncStorage so it survives app restarts
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
