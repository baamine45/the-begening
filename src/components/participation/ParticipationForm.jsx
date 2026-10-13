
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";

// نموذج المشاركة في مشروع 17 — البداية
function ParticipationForm({ event }) {
  // بيانات المشارك
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [memory, setMemory] = useState("");

  // الصورة اختيارية، وسيتم رفعها إلى Supabase Storage عند الإرسال
  const [photo, setPhoto] = useState(null);

  // بيانات التسجيل الصوتي
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // مراحل النموذج: 1 كتابة، 2 مراجعة، 3 نجاح
  const [step, setStep] = useState(1);

  // حالة الإرسال ورسائل الخطأ
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // إيقاف التسجيل وتنظيف الرابط المؤقت عند مغادرة الصفحة
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // بدء التسجيل الصوتي
  const startRecording = async () => {
    setSubmitError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        setSubmitError("المتصفح لا يدعم التسجيل الصوتي.");
        return;
      }

      // طلب إذن استخدام الميكروفون
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // حذف رابط التسجيل السابق إن وجد
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl("");
      }

      setAudioBlob(null);
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      // جمع أجزاء الصوت أثناء التسجيل
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // إنشاء ملف صوتي عند انتهاء التسجيل
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Microphone error:", error);
      setSubmitError(
        "تعذر الوصول إلى الميكروفون. تحقق من الإذن وحاول مرة أخرى."
      );
    }
  };

  // إيقاف التسجيل
  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.stop();
      setIsRecording(false);
    }
  };

  // الانتقال إلى مراجعة المشاركة
  const goToReview = () => {
    setSubmitError("");

    if (!name.trim()) {
      setSubmitError("من فضلك اكتب اسمك.");
      return;
    }

    if (!message.trim()) {
      setSubmitError("من فضلك اكتب رسالتك.");
      return;
    }

    if (!event?.id) {
      setSubmitError("لم يتم العثور على المناسبة.");
      return;
    }

    if (isRecording) {
      setSubmitError("أوقف التسجيل الصوتي قبل المتابعة.");
      return;
    }

    setStep(2);
  };

  // تحديد امتداد مناسب للملف قبل رفعه إلى Storage
  const getFileExtension = (file, fallback) => {
    const nameParts = file?.name?.split(".") || [];
    const nameExtension = nameParts.length > 1 ? nameParts.pop().toLowerCase() : "";

    if (/^[a-z0-9]{2,5}$/.test(nameExtension)) return nameExtension;

    const mimeExtensions = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
    };

    return mimeExtensions[file?.type] || fallback;
  };

  // رفع ملف إلى الـ Bucket الخاص بالمشاركات، داخل مجلد المستخدم نفسه
  const uploadContributionFile = async (file, userId, eventId, kind) => {
    if (!file) return null;

    const fallbackExtension = kind === "photo" ? "jpg" : "webm";
    const extension = getFileExtension(file, fallbackExtension);
    const filePath = `${userId}/${eventId}/${crypto.randomUUID()}-${kind}.${extension}`;

    const { data, error } = await supabase.storage
      .from("contribution-media")
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: file.type || (kind === "photo" ? "image/jpeg" : "audio/webm"),
        upsert: false,
      });

    if (error) {
      console.error(`Upload ${kind} error:`, error);
      throw new Error(
        kind === "photo"
          ? "تعذر رفع الصورة. تحقق من إعدادات التخزين وحاول مرة أخرى."
          : "تعذر رفع التسجيل الصوتي. تحقق من إعدادات التخزين وحاول مرة أخرى."
      );
    }

    // نحفظ مسار الملف داخل Storage، لا رابطًا عامًا؛ لأن الـ Bucket خاص
    return data.path;
  };

  // إرسال المشاركة إلى Supabase
  const submitContribution = async () => {
    if (isSubmitting) return;

    setSubmitError("");

    if (!event?.id) {
      setSubmitError("لم يتم العثور على المناسبة.");
      return;
    }

    if (!name.trim() || !message.trim()) {
      setSubmitError("يرجى كتابة الاسم والرسالة أولًا.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      // التأكد من أن المستخدم مسجل الدخول
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setSubmitError("انتهت جلسة الدخول. سجّل الدخول ثم حاول مجددًا.");
        return;
      }

      // البحث عن بيانات المشارك المرتبطة بحسابه
      const {
        data: contributor,
        error: contributorError,
      } = await supabase
        .from("contributors")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (contributorError) {
        console.error("Contributor fetch error:", contributorError);
        setSubmitError("تعذر العثور على بيانات المشارك.");
        return;
      }

      // إنشاء سجل المشارك إذا لم يكن موجودًا
      let contributorId = contributor?.id;

      if (!contributorId) {
        const {
          data: newContributor,
          error: createContributorError,
        } = await supabase
          .from("contributors")
          .insert({
            auth_user_id: user.id,
            name: name.trim(),
          })
          .select("id")
          .single();

        if (createContributorError) {
          console.error(
            "Create contributor error:",
            createContributorError
          );
          setSubmitError(
            "تعذر إنشاء بيانات المشارك. حاول مرة أخرى."
          );
          return;
        }

        contributorId = newContributor.id;
      }

      // التحقق من نوع وحجم الملفات قبل رفعها
      if (photo && (!photo.type.startsWith("image/") || photo.size > 10 * 1024 * 1024)) {
        setSubmitError("اختر صورة صحيحة لا يتجاوز حجمها 10 ميغابايت.");
        return;
      }

      if (audioBlob && (!audioBlob.type.startsWith("audio/") || audioBlob.size > 15 * 1024 * 1024)) {
        setSubmitError("التسجيل الصوتي غير صالح أو يتجاوز حجمه 15 ميغابايت.");
        return;
      }

      // رفع الملفات أولًا داخل مجلد يحمل معرّف المستخدم.
      // هذا المسار يتوافق مع سياسة INSERT التي أنشأناها في Supabase Storage.
      let photoPath = null;
      let uploadedAudioPath = null;

      try {
        if (photo) {
          photoPath = await uploadContributionFile(photo, user.id, event.id, "photo");
        }

        if (audioBlob) {
          const audioFile = new File(
            [audioBlob],
            `recording.${getFileExtension(audioBlob, "webm")}`,
            { type: audioBlob.type || "audio/webm" }
          );
          uploadedAudioPath = await uploadContributionFile(
            audioFile,
            user.id,
            event.id,
            "audio"
          );
        }
      } catch (uploadError) {
        console.error("Contribution media upload error:", uploadError);
        setSubmitError(uploadError.message || "تعذر رفع ملفات المشاركة.");
        return;
      }

      // إنشاء المشاركة بعد رفع الملفات بنجاح:
      // - pending تعني أنها تنتظر مراجعة المشرف.
      // - private تعني أنها لا تُنشر للزوار تلقائيًا.
      // نخزن مسارات الملفات لأن الـ Bucket خاص وليس عامًا.
      const { error: contributionError } = await supabase
        .from("contributions")
        .insert({
          event_id: event.id,
          contributor_id: contributorId,
          message: message.trim(),
          memory: memory.trim() || null,
          photo_url: photoPath,
          audio_url: uploadedAudioPath,
          status: "pending",
          visibility: "private",
          revealed: false,
        });

      if (contributionError) {
        console.error("Contribution insert error:", contributionError);

        if (contributionError.code === "23505") {
          setSubmitError("لقد أرسلت مشاركتك لهذه المناسبة من قبل.");
        } else {
          setSubmitError(
            "تعذر إرسال المشاركة. تحقق من إعدادات Supabase وحاول مجددًا."
          );
        }

        return;
      }

      // نجاح الإرسال
      setStep(3);
    } catch (error) {
      console.error("Unexpected submission error:", error);
      setSubmitError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // تنسيق موحّد للحقول
  const fieldClass =
    "w-full rounded-xl border border-gray-300 bg-white px-5 py-4 outline-none transition focus:border-[#C9A96E]";

  const buttonClass =
    "rounded-full bg-[#171717] px-8 py-4 text-white transition duration-300 hover:bg-[#C9A96E] hover:text-black disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section
      dir="rtl"
      className="min-h-screen bg-[#F8F5F0] px-6 py-24 text-[#252525]"
    >
      <div className="mx-auto max-w-2xl">
        {/* المرحلة الأولى: كتابة المشاركة */}
        {step === 1 && (
          <>
            <div className="mb-16 text-center">
              <p className="mb-4 text-sm tracking-[0.2em] text-[#C9A96E]">
                شارك في الذكرى
              </p>

              <h1 className="text-4xl font-light md:text-5xl">
                كن جزءًا من البداية
              </h1>

              <p className="mt-6 leading-loose text-gray-600">
                بعض الكلمات تبقى في الذاكرة أكثر من غيرها.
                <br />
                اكتب له شيئًا من قلبك.
              </p>
            </div>

            <form
              className="space-y-10"
              onSubmit={(event) => {
                event.preventDefault();
                goToReview();
              }}
            >
              <div>
                <label className="mb-3 block text-lg">
                  أولًا، دعنا نتعرف عليك
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="اكتب اسمك"
                  maxLength={100}
                  required
                  className={fieldClass}
                />
              </div>

              <div>
                <label className="mb-3 block text-lg">
                  والآن، اكتب له شيئًا من قلبك
                </label>

                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  rows={6}
                  maxLength={5000}
                  required
                  className={`${fieldClass} resize-y leading-loose`}
                />
              </div>

              <div>
                <label className="mb-3 block text-lg">
                  هل هناك ذكرى تستحق أن تعود للحياة؟
                </label>

                <p className="mb-4 text-sm text-gray-500">
                  يمكنك أن تحكي موقفًا جميلًا تتذكره من أيام الثانوية.
                </p>

                <textarea
                  value={memory}
                  onChange={(event) => setMemory(event.target.value)}
                  placeholder="اكتب الذكرى هنا... (اختياري)"
                  rows={5}
                  maxLength={5000}
                  className={`${fieldClass} resize-y leading-loose`}
                />
              </div>

              <div>
                <label className="mb-3 block text-lg">
                  هل لديك صورة تحفظ تلك اللحظة؟ 📷
                </label>

                <p className="mb-4 text-sm text-gray-500">
                  يمكنك إرفاق صورة بحجم لا يتجاوز 10 ميغابايت؛ وستُرفع بصورة خاصة عند إرسال المشاركة.
                </p>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setPhoto(event.target.files?.[0] || null)
                  }
                  className={fieldClass}
                />

                {photo && (
                  <p className="mt-3 text-sm text-gray-500">
                    الصورة المختارة: {photo.name}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-3 block text-lg">
                  وأخيرًا... هل تريد أن يسمعك؟ 🎙️
                </label>

                <p className="mb-6 text-sm text-gray-500">
                  يمكنك تسجيل رسالة صوتية والاستماع إليها قبل الإرسال. الحد الأقصى للحجم 15 ميغابايت.
                </p>

                {!isRecording && !audioUrl && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className={buttonClass}
                  >
                    🎙️ ابدأ التسجيل
                  </button>
                )}

                {isRecording && (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="rounded-full border border-red-400 px-8 py-4 text-red-500"
                  >
                    ⏹️ إيقاف التسجيل
                  </button>
                )}

                {audioUrl && !isRecording && (
                  <div className="mt-6 space-y-4">
                    <audio
                      controls
                      src={audioUrl}
                      className="w-full"
                    />

                    <button
                      type="button"
                      onClick={startRecording}
                      className="rounded-full border border-[#C9A96E] px-6 py-3 text-[#C9A96E]"
                    >
                      🔄 إعادة التسجيل
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(audioUrl);
                        setAudioUrl("");
                        setAudioBlob(null);
                      }}
                      className="mr-3 rounded-full border border-gray-300 px-6 py-3"
                    >
                      حذف التسجيل
                    </button>
                  </div>
                )}
              </div>

              {submitError && (
                <p role="alert" className="text-center text-red-600">
                  {submitError}
                </p>
              )}

              <button type="submit" className={`${buttonClass} w-full`}>
                متابعة إلى المراجعة
              </button>
            </form>
          </>
        )}

        {/* المرحلة الثانية: مراجعة المشاركة */}
        {step === 2 && (
          <div className="text-center">
            <p className="mb-4 text-sm tracking-[0.2em] text-[#C9A96E]">
              مراجعة المشاركة
            </p>

            <h2 className="text-3xl font-light md:text-4xl">
              راجع ذكرياتك قبل الإرسال ❤️
            </h2>

            <p className="mt-6 text-gray-600">
              تأكد أن كل شيء كما تريد قبل إرسال مشاركتك.
            </p>

            <div className="mt-12 space-y-6 text-right">
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="mb-2 text-sm text-[#C9A96E]">الاسم</p>
                <p className="text-lg">{name}</p>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <p className="mb-2 text-sm text-[#C9A96E]">الرسالة</p>
                <p className="whitespace-pre-line leading-loose">
                  {message}
                </p>
              </div>

              {memory.trim() && (
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="mb-2 text-sm text-[#C9A96E]">الذكرى</p>
                  <p className="whitespace-pre-line leading-loose">
                    {memory}
                  </p>
                </div>
              )}

              {photo && (
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="mb-4 text-sm text-[#C9A96E]">الصورة المختارة</p>
                  <img
                    src={URL.createObjectURL(photo)}
                    alt="الصورة المختارة"
                    className="mx-auto max-h-80 rounded-xl object-cover"
                  />
                  <p className="mt-3 text-sm text-gray-500">
                    ستُرفع الصورة إلى مساحة التخزين الخاصة عند تأكيد الإرسال.
                  </p>
                </div>
              )}

              {audioUrl && (
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <p className="mb-4 text-sm text-[#C9A96E]">
                    التسجيل الصوتي
                  </p>
                  <audio controls src={audioUrl} className="w-full" />
                  <p className="mt-3 text-sm text-gray-500">
سيُرفع التسجيل إلى مساحة التخزين الخاصة عند تأكيد الإرسال.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setSubmitError("");
                  setStep(1);
                }}
                className="w-full rounded-full border border-[#C9A96E] px-8 py-4 text-[#C9A96E] transition hover:bg-[#C9A96E] hover:text-black"
              >
                ← تعديل المشاركة
              </button>

              <button
                type="button"
                onClick={submitContribution}
                disabled={isSubmitting}
                className={`${buttonClass} w-full`}
              >
                {isSubmitting
                  ? "جاري إرسال مشاركتك..."
                  : "✓ تأكيد وإرسال"}
              </button>
            </div>

            {submitError && (
              <p role="alert" className="mt-6 text-center text-red-600">
                {submitError}
              </p>
            )}
          </div>
        )}

        {/* المرحلة الثالثة: نجاح الإرسال */}
        {step === 3 && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="mb-8 text-6xl">❤️</div>

            <h2 className="text-4xl font-light md:text-5xl">
              وصلت مشاركتك!
            </h2>

            <p className="mt-8 max-w-xl text-lg leading-loose text-gray-600">
              شكرًا لك على هذه الكلمات الجميلة.
              <br />
              أصبحت مشاركتك جزءًا من الذكرى التي نجمعها لهذا اليوم المميز.
            </p>

            <p className="mt-8 text-[#C9A96E]">
              💗 سنلتقي في 17 أكتوبر...
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ParticipationForm;
