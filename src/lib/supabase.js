import { createClient } from "@supabase/supabase-js";

// قراءة بيانات Supabase من ملف البيئة
// قراءة رابط مشروع Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// قراءة المفتاح العام للمشروع
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// إنشاء اتصال React بمشروع Supabase

// إنشاء الاتصال مع Supabase
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);