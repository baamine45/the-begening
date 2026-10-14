import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  // التحقق من تسجيل الدخول وصلاحية المشرف
  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      try {
        const { data, error: userError } =
          await supabase.auth.getUser();

        if (userError || !data.user) {
          navigate("/admin-login", { replace: true });
          return;
        }

        const { data: allowed, error: adminError } =
          await supabase.rpc("is_admin");

        if (adminError) {
          throw adminError;
        }

        if (allowed !== true) {
          await supabase.auth.signOut();
          navigate("/admin-login", { replace: true });
          return;
        }
      } catch (err) {
        console.error("خطأ في التحقق من المشرف:", err);

        if (active) {
          setError("تعذر التحقق من صلاحيات المشرف.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkAdmin();

    return () => {
      active = false;
    };
  }, [navigate]);

  // تسجيل الخروج من لوحة المشرف
  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    const { error: logoutError } =
      await supabase.auth.signOut();

    if (logoutError) {
      setError("تعذر تسجيل الخروج. حاول مرة أخرى.");
      setLoggingOut(false);
      return;
    }

    navigate("/admin-login", { replace: true });
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#171717] text-white"
      >
        جارٍ التحقق من صلاحيات المشرف...
      </main>
    );
  }

  if (error && !loggingOut) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#171717] p-6 text-center text-white"
      >
        <div>
          <p role="alert">{error}</p>

          <button
            type="button"
            onClick={() => navigate("/admin-login")}
            className="mt-5 rounded-full bg-[#C9A96E] px-6 py-3 text-black"
          >
            العودة إلى تسجيل الدخول
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#171717] px-5 py-12 text-white md:px-10"
    >
      <header className="mx-auto mb-12 flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-3 text-sm tracking-widest text-[#C9A96E]">
            17 — THE BEGINNING
          </p>

          <h1 className="text-3xl font-light md:text-4xl">
            لوحة إدارة المشروع
          </h1>

          <p className="mt-4 leading-7 text-gray-400">
            من هنا يمكنك إدارة ذكريات المناسبة ومساهمات الأصدقاء.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-full border border-white/20 px-5 py-3 transition hover:bg-white/10"
        >
          عرض الموقع
        </button>
      </header>

      <section className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {/* الانتقال إلى إدارة الذكريات والصور */}
        <button
          type="button"
          onClick={() => navigate("/admin/timeline")}
          className="rounded-2xl border border-white/10 bg-white/5 p-7 text-right transition hover:border-[#C9A96E]/50 hover:bg-white/10 md:p-9"
        >
          <span className="text-3xl" aria-hidden="true">
            📷
          </span>

          <h2 className="mt-5 text-2xl font-light">
            إدارة الذكريات والصور
          </h2>

          <p className="mt-4 leading-7 text-gray-400">
            إضافة ذكريات الخط الزمني، ورفع الصور، وتعديل المحتوى
            ونشره أو إخفاؤه.
          </p>

          <span className="mt-6 inline-block text-[#C9A96E]">
            فتح إدارة الذكريات ←
          </span>
        </button>

        {/* الانتقال إلى مراجعة المساهمات */}
        <button
          type="button"
          onClick={() => navigate("/admin/contributions")}
          className="rounded-2xl border border-white/10 bg-white/5 p-7 text-right transition hover:border-[#C9A96E]/50 hover:bg-white/10 md:p-9"
        >
          <span className="text-3xl" aria-hidden="true">
            💌
          </span>

          <h2 className="mt-5 text-2xl font-light">
            مراجعة مساهمات الأصدقاء
          </h2>

          <p className="mt-4 leading-7 text-gray-400">
            مراجعة الرسائل والصور والتسجيلات الصوتية، ثم اعتماد
            المساهمات أو رفضها.
          </p>

          <span className="mt-6 inline-block text-[#C9A96E]">
            فتح مراجعة المساهمات ←
          </span>
        </button>
      </section>

      {error && (
        <p role="alert" className="mx-auto mt-6 max-w-5xl text-red-300">
          {error}
        </p>
      )}

      <div className="mx-auto mt-12 max-w-5xl border-t border-white/10 pt-6">
        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          className="rounded-full border border-red-400/40 px-5 py-3 text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
        >
          {loggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
        </button>
      </div>
    </main>
  );
}

export default AdminDashboard;