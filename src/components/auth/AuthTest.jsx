
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function AuthTest() {
  // معلومات المستخدم وحالة النموذج
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // مراقبة حالة تسجيل الدخول عند فتح الصفحة
  useEffect(() => {
    let mounted = true;

    // الاستماع لتسجيل الدخول والخروج
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
      }
    });

    // التحقق من وجود جلسة سابقة
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Session Error:", error);
        setMessage("تعذر التحقق من جلسة تسجيل الدخول.");
        return;
      }

      setUser(data.session?.user ?? null);
    };

    checkSession();

    // إيقاف الاستماع عند مغادرة الصفحة
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // إرسال رابط الدخول إلى البريد الإلكتروني
  const sendMagicLink = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setMessage("من فضلك أدخل بريدك الإلكتروني.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error("Email Login Error:", error);
        setMessage("تعذر إرسال الرابط: " + error.message);
        return;
      }

      setMessage(
        "تم إرسال رابط الدخول. افتح بريدك الإلكتروني واضغط على الرابط."
      );
    } catch (error) {
      console.error("Unexpected Email Error:", error);
      setMessage("حدث خطأ غير متوقع أثناء إرسال الرابط.");
    } finally {
      setLoading(false);
    }
  };

  // إنشاء سجل المساهم أو التحقق من وجوده
  const createContributor = async (event) => {
    event.preventDefault();

    if (!user) {
      setMessage("يرجى تسجيل الدخول أولًا.");
      return;
    }

    if (!name.trim()) {
      setMessage("من فضلك أدخل اسمك.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // البحث عن سجل مرتبط بحساب المستخدم الحالي
      const { data: existingContributor, error: searchError } =
        await supabase
          .from("contributors")
          .select("*")
          .eq("auth_user_id", user.id)
          .maybeSingle();

      // إظهار تفاصيل الخطأ في Console لتشخيص المشكلة
      if (searchError) {
        console.error("Search Contributor Error:", searchError);
        console.error("Error code:", searchError.code);
        console.error("Error details:", searchError.details);

        setMessage(
          `فشل البحث عن السجل: ${searchError.message} (الرمز: ${
            searchError.code || "غير متوفر"
          })`
        );
        return;
      }

      // إذا كان السجل موجودًا، فلا ننشئ سجلًا مكررًا
      if (existingContributor) {
        setMessage(
          "لديك سجل مسجل بالفعل. لم ننشئ سجلًا جديدًا."
        );
        return;
      }

      // إنشاء سجل جديد مرتبط بالمستخدم المسجل دخوله
      const { error: insertError } = await supabase
        .from("contributors")
        .insert({
          auth_user_id: user.id,
          name: name.trim(),
        });

      if (insertError) {
        console.error("Insert Contributor Error:", insertError);
        console.error("Error code:", insertError.code);
        console.error("Error details:", insertError.details);

        setMessage(
          `فشل حفظ الاسم: ${insertError.message} (الرمز: ${
            insertError.code || "غير متوفر"
          })`
        );
        return;
      }

      setMessage("تم حفظ اسمك بنجاح!");
    } catch (error) {
      console.error("Unexpected Contributor Error:", error);
      setMessage("حدث خطأ غير متوقع. راجع Console في المتصفح.");
    } finally {
      setLoading(false);
    }
  };

  // تسجيل الخروج
  const logout = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout Error:", error);
        setMessage("تعذر تسجيل الخروج: " + error.message);
        return;
      }

      setUser(null);
      setName("");
      setMessage("تم تسجيل الخروج بنجاح.");
    } catch (error) {
      console.error("Unexpected Logout Error:", error);
      setMessage("حدث خطأ أثناء تسجيل الخروج.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      dir="rtl"
      className="mx-auto my-8 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-xl font-bold text-gray-800">
        المشاركة في 17 — البداية
      </h2>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg bg-gray-100 p-3 text-sm text-gray-700"
        >
          {message}
        </p>
      )}

      {!user ? (
        // نموذج تسجيل الدخول للزائر
        <form onSubmit={sendMagicLink} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            البريد الإلكتروني
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@email.com"
            required
            className="w-full rounded-lg border border-gray-300 p-3"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gray-900 p-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "جارٍ الإرسال..." : "إرسال رابط الدخول"}
          </button>
        </form>
      ) : (
        // نموذج المستخدم بعد تسجيل الدخول
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            تم تسجيل الدخول بالبريد:
          </p>

          <p className="break-all font-medium text-gray-800">
            {user.email}
          </p>

          <form onSubmit={createContributor} className="space-y-3">
            <label
              htmlFor="contributor-name"
              className="block text-sm font-medium text-gray-700"
            >
              الاسم الذي سيظهر في المشاركة
            </label>

            <input
              id="contributor-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="اكتب اسمك"
              required
              className="w-full rounded-lg border border-gray-300 p-3"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gray-900 p-3 font-medium text-white disabled:opacity-50"
            >
              {loading ? "جارٍ الحفظ..." : "حفظ الاسم"}
            </button>
          </form>

          <button
            type="button"
            onClick={logout}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 p-3 text-gray-700 disabled:opacity-50"
          >
            تسجيل الخروج
          </button>
        </div>
      )}
    </section>
  );
}

export default AuthTest;
