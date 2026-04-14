import { createClient } from '@supabase/supabase-js';

// Falls keine Umgebungsvariablen gesetzt sind (z.B. auf Vercel ohne manuell konfigurierte Vars),
// werden die Projekt-Standardwerte verwendet. Der Anon Key ist ein öffentlicher Schlüssel
// und sicher für Client-seitigen Code (Supabase Row-Level Security schützt die Daten).
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://dphhqwisluirihmahyee.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaGhxd2lzbHVpcmlobWFoeWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3Njc0MDEsImV4cCI6MjA5MDM0MzQwMX0.Cdzb02RCqguPpEjkh3AI3-didfTb6gAYwg4gYylazak';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
