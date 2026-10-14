
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

function AudioMessages() {
  // التسجيلات الصوتية العامة التي نحصل عليها من Supabase
  const [audioMessages, setAudioMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // تحميل التسجيلات المعتمدة والمتاحة للزوار فقط
  useEffect(() => {
    let active = true;

    async function loadAudioMessages() {
      setLoading(true);
      setError("");

      try {
        // جلب المساهمات العامة التي تحتوي على تسجيل صوتي
        const { data, error: fetchError } = await supabase
          .from("contributions")
          .select(`
            id,
            message,
            audio_url,
            created_at,
            contributors (
              name
            )
          `)
          .eq("status", "approved")
          .eq("visibility", "public")
          .not("audio_url", "is", null)
          .order("created_at", { ascending: true });

        if (fetchError) throw fetchError;

        // إنشاء رابط مؤقت لكل تسجيل داخل الحاوية الخاصة
        const messagesWithUrls = await Promise.all(
          (data || []).map(async (item) => {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from("contribution-media")
                .createSignedUrl(item.audio_url, 60 * 60);

            if (signedError || !signedData?.signedUrl) {
              console.error(
                "تعذر إنشاء رابط التسجيل الصوتي:",
                signedError
              );

              return {
                ...item,
                audioSignedUrl: null,
              };
            }

            return {
              ...item,
              audioSignedUrl: signedData.signedUrl,
            };
          })
        );

        if (active) {
          // عرض التسجيلات التي نجح إنشاء روابطها فقط
          setAudioMessages(
            messagesWithUrls.filter(
              (item) => item.audioSignedUrl
            )
          );
        }
      } catch (fetchError) {
        console.error(
          "خطأ في تحميل التسجيلات الصوتية:",
          fetchError
        );

        if (active) {
          setError("تعذر تحميل التسجيلات الصوتية.");
          setAudioMessages([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAudioMessages();

    // منع تحديث الحالة بعد مغادرة المكوّن
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="
        overflow-hidden
        bg-[#171717]
        px-6
        py-32
        text-white
      "
    >
      {/* مقدمة القسم */}
      <div className="mx-auto mb-24 max-w-2xl text-center">
        <p className="mb-6 text-sm tracking-[0.2em] text-[#C9A96E]">
          أصوات من الماضي
        </p>

        <h2 className="text-4xl font-light md:text-6xl">
          هل تريد أن تسمعهم؟
        </h2>

        <p className="mt-8 text-lg leading-loose text-gray-400">
          بعض الكلمات أجمل عندما نسمع صوت صاحبها.
        </p>
      </div>

      {/* حالة تحميل التسجيلات */}
      {loading && (
        <p className="text-center text-gray-400">
          جارٍ تحميل التسجيلات الصوتية...
        </p>
      )}

      {/* عرض الخطأ إذا تعذّر جلب التسجيلات */}
      {!loading && error && (
        <p role="status" className="text-center text-red-300">
          {error}
        </p>
      )}

      {/* لا توجد تسجيلات عامة بعد */}
      {!loading && !error && audioMessages.length === 0 && (
        <p className="text-center text-gray-400">
          لم تُنشر تسجيلات صوتية للزوار بعد.
        </p>
      )}

      {/* بطاقات التسجيلات الصوتية */}
      {!loading && !error && audioMessages.length > 0 && (
        <div className="mx-auto max-w-3xl space-y-6">
          {audioMessages.map((item, index) => (
            <article
              key={item.id}
              className="
                rounded-2xl
                border border-white/10
                bg-white/5
                p-6
                transition duration-500
                hover:border-[#C9A96E]/40
                md:p-8
              "
            >
              {/* اسم صاحب التسجيل ورسالته */}
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg text-[#C9A96E]">
                    {item.contributors?.name || "أحد الأصدقاء"}
                  </p>

                  {item.message && (
                    <p className="mt-2 whitespace-pre-wrap leading-7 text-gray-400">
                      {item.message}
                    </p>
                  )}
                </div>

                <span className="text-sm text-gray-600" dir="ltr">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              {/* مشغل التسجيل الصوتي */}
              <audio
                controls
                preload="none"
                src={item.audioSignedUrl}
                className="w-full"
              >
                متصفحك لا يدعم تشغيل الصوت.
              </audio>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default AudioMessages;
