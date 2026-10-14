
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// تحميل صفحات العريس عند فتحها فقط
const GroomDashboard = lazy(() =>
  import("./components/groom/GroomDashboard")
);
const AdminDashboard = lazy(() =>
  import("./components/admin/AdminDashboard")
);
const GroomLogin = lazy(() =>
  import("./components/groom/GroomLogin")
);

// تحميل صفحات المشرف عند الحاجة
const TimelineAdmin = lazy(() =>
  import("./components/admin/TimelineAdmin")
);

const AdminLogin = lazy(() =>
  import("./components/admin/AdminLogin")
);

const AdminResetPassword = lazy(() =>
  import("./components/admin/AdminResetPassword")
);

const ContributionsAdmin = lazy(() =>
  import("./components/admin/ContributionsAdmin")
);


import Hero from "./components/home/Hero";
import MemoryIntro from "./components/home/MemoryIntro";
// تحميل أقسام الصفحة الرئيسية عند الحاجة
const Timeline = lazy(() =>
  import("./components/home/Timeline")
);

const GroomJourney = lazy(() =>
  import("./components/home/GroomJourney")
);

const Countdown = lazy(() =>
  import("./components/home/Countdown")
);

const Messages = lazy(() =>
  import("./components/home/Messages")
);

const AudioMessages = lazy(() =>
  import("./components/home/AudioMessages")
);

const ParticipationForm = lazy(() =>
  import("./components/participation/ParticipationForm")
);

