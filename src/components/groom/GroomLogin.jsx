
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function GroomLogin() {
  const navigate = useNavigate();

  // بيانات نموذج تسجيل الدخول
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // حالات التحميل ورسائل الخطأ
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // تسجيل الدخول والتحقق من صلاحية العريس
  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      // التحقق من البريد الإلكتروني وكلمة المرور عبر Supabase
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError("تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.");
        return;
      }
const { data: { user }, error: userError } =
  await supabase.auth.getUser();

console.log("Current user ID:", user?.id);
console.log("User error:", userError);
      // التأكد من أن الحساب يملك صلاحية العريس
      const { data: isGroom, error: permissionError } =
        await supabase.rpc("is_groom");
            console.log("is_groom result:", isGroom);
            console.log("permission error:", permissionError);
      if (permissionError || isGroom !== true) {
        // إنهاء الجلسة إذا لم يكن الحساب مصرحًا له
        await supabase.auth.signOut();

        setError("هذا الحساب غير مصرح له بالدخول إلى مساحة العريس.");
        return;
      }

      // الانتقال إلى مساحة العريس بعد نجاح التحقق
      navigate("/groom", { replace: true });
    } catch (err) {
      console.error("Groom login error:", err);
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#F8F5F0] px-6 py-16 text-[#252525]"
    >
      <section className="w-full max-w-md border border-[#252525]/10 bg-white p-8 md:p-10">
        <p className="text-sm tracking-[0.2em] text-[#C9A96E]">
          17 — البداية
        </p>

        <h1 className="mt-6 text-3xl font-light">
          مساحة العريس
        </h1>

        <p className="mt-4 leading-loose text-gray-600">
          سجّل الدخول للوصول إلى مساحة الذكريات الخاصة بك.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="groom-email"
              className="mb-2 block text-sm"
            >
              البريد الإلكتروني
            </label>

            <input
              id="groom-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 bg-white p-3 outline-none focus:border-[#C9A96E]"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="groom-password"
              className="mb-2 block text-sm"
            >
              كلمة المرور
            </label>

            <input
              id="groom-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 bg-white p-3 outline-none focus:border-[#C9A96E]"
              placeholder="أدخل كلمة المرور"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="text-sm leading-loose text-red-600"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#171717] p-4 text-white transition hover:bg-[#C9A96E] hover:text-black disabled:opacity-50"
          >
            {loading ? "جارٍ التحقق..." : "تسجيل الدخول"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default GroomLogin;
