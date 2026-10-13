
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
        className="min-h-screen bg-[#F8F5F0] px-6 py-24 text-center text-[#252525]"
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
      className="min-h-screen bg-[#F8F5F0] px-6 py-24 text-[#252525]"
    >
      <div className="mx-auto max-w-5xl">
        {/* زر تسجيل الخروج */}
        <div className="mb-8 flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="border border-[#252525]/20 px-5 py-3 text-sm transition hover:bg-[#C9A96E] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
          </button>
        </div>

        {logoutError && (
          <p
            role="alert"
            className="mb-6 text-sm leading-loose text-red-600"
          >
            {logoutError}
          </p>
        )}

        <p className="text-sm tracking-[0.2em] text-[#C9A96E]">
          17 — البداية
        </p>

        <h1 className="mt-4 text-4xl font-light md:text-5xl">
          مساحة العريس
        </h1>

        <p className="mt-6 max-w-2xl leading-loose text-gray-600">
          بعض الكلمات تستحق أن تصل في وقتها المناسب،
          وبعض الذكريات تصبح أجمل حين نكتشفها معًا.
        </p>

        <section className="mt-12 border border-[#252525]/10 bg-white p-8 md:p-10">
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
          ) : (
            <div className="mt-8 space-y-6">
              {messages.map((item) => {
                // هل يجري تحديث هذه الرسالة؟
                const isUpdating = updatingMessageId === item.id;

                // هل الرسالة متاحة للزوار؟
                const isPublic = item.visibility === "public";

                return (
                  <article
                    key={item.id}
                    className="border border-[#252525]/10 p-6 transition hover:shadow-md"
                  >
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
{item.photoSignedUrl && (
  <div className="mt-5">
    <p className="mb-3 text-sm text-[#C9A96E]">
      الصورة المرفقة
    </p>

    <a
      href={item.photoSignedUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        src={item.photoSignedUrl}
        alt="صورة من إحدى الذكريات"
        className="max-h-80 w-auto max-w-full rounded-lg object-contain"
        loading="lazy"
      />
    </a>
  </div>
)}

{/* مشغّل التسجيل الصوتي */}
{item.audioSignedUrl && (
  <div className="mt-5">
    <p className="mb-3 text-sm text-[#C9A96E]">
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
  </div>
)}

                    <div className="mt-6 border-t border-[#252525]/10 pt-4">
                      <p className="text-sm text-[#C9A96E]">
                        — {item.contributors?.name || "من أحد الأصدقاء"}
                      </p>
                    </div>

                    {/* حالة الخصوصية وأزرار التحكم */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
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
                        className={`px-5 py-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
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

        <p className="mt-10 text-center text-sm leading-loose text-gray-500">
          الذكريات الجميلة لا تُقاس بعددها، بل بالأثر الذي تتركه في القلب.
        </p>
      </div>
    </main>
  );
}

export default GroomDashboard;
