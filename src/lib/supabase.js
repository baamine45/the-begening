
import { createClient } from "@supabase/supabase-js";

// قراءة رابط مشروع Supabase من ملف البيئة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// قراءة المفتاح العام للمشروع من ملف البيئة
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// التحقق من وجود بيانات الاتصال قبل إنشاء العميل
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "بيانات Supabase ناقصة. تحقق من ملف .env"
  );
}

// إنشاء الاتصال مع Supabase
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);
