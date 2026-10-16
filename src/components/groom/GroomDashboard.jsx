
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function GroomDashboard() {
  const navigate = useNavigate();

  // ============================================
  // 1. حالات التحقق من صلاحية العريس
  // ============================================
  const [checking, setChecking] = useState(true);
  const [isGroom, setIsGroom] = useState(false);
  const [error, setError] = useState("");

  // حالة تسجيل الخروج
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  // ============================================
  // 2. حالات الرسائل المعتمدة
  // ============================================
  const [messages, setMessages] = useState([]);
  // نص البحث عن رسالة أو اسم صاحبها
const [searchTerm, setSearchTerm] = useState("");

// تصفية الرسائل حسب الخصوصية
const [visibilityFilter, setVisibilityFilter] = useState("all");
  // إحصائيات المساهمات المعتمدة المعروضة للعريس
const totalMessages = messages.length;

const publicMessagesCount = messages.filter(
  (item) => item.visibility === "public"
).length;

const privateMessagesCount = messages.filter(
  (item) => item.visibility !== "public"
).length;
// الرسائل المطابقة للبحث والتصفية
const filteredMessages = messages.filter((item) => {
  const search = searchTerm.trim().toLowerCase();

  // البحث في اسم المشارك ونص الرسالة والذكرى
  const matchesSearch =
    !search ||
    [
      item.contributors?.name,
      item.message,
      item.memory,
    ].some((value) =>
      String(value || "").toLowerCase().includes(search)
    );

  // تحديد ما إذا كانت الرسالة عامة أو خاصة
  const matchesVisibility =
    visibilityFilter === "all" ||
    (visibilityFilter === "public"
      ? item.visibility === "public"
      : item.visibility !== "public");

  return matchesSearch && matchesVisibility;
});
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState("");

  // ============================================
  // 3. حالات تغيير خصوصية الرسائل
  // ============================================
  const [updatingMessageId, setUpdatingMessageId] =
    useState(null);

  const [visibilityMessage, setVisibilityMessage] =
    useState("");

  // ============================================
  // 4. تسجيل الخروج
  // ============================================
  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      // إنهاء جلسة المستخدم في Supabase
      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        console.error("Logout error:", signOutError);
        setLogoutError("تعذر تسجيل الخروج. حاول مرة أخرى.");
        return;
      }

      // العودة إلى صفحة تسجيل الدخول
      navigate("/groom-login", { replace: true });
    } catch (err) {
      console.error("Unexpected logout error:", err);
      setLogoutError("حدث خطأ غير متوقع أثناء تسجيل الخروج.");
    } finally {
      setLoggingOut(false);
    }
  };

  // ============================================
  // 5. جلب بيانات مساحة العريس
  // ============================================
  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setChecking(true);
      setError("");

      try {
        // التأكد من وجود مستخدم مسجل الدخول
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (mounted) {
            setIsGroom(false);
            setChecking(false);
            setMessagesLoading(false);
          }
          return;
        }

        // التحقق من صلاحية العريس في قاعدة البيانات
        const {
          data: permission,
          error: permissionError,
        } = await supabase.rpc("is_groom");

        if (permissionError) {
          console.error(
            "Groom permission error:",
            permissionError
          );

          if (mounted) {
            setError("تعذر التحقق من صلاحيات الحساب.");
            setIsGroom(false);
            setChecking(false);
            setMessagesLoading(false);
          }
          return;
        }

        if (!mounted) return;

        setIsGroom(permission === true);
        setChecking(false);

        // لا نجلب الرسائل إذا لم يكن الحساب مصرحًا له
        if (permission !== true) {
          setMessagesLoading(false);
          return;
        }

        // جلب الرسائل المعتمدة فقط
        setMessagesLoading(true);
        setMessagesError("");

        const {
          data: approvedMessages,
          error: fetchError,
        } = await supabase
          .from("contributions")

.select(`
  id,
  message,
  memory,
  photo_url,
  audio_url,
  created_at,
  visibility,
  contributors (
    name
  )
`)

          .eq("status", "approved")
          .order("created_at", { ascending: false });

        if (!mounted) return;


