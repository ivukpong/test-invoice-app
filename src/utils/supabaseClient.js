// src/utils/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tafibcweszimipvhytft.supabase.co";
// import.meta.env.SUPABASE_URL || import.meta.env.SUPABASE_URL;
const supabaseKey = "sb_publishable_OhaN625nEpxWFtTN2a3xhw_darbm-fN";
// import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
//   import.meta.env.SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