function App() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // حالة المستخدم ونافذة تسجيل الدخول
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showParticipation, setShowParticipation] = useState(false);

  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [sending, setSending] = useState(false);

  // جلب بيانات المناسبة والتحقق من جلسة المستخدم
  useEffect(() => {
    let mounted = true;

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, groom_name, bride_name, event_date")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error("Event fetch error:", error);
        setError("تعذر تحميل بيانات المناسبة.");
      } else {
        setEvent(data);
      }

      setLoading(false);
    };

    fetchEvent();

    // استعادة جلسة تسجيل الدخول بعد العودة من البريد
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.error("Session error:", error);
        return;
      }

      const currentUser = data.session?.user ?? null;
      setUser(currentUser);

      // إذا عاد المستخدم بعد طلب المشاركة، نعرض الاستمارة
      if (
        currentUser &&
        localStorage.getItem("17_open_participation") === "true"
      ) {
        setShowParticipation(true);
        setShowLogin(false);
        localStorage.removeItem("17_open_participation");
      }
    });

    // متابعة الدخول والخروج
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((authEvent, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (
        currentUser &&
        localStorage.getItem("17_open_participation") === "true"
      ) {
        setShowParticipation(true);
        setShowLogin(false);
        localStorage.removeItem("17_open_participation");
      }

      if (authEvent === "SIGNED_OUT") {
        setShowParticipation(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // فتح مسار المشاركة
  const handleParticipationClick = () => {
    if (user) {
      setShowParticipation(true);
      return;
    }

    // تذكّر رغبة الزائر في المشاركة حتى يعود من البريد
    localStorage.setItem("17_open_participation", "true");
    setAuthMessage("");
    setShowLogin(true);
  };

  // إرسال رابط الدخول بالبريد الإلكتروني
  const sendMagicLink = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setAuthMessage("من فضلك أدخل بريدك الإلكتروني.");
      return;
    }

    setSending(true);
    setAuthMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

     
if (error) {
  // إظهار تفاصيل الخطأ في Console
  console.error("Login error:", error);

  // عرض رسالة Supabase الأصلية لتحديد السبب
  setAuthMessage(
    `تعذر إرسال الرابط: ${error.message}`
  );

  return;
}


      setAuthMessage(
        "تم إرسال رابط الدخول إلى بريدك. افتحه للعودة إلى المشاركة."
      );
    } catch (err) {
      console.error("Unexpected login error:", err);
      setAuthMessage("حدث خطأ غير متوقع أثناء إرسال الرابط.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#F8F5F0]"
      >
        جاري تحميل الذكريات...
      </main>
    );
  }

  if (error || !event) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#F8F5F0]"
      >
        {error || "لم يتم العثور على المناسبة."}
      </main>
    );
  }

  return (
    
   
     <BrowserRouter>
  <Suspense
    fallback={
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#F8F5F0] text-[#252525]"
      >
        جارٍ تحميل الصفحة...
      </main>
    }
  >
    <Routes>
           <Route path="/groom-login" element={<GroomLogin />} />
          <Route path="/groom" element={<GroomDashboard />} />
          <Route path="/admin-login" element={<AdminLogin />} />
           {/* الصفحة الرئيسية لإدارة المشروع */}
<Route path="/admin" element={<AdminDashboard />} />

{/* إدارة ذكريات الخط الزمني وصورها */}
<Route path="/admin/timeline" element={<TimelineAdmin />} />
          <Route path="/admin-reset-password" element={<AdminResetPassword />}/>
          <Route path="/admin/contributions" element={<ContributionsAdmin />}/>
      <Route
        path="*"
        element={
          <main dir="rtl">

      {/* أقسام الاحتفال متاحة للجميع */}
      <Hero event={event} />
      <MemoryIntro />
     <Suspense
  fallback={
    <div className="py-10 text-center text-gray-500">
      جارٍ تحميل الذكريات...
    </div>
  }
>
  <Timeline />
</Suspense>
      <Suspense
  fallback={
    <div className="py-10 text-center text-gray-500">
      جارٍ تحميل الذكريات...
    </div>
  }
>
  <GroomJourney />
</Suspense>
      <Suspense fallback={<div className="py-8" />}>
  <Countdown event={event} />
</Suspense>
      <Suspense
  fallback={
    <div className="py-10 text-center text-gray-500">
      جارٍ تحميل الرسائل...
    </div>
  }
>
  <Messages />
</Suspense>
    <Suspense
  fallback={
    <div className="py-10 text-center text-gray-400">
      جارٍ تحميل التسجيلات الصوتية...
    </div>
  }
>
  <AudioMessages />
</Suspense>

      {/* دعوة المشاركة */}
      {!showParticipation && (
        <section
          id="participation"
          className="bg-[#171717] px-6 py-20 text-center text-white"
        >
          <p className="mb-4 text-[#C9A96E]">
            17 — البداية
          </p>

          <h2 className="mb-6 text-3xl font-light md:text-4xl">
            كن جزءًا من البداية
          </h2>

          <p className="mx-auto mb-4 max-w-2xl leading-loose text-gray-300">
            بعض الكلمات تبقى في الذاكرة، وبعض الذكريات تستحق أن تصل إلى أصحابها.
          </p>

          <p className="mx-auto mb-8 max-w-2xl leading-loose text-gray-300">
            إذا أردت أن تكون جزءًا من بداية عبد الله ومريم،
            سجّل ببريدك الإلكتروني لتصل مشاركتك إلى العريس
            وتصبح جزءًا من هذه الذكرى.
          </p>

          <button
            type="button"
            onClick={handleParticipationClick}
            className="rounded-full bg-[#C9A96E] px-8 py-4 font-medium text-black transition hover:bg-white"
          >
            سجّل لتكون جزءًا من البداية
          </button>
        </section>
      )}

      {/* نافذة تسجيل الدخول */}
      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowLogin(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            className="w-full max-w-md rounded-2xl bg-[#F8F5F0] p-6 text-[#252525] shadow-2xl md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex justify-between">
              <span className="text-sm tracking-widest text-[#C9A96E]">
                17 — THE BEGINNING
              </span>

              <button
                type="button"
                aria-label="إغلاق النافذة"
                onClick={() => setShowLogin(false)}
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <h2
              id="login-title"
              className="mb-4 text-center text-2xl font-light"
            >
              كن جزءًا من هذه الذكرى
            </h2>

            <p className="mb-6 text-center text-sm leading-loose text-gray-600">
              أدخل بريدك الإلكتروني لنرسل إليك رابط الدخول،
              ثم أكمل مشاركتك.
            </p>

            <form onSubmit={sendMagicLink} className="space-y-4">
              <label htmlFor="participation-email" className="block text-sm">
                البريد الإلكتروني
              </label>

              <input
                id="participation-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-[#C9A96E]"
              />

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-[#171717] p-3 text-white transition hover:bg-[#C9A96E] hover:text-black disabled:opacity-50"
              >
                {sending ? "جارٍ إرسال الرابط..." : "إرسال رابط الدخول"}
              </button>
            </form>

            {authMessage && (
              <p
                role="status"
                aria-live="polite"
                className="mt-4 text-center text-sm leading-loose text-gray-700"
              >
                {authMessage}
              </p>
            )}

            <p className="mt-5 text-center text-xs text-gray-500">
              ستعود إلى الموقع بعد تأكيد بريدك الإلكتروني.
            </p>
          </section>
        </div>
      )}

      {/* لا تظهر استمارة المشاركة إلا بعد تسجيل الدخول وطلب المشاركة */}
     
     {showParticipation && user && (
  <Suspense
    fallback={
      <div className="py-10 text-center text-gray-500">
        جارٍ تحميل استمارة المشاركة...
      </div>
    }
  >
    <ParticipationForm event={event} />
  </Suspense>
)}
          </main>
        }
      />
        </Routes>
  </Suspense>
</BrowserRouter>
  );
}


export default App;