if (fetchError) {
  console.error("Messages fetch error:", fetchError);
  setMessagesError("تعذر تحميل الرسائل المعتمدة.");
} else {
  // إنشاء روابط مؤقتة للصور والتسجيلات الصوتية
  const messagesWithMedia = await Promise.all(
    (approvedMessages || []).map(async (item) => {
      let photoSignedUrl = null;
      let audioSignedUrl = null;

      // إنشاء رابط مؤقت للصورة إن وجدت
      if (item.photo_url) {
        const { data, error } = await supabase.storage
          .from("contribution-media")
          .createSignedUrl(item.photo_url, 3600);
          console.log("اختبار رابط الصورة:", {
  path: item.photo_url,
  error: error?.message,
  urlCreated: Boolean(data?.signedUrl),
});
        if (error) {
          console.error("خطأ رابط الصورة:", error);
        } else {
          photoSignedUrl = data.signedUrl;
        }
      }

      // إنشاء رابط مؤقت للصوت إن وجد
      if (item.audio_url) {
        const { data, error } = await supabase.storage
          .from("contribution-media")
          .createSignedUrl(item.audio_url, 3600);

        if (error) {
          console.error("خطأ رابط الصوت:", error);
        } else {
          audioSignedUrl = data.signedUrl;
        }
      }

      return {
        ...item,
        photoSignedUrl,
        audioSignedUrl,
      };
    })
  );

  setMessages(messagesWithMedia);
}


        setMessagesLoading(false);
      } catch (err) {
        console.error("Dashboard error:", err);

        if (mounted) {
          setError("حدث خطأ أثناء تحميل مساحة العريس.");
          setChecking(false);
          setMessagesLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================
  // 6. تغيير خصوصية الرسالة
  // ============================================
  const changeVisibility = async (messageId, newVisibility) => {
    // منع الضغط المتكرر أثناء تنفيذ العملية
    if (updatingMessageId !== null) return;

    setUpdatingMessageId(messageId);
    setVisibilityMessage("");

    try {
      // تنفيذ التغيير من خلال وظيفة Supabase الآمنة
      const { data, error: updateError } = await supabase.rpc(
        "set_contribution_visibility",
        {
          p_contribution_id: messageId,
          p_visibility: newVisibility,
        }
      );

      if (updateError) {
        console.error("Visibility update error:", updateError);
        setVisibilityMessage("تعذر تغيير خصوصية الرسالة.");
        return;
      }

      // التحقق من تحديث الرسالة بنجاح
      if (data !== true) {
        setVisibilityMessage(
          "لم يتم العثور على رسالة معتمدة لتحديثها."
        );
        return;
      }

      // تحديث الواجهة دون إعادة تحميل الصفحة
      setMessages((currentMessages) =>
        currentMessages.map((item) =>
          item.id === messageId
            ? { ...item, visibility: newVisibility }
            : item
        )
      );

      setVisibilityMessage(
        newVisibility === "public"
          ? "أصبحت الرسالة متاحة للزوار."
          : "أصبحت الرسالة خاصة."
      );
    } catch (err) {
      console.error("Unexpected visibility error:", err);
      setVisibilityMessage(
        "حدث خطأ غير متوقع أثناء تحديث الرسالة."
      );
    } finally {
      setUpdatingMessageId(null);
    }
  };

  // ============================================
  // 7. شاشة التحقق من الصلاحية
  // ============================================
  if (checking) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#F8F5F0] px-6 py-24 text-center text-[#252525]"
      >
        <p>جارٍ التحقق من الصلاحيات...</p>
      </main>
    );
  }

  // ============================================
  // 8. منع الوصول لغير العريس
  // ============================================
  if (!isGroom) {
    return (
     <main
  dir="rtl"
  className="min-h-screen bg-[#F8F5F0] px-4 py-10 text-[#252525] sm:px-6 sm:py-16 lg:py-24"
>
        <h1 className="text-3xl font-light">
          هذه الصفحة مخصصة للعريس
        </h1>

        <p className="mt-4 text-gray-600">
          سجّل الدخول بالحساب المصرح له للوصول إلى هذه المساحة.
        </p>

        {error && (
          <p role="alert" className="mt-4 text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => navigate("/groom-login", { replace: true })}
          className="mt-6 border border-[#252525]/20 px-5 py-3 text-sm transition hover:bg-[#C9A96E] hover:text-white"
        >
          الذهاب إلى تسجيل الدخول
        </button>
      </main>
    );
  }

  // ============================================
  // 9. مساحة العريس
  // ============================================
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#fffdf8] via-[#F8F5F0] to-[#f0e8da] px-4 py-8 text-[#252525] sm:px-6 sm:py-12 lg:py-16"
    >
      <div className="mx-auto max-w-5xl">
        {/* شريط التنقل: العودة إلى الصفحة الرئيسية أو تسجيل الخروج */}
        <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9A96E]/20 bg-white/80 p-3 shadow-sm backdrop-blur sm:p-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 rounded-xl border border-[#C9A96E]/40 px-4 py-2.5 text-sm text-[#765821] transition hover:border-[#C9A96E] hover:bg-[#C9A96E]/10 focus:outline-none focus:ring-2 focus:ring-[#C9A96E]/40"
          >
            <span aria-hidden="true">←</span>
            العودة إلى الصفحة الرئيسية
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl border border-[#252525]/15 px-4 py-2.5 text-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
          </button>
        </nav>

        {logoutError && (
          <p
            role="alert"
            className="mb-6 text-sm leading-loose text-red-600"
          >
            {logoutError}
          </p>
        )}

        <header className="relative overflow-hidden rounded-3xl border border-[#C9A96E]/25 bg-white/80 px-6 py-10 shadow-sm sm:px-10 sm:py-14">
          <div aria-hidden="true" className="absolute -left-8 -top-12 h-40 w-40 rounded-full border border-[#C9A96E]/20" />
          <div aria-hidden="true" className="absolute -left-2 -top-6 h-28 w-28 rounded-full border border-[#C9A96E]/20" />
          <p className="relative text-xs font-medium tracking-[0.25em] text-[#9A793F] sm:text-sm">
            17 — البداية
          </p>

          <h1 className="relative mt-4 text-4xl font-light leading-tight text-[#252525] sm:text-5xl md:text-6xl">
            مساحة العريس
          </h1>

          <div className="mt-5 h-px w-20 bg-[#C9A96E]" />
          <p className="relative mt-5 max-w-2xl text-base leading-loose text-gray-600 sm:text-lg">
          بعض الكلمات تستحق أن تصل في وقتها المناسب،
          وبعض الذكريات تصبح أجمل حين نكتشفها معًا.
          </p>
          <p className="relative mt-6 text-sm text-[#9A793F]">17 أكتوبر 2026 · يوم تُروى فيه الحكايات الجميلة</p>
        </header>

        {/* ملخص المساهمات */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
  <div className="rounded-2xl border border-[#252525]/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <p className="text-sm text-gray-500">إجمالي الرسائل المعتمدة</p>
    <p className="mt-3 text-3xl font-light">
      {totalMessages}
    </p>
  </div>

  <div className="rounded-2xl border border-[#252525]/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <p className="text-sm text-gray-500">متاحة للزوار</p>
    <p className="mt-3 text-3xl font-light text-green-700">
      {publicMessagesCount}
    </p>
  </div>

  <div className="rounded-2xl border border-[#252525]/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <p className="text-sm text-gray-500">رسائل خاصة</p>
    <p className="mt-3 text-3xl font-light text-[#9A6B22]">
      {privateMessagesCount}
    </p>
  </div>
</div>
        <section className="mt-8 rounded-3xl border border-[#C9A96E]/20 bg-white p-5 shadow-sm sm:p-8 md:p-10">
          <p className="mb-4 text-sm tracking-widest text-[#C9A96E]">
            من الأحبة
          </p>

          <h2 className="text-2xl font-light md:text-3xl">
            كلمات وذكريات من الأصدقاء
          </h2>

          <p className="mt-5 leading-loose text-gray-600">
            نجمع هنا الكلمات الجميلة والذكريات التي أراد
            أصدقاؤك أن يشاركوها معك، لتكون جزءًا من فرحة
            هذا اليوم وبداية فصل جديد من حياتك.
          </p>

{/* البحث والتصفية */}
<div className="mt-8 grid gap-4 sm:grid-cols-2">
  <div>
    <label
      htmlFor="message-search"
      className="mb-2 block text-sm text-gray-600"
    >
      البحث في المساهمات
    </label>

    <input
      id="message-search"
      type="search"
      value={searchTerm}
      onChange={(event) => setSearchTerm(event.target.value)}
      placeholder="اسم المشارك أو نص الرسالة..."
      className="w-full border border-[#252525]/15 bg-white p-3 outline-none focus:border-[#C9A96E]"
    />
  </div>

  <div>
    <label
      htmlFor="visibility-filter"
      className="mb-2 block text-sm text-gray-600"
    >
      تصفية حسب الخصوصية
    </label>

    <select
      id="visibility-filter"
      value={visibilityFilter}
      onChange={(event) => setVisibilityFilter(event.target.value)}
      className="w-full border border-[#252525]/15 bg-white p-3 outline-none focus:border-[#C9A96E]"
    >
      <option value="all">جميع الرسائل</option>
      <option value="public">المتاحة للزوار</option>
      <option value="private">الرسائل الخاصة</option>
    </select>
  </div>
</div>

          {/* نتيجة آخر عملية لتغيير الخصوصية */}
          {visibilityMessage && (
            <p
              role="status"
              aria-live="polite"
              className="mt-6 text-sm leading-loose text-gray-600"
            >
              {visibilityMessage}
            </p>
          )}

          {/* حالة تحميل الرسائل */}
          {messagesLoading ? (
            <p className="mt-8 text-gray-500">
              نهيّئ هذه المساحة للذكريات الجميلة...
            </p>
          ) : messagesError ? (
            <p role="alert" className="mt-8 text-red-600">
              تعذّر تحميل المحتوى الآن. يرجى المحاولة لاحقًا.
            </p>

) : messages.length === 0 ? (
  <div className="mt-8 border border-[#252525]/10 px-6 py-10 text-center">
    <p className="text-lg font-light">
      لكل ذكرى وقتها الجميل
    </p>

    <p className="mt-3 leading-loose text-gray-500">
      هذه المساحة تنتظر الكلمات التي ستجعل
      من 17 أكتوبر يومًا لا يُنسى.
    </p>
  </div>
) : filteredMessages.length === 0 ? (
  <div className="mt-8 border border-[#252525]/10 bg-white px-6 py-10 text-center">
    <p className="text-lg font-light">
      لا توجد نتائج مطابقة
    </p>

    <p className="mt-3 leading-loose text-gray-500">
      جرّب تغيير كلمة البحث أو اختيار تصفية مختلفة.
    </p>

    <button
      type="button"
      onClick={() => {
        setSearchTerm("");
        setVisibilityFilter("all");
      }}
      className="mt-5 border border-[#252525]/20 px-5 py-3 text-sm transition hover:bg-[#C9A96E] hover:text-white"
    >
      عرض جميع الرسائل
    </button>
  </div>
) : (
  <div className="mt-8 space-y-6">

              {filteredMessages.map((item) => {
                // هل يجري تحديث هذه الرسالة؟
                const isUpdating = updatingMessageId === item.id;

                // هل الرسالة متاحة للزوار؟
                const isPublic = item.visibility === "public";

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-[#252525]/10 bg-gradient-to-br from-white to-[#fffdf8] p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#C9A96E]/40 hover:shadow-md sm:p-7"
                  >

{/* رأس البطاقة: اسم المشارك وتاريخ المساهمة */}
<div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#252525]/10 pb-5">
  <div>
    <p className="mb-2 text-xs text-gray-500">
      مساهمة من
    </p>

    <h3 className="text-lg font-medium text-[#252525]">
      {item.contributors?.name || "من أحد الأصدقاء"}
    </h3>

    <p className="mt-2 text-xs text-gray-500">
      {item.created_at
        ? new Date(item.created_at).toLocaleDateString("ar")
        : ""}
    </p>
  </div>

  <span
    className={`rounded-full px-3 py-1.5 text-xs ${
      item.visibility === "public"
        ? "bg-green-50 text-green-700"
        : "bg-amber-50 text-amber-800"
    }`}
  >
    {item.visibility === "public"
      ? "متاحة للزوار"
      : "رسالة خاصة"}
  </span>
</div>

                    <div className="mb-5 text-3xl text-[#C9A96E]">
                      “
                    </div>

                    <p className="whitespace-pre-line leading-loose text-[#444]">
                      {item.message}
                    </p>

                    {item.memory && (
                      <div className="mt-5 border-r-2 border-[#C9A96E] pr-4">
                        <p className="mb-2 text-sm text-[#C9A96E]">
                          ذكرى من الماضي
                        </p>

                        <p className="whitespace-pre-line leading-loose text-gray-600">
                          {item.memory}
                        </p>
                      </div>
                    )}

{/* عرض الصورة المرفقة */}


{/* عرض الصورة المرفقة */}
{item.photoSignedUrl && (
  <div className="mt-6 rounded-xl border border-[#252525]/10 bg-[#F8F5F0] p-4">
    <p className="mb-4 text-sm font-medium text-[#9A793F]">
      الصورة المرفقة
    </p>

    <a
      href={item.photoSignedUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="فتح الصورة بحجمها الكامل"
      className="block overflow-hidden rounded-lg"
    >
      <img
        src={item.photoSignedUrl}
        alt="صورة من إحدى الذكريات"
        className="max-h-[420px] w-full rounded-lg object-contain"
        loading="lazy"
      />
    </a>

    <p className="mt-3 text-xs text-gray-500">
      اضغط على الصورة لفتحها بحجمها الكامل.
    </p>
  </div>
)}


{/* مشغّل التسجيل الصوتي */}

{/* مشغّل التسجيل الصوتي */}
{item.audioSignedUrl && (
  <div className="mt-6 rounded-xl border border-[#252525]/10 bg-[#F8F5F0] p-4">
    <p className="mb-4 text-sm font-medium text-[#9A793F]">
      التسجيل الصوتي
    </p>

    <audio
      controls
      preload="metadata"
      src={item.audioSignedUrl}
      className="w-full"
    >
      متصفحك لا يدعم تشغيل الصوت.
    </audio>

    <p className="mt-3 text-xs text-gray-500">
      يمكنك الاستماع إلى التسجيل مباشرةً من هنا.
    </p>
  </div>
)}



                    {/* حالة الخصوصية وأزرار التحكم */}
                    <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-500">
                        {isPublic
                          ? "هذه الرسالة متاحة للزوار"
                          : "هذه الرسالة خاصة بك"}
                      </p>

                      <button
                        type="button"
                        disabled={
                          isUpdating || updatingMessageId !== null
                        }
                        onClick={() =>
                          changeVisibility(
                            item.id,
                            isPublic ? "private" : "public"
                          )
                        }
                        className={`w-full px-5 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                          isPublic
                            ? "border border-[#252525]/20 text-[#444] hover:bg-[#F8F5F0]"
                            : "bg-[#C9A96E] text-white hover:bg-[#B5965C]"
                        }`}
                      >
                        {isUpdating
                          ? "جارٍ التحديث..."
                          : isPublic
                            ? "إخفاء عن الزوار"
                            : "إتاحة للزوار"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-8 rounded-2xl border border-[#C9A96E]/20 bg-white/60 px-5 py-6 text-center text-sm leading-loose text-gray-500">
          الذكريات الجميلة لا تُقاس بعددها، بل بالأثر الذي تتركه في القلب.
        </p>
      </div>
    </main>
  );
}

export default GroomDashboard;
