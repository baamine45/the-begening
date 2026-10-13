
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("baamine45@gmail.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // تسجيل الدخول بالبريد وكلمة المرور
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage("تعذر تسجيل الدخول: " + error.message);
        return;
      }

      // التأكد من صلاحية الحساب بعد تسجيل الدخول
      const { data: allowed, error: adminError } =
        await supabase.rpc("is_admin");

      if (adminError) {
        setMessage("تعذر التحقق من صلاحية المشرف: " + adminError.message);
        await supabase.auth.signOut();
        return;
      }

      if (allowed !== true) {
        setMessage("هذا الحساب ليس مسجلًا كمشرف.");
        await supabase.auth.signOut();
        return;
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setMessage("حدث خطأ غير متوقع: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // إرسال رابط إعادة تعيين كلمة المرور إلى البريد
  async function handlePasswordReset() {
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/admin-reset-password`,
        }
      );

      if (error) {
        setMessage("تعذر إرسال رابط الاستعادة: " + error.message);
        return;
      }

      setMessage("إذا كان البريد صحيحًا، فستصلك رسالة لاستعادة كلمة المرور.");
    } catch (err) {
      setMessage("حدث خطأ: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#171717] px-4 text-white"
    >
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8"
      >
        <p className="text-sm tracking-widest text-[#C9A96E]">
          17 — THE BEGINNING
        </p>

        <h1 className="text-3xl font-light">دخول المشرف</h1>

        <div>
          <label htmlFor="admin-email" className="mb-2 block">
            البريد الإلكتروني
          </label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-xl bg-white p-3 text-black"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="mb-2 block">
            كلمة المرور
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-xl bg-white p-3 text-black"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#C9A96E] p-3 text-black disabled:opacity-50"
        >
          {loading ? "جارٍ التحقق..." : "تسجيل الدخول"}
        </button>

        <button
          type="button"
         onClick={handlePasswordReset}
             disabled={loading || !email.trim()}
         className="w-full text-sm text-[#C9A96E] underline disabled:opacity-50"
        >
                  نسيت كلمة المرور؟
            </button>

        {message && (
          <p role="alert" className="text-sm leading-loose text-red-300">
            {message}
          </p>
        )}

      </form>
    </main>
  );
}

export default AdminLogin;
