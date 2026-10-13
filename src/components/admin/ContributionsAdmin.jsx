import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// الحالات التي يستطيع المشرف اختيارها بعد مراجعة الرسالة.
const REVIEW_DECISIONS = {
  approved: "الموافقة على الرسالة",
  rejected: "رفض الرسالة",
};

function ContributionsAdmin() {
  const navigate = useNavigate();

  // حالات التحقق من تسجيل الدخول وصلاحية المشرف.
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // الرسائل التي تنتظر مراجعة المشرف.
  const [contributions, setContributions] = useState([]);
  const [loadingContributions, setLoadingContributions] = useState(false);

  // رسائل الحالة ومعرّف الرسالة الجاري تحديثها.
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [processingId, setProcessingId] = useState(null);

  // التحقق من تسجيل الدخول وصلاحية المشرف.
  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          if (active) navigate("/admin-login", { replace: true });
          return;
        }

        // نتحقق من الصلاحية في قاعدة البيانات.
        const { data: allowed, error: adminError } =
          await supabase.rpc("is_admin");

        if (!active) return;

        if (adminError) {
          setMessage("تعذر التحقق من صلاحية المشرف: " + adminError.message);
          setMessageType("error");
        } else if (allowed === true) {
          setIsAdmin(true);
        } else {
          setMessage("هذا الحساب لا يملك صلاحية المشرف.");
          setMessageType("error");
        }
      } catch (error) {
        if (active) {
          setMessage("حدث خطأ غير متوقع أثناء التحقق من الصلاحيات.");
          setMessageType("error");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    checkAdmin();

    return () => {
      active = false;
    };
  }, [navigate]);

  // تحميل الرسائل التي لا تزال قيد الانتظار.
  const loadContributions = useCallback(async () => {
    setLoadingContributions(true);

    try {
      const { data, error } = await supabase
        .from("contributions")
       
.select(`
  id,
  message,
  memory,
  photo_url,
  audio_url,
  status,
  created_at,
  contributor_id,
  contributors (
    name
  )
`)

        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("خطأ تحميل الرسائل:", error);
        setMessage("تعذر تحميل الرسائل: " + error.message);
        setMessageType("error");
        return;
      }

     
      // إنشاء روابط مؤقتة للصور والتسجيلات الصوتية
      const contributionsWithMedia = await Promise.all(
        (data ?? []).map(async (contribution) => {
          let photoSignedUrl = null;
          let audioSignedUrl = null;

          // إنشاء رابط مؤقت للصورة إن وُجد مسارها
          if (contribution.photo_url) {
            const { data: photoData, error: photoError } =
              await supabase.storage
                .from("contribution-media")
                .createSignedUrl(contribution.photo_url, 3600);

            if (photoError) {
              console.error("تعذر إنشاء رابط الصورة:", photoError);
            } else {
              photoSignedUrl = photoData.signedUrl;
            }
          }

          // إنشاء رابط مؤقت للصوت إن وُجد مساره
          if (contribution.audio_url) {
            const { data: audioData, error: audioError } =
              await supabase.storage
                .from("contribution-media")
                .createSignedUrl(contribution.audio_url, 3600);
if (audioError) {
  console.error(
    "تعذر إنشاء رابط الصوت:",
    audioError.message,
    audioError
  );
} else {
  audioSignedUrl = audioData.signedUrl;
  console.log("تم إنشاء رابط الصوت بنجاح");
}
          }

          // الاحتفاظ ببيانات المساهمة وإضافة الرابطين المؤقتين
          return {
            ...contribution,
            photoSignedUrl,
            audioSignedUrl,
          };
        })
      );

      setContributions(contributionsWithMedia);

    } catch (error) {
      console.error("خطأ غير متوقع أثناء تحميل الرسائل:", error);
      setMessage("حدث خطأ غير متوقع أثناء تحميل الرسائل.");
      setMessageType("error");
    } finally {
      setLoadingContributions(false);
    }
  }, []);

  // لا نحمّل الرسائل إلا بعد التحقق من صلاحية المشرف.
  useEffect(() => {
    if (isAdmin) loadContributions();
  }, [isAdmin, loadContributions]);

  // اعتماد الرسالة أو رفضها، ثم إظهار نتيجة التحديث.
  async function reviewContribution(contributionId, decision) {
    if (!Object.prototype.hasOwnProperty.call(REVIEW_DECISIONS, decision)) {
      setMessage("حالة المراجعة غير صحيحة.");
      setMessageType("error");
      return;
    }

    setProcessingId(contributionId);
    setMessage("");

    try {
      console.log("بدء مراجعة الرسالة:", { contributionId, decision });

      // نحدّث الرسالة فقط إذا كانت لا تزال pending.
      // select() يتيح لنا معرفة ما إذا تم تحديث سجل فعليًا.
      const { data, error } = await supabase
        .from("contributions")
        .update({ status: decision })
        .eq("id", contributionId)
        .eq("status", "pending")
        .select("id, status");

      console.log("نتيجة تحديث الرسالة:", { data, error });

      if (error) {
        console.error("تعذر تحديث حالة الرسالة:", error);
        setMessage(
          "تعذر تحديث حالة الرسالة: " +
            error.message +
            " — تحقق من سياسات UPDATE في Supabase."
        );
        setMessageType("error");
        return;
      }

      // عدم إرجاع أي سجل قد يعني أن RLS منع التحديث أو أن الحالة تغيرت.
      if (!data || data.length === 0) {
        setMessage(
          "لم تتغير حالة الرسالة. لم تُرجع قاعدة البيانات أي سجل محدّث. " +
            "تحقق من صلاحيات UPDATE وSELECT في Supabase ومن حالة الرسالة."
        );
        setMessageType("error");
        return;
      }

      setMessage(
        decision === "approved"
          ? "تمت الموافقة على الرسالة. أصبحت معتمدة، ولم تُنشر للزوار تلقائيًا."
          : "تم رفض الرسالة."
      );
      setMessageType("success");

      // إزالة الرسالة التي تمت مراجعتها من قائمة الانتظار.
      await loadContributions();
    } catch (error) {
      console.error("خطأ غير متوقع أثناء مراجعة الرسالة:", error);
      setMessage("حدث خطأ غير متوقع أثناء مراجعة الرسالة.");
      setMessageType("error");
    } finally {
      setProcessingId(null);
    }
  }

  // تسجيل الخروج والعودة إلى صفحة دخول المشرف.
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("تعذر تسجيل الخروج: " + error.message);
      setMessageType("error");
      return;
    }

    navigate("/admin-login", { replace: true });
  }

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#171717] p-6 text-white"
      >
        جارٍ التحقق من صلاحيات المشرف...
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-[#171717] p-6 text-white md:p-10"
      >
        <p role="alert" className="text-red-300">
          {message || "لا تملك صلاحية الوصول إلى هذه الصفحة."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/admin-login", { replace: true })}
          className="mt-6 rounded-full border border-white/20 px-5 py-3 hover:bg-white/10"
        >
          العودة إلى تسجيل الدخول
        </button>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#171717] p-6 text-white md:p-10"
    >
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-sm tracking-widest text-[#C9A96E]">
            17 — THE BEGINNING
          </p>
          <h1 className="text-3xl font-light">مراجعة رسائل المشاركين</h1>
          <p className="mt-2 text-sm text-gray-400">
            وافق على الرسائل المناسبة أو ارفضها. نشر الرسالة للزوار قرار مستقل للعريس.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="rounded-full border border-white/20 px-5 py-3 hover:bg-white/10"
          >
            إدارة الذكريات
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-white/20 px-5 py-3 hover:bg-white/10"
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      {message && (
        <p
          role="status"
          aria-live="polite"
          className={`mb-6 rounded-xl border p-4 text-sm leading-loose ${
            messageType === "error"
              ? "border-red-400/30 bg-red-500/10 text-red-200"
              : messageType === "success"
                ? "border-green-400/30 bg-green-500/10 text-green-200"
                : "border-white/10 bg-white/5 text-gray-200"
          }`}
        >
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl">الرسائل المنتظرة للمراجعة</h2>
            <p className="mt-2 text-sm text-gray-400">
              عدد الرسائل: {contributions.length}
            </p>
          </div>

          <button
            type="button"
            onClick={loadContributions}
            disabled={loadingContributions || processingId !== null}
            className="rounded-full border border-white/20 px-5 py-2 hover:bg-white/10 disabled:opacity-50"
          >
            {loadingContributions ? "جارٍ التحديث..." : "تحديث القائمة"}
          </button>
        </div>

        {loadingContributions && contributions.length === 0 ? (
          <p className="rounded-xl bg-white/5 p-5 text-gray-300">
            جارٍ تحميل الرسائل...
          </p>
        ) : contributions.length === 0 ? (
          <p className="rounded-xl bg-white/5 p-5 text-gray-400">
            لا توجد رسائل تنتظر المراجعة حاليًا.
          </p>
        ) : (
          <div className="space-y-4">
            {contributions.map((contribution) => (
              <article
                key={contribution.id}
                className="rounded-xl border border-white/10 p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-[#C9A96E]">
                    المشارك: {contribution.contributors?.name || "غير معروف"}
                  </p>
                  <span className="rounded-full bg-yellow-900/40 px-3 py-1 text-xs text-yellow-200">
                    قيد الانتظار
                  </span>
                </div>

                <p className="whitespace-pre-wrap leading-loose">
                  {contribution.message || "لم يكتب المشارك رسالة تهنئة."}
                </p>

                {contribution.memory && (
                  <div className="mt-4 rounded-lg bg-white/5 p-4">
                    <p className="mb-2 text-sm text-gray-400">
                      الذكرى المرفقة
                    </p>
                    <p className="whitespace-pre-wrap leading-loose">
                      {contribution.memory}
                    </p>
                  </div>
                )}

{/* عرض الصورة المرفقة إن وُجدت */}
{contribution.photoSignedUrl && (
  <div className="mt-4 rounded-lg bg-white/5 p-4">
    <p className="mb-3 text-sm text-gray-400">
      الصورة المرفقة
    </p>

    <a
      href={contribution.photoSignedUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        src={contribution.photoSignedUrl}
        alt="الصورة المرفقة من المشارك"
        className="max-h-80 w-auto max-w-full rounded-lg object-contain"
        loading="lazy"
      />
    </a>
  </div>
)}
<p className="text-xs text-gray-400">
  حالة الصوت: {contribution.audioSignedUrl ? "الرابط موجود" : "لا يوجد رابط"}
</p>
{/* مشغل التسجيل الصوتي إن وُجد */}
{contribution.audioSignedUrl && (
  <div className="mt-4 rounded-lg bg-white/5 p-4">
    <p className="mb-3 text-sm text-gray-400">
      التسجيل الصوتي المرفق
    </p>

    <audio
      controls
      preload="metadata"
      src={contribution.audioSignedUrl}
      className="w-full"
    >
      متصفحك لا يدعم تشغيل الصوت.
    </audio>
  </div>
)}

                <p className="mt-4 text-xs text-gray-500">
                  تاريخ الإرسال:{" "}
                  {contribution.created_at
                    ? new Date(contribution.created_at).toLocaleString("ar")
                    : "غير متوفر"}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() =>
                      reviewContribution(contribution.id, "approved")
                    }
                    className="rounded-full bg-green-700 px-5 py-2 text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingId === contribution.id
                      ? "جارٍ الحفظ..."
                      : "الموافقة على الرسالة"}
                  </button>

                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() =>
                      reviewContribution(contribution.id, "rejected")
                    }
                    className="rounded-full border border-red-400/50 px-5 py-2 text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingId === contribution.id
                      ? "جارٍ الحفظ..."
                      : "رفض الرسالة"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default ContributionsAdmin;
