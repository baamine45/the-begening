
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const BUCKET_NAME = "timeline-photos";

function GroomJourney() {
  // الصور المنشورة التي أضافها المشرف
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // الصورة المفتوحة حاليًا في المعرض
  const [lightbox, setLightbox] = useState(null);

  // بيانات المستخدم والتعليقات
  const [user, setUser] = useState(null);
  const [contributorName, setContributorName] = useState("");
  const [contributorLoading, setContributorLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // جلب الصور المرتبطة بذكريات ما بعد الثانوية المنشورة فقط
  useEffect(() => {
    let active = true;

    async function loadJourneyPhotos() {
      setLoading(true);
      setLoadError(false);

      try {
        const { data: memories, error: memoryError } =
          await supabase
            .from("timeline_memories")
            .select("id, title")
            .eq("section", "after_secondary")
            .eq("is_published", true);

        if (memoryError) throw memoryError;

        const memoryIds = (memories || []).map((memory) => memory.id);

        if (memoryIds.length === 0) {
          if (active) setPhotos([]);
          return;
        }

        const titleById = Object.fromEntries(
          memories.map((memory) => [memory.id, memory.title])
        );

        const { data: photoRows, error: photoError } =
          await supabase
            .from("timeline_photos")
            .select(
              "id, memory_id, storage_path, alt_text, sort_order"
            )
            .in("memory_id", memoryIds)
            .order("sort_order", { ascending: true });

        if (photoError) throw photoError;

        // إنشاء رابط مؤقت لكل صورة داخل الحاوية الخاصة
        const photosWithUrls = await Promise.all(
          (photoRows || []).map(async (photo) => {
            const { data, error } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(photo.storage_path, 60 * 60);

            return {
              ...photo,
              memoryTitle: titleById[photo.memory_id] || "",
              signedUrl: error ? null : data?.signedUrl,
            };
          })
        );

        if (active) {
          setPhotos(
            photosWithUrls.filter((photo) => photo.signedUrl)
          );
        }
      } catch (error) {
        console.error("تعذر تحميل صور ما بعد الثانوية:", error);

        if (active) {
          setPhotos([]);
          setLoadError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadJourneyPhotos();

    return () => {
      active = false;
    };
  }, []);

  // متابعة تسجيل الدخول
  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data?.user ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active) setUser(session?.user ?? null);
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // التحقق من أن الحساب مرتبط بمشارك مسجل
  useEffect(() => {
    let active = true;

    async function loadContributor() {
      setContributorName("");
      setCommentError("");

      if (!user) {
        setContributorLoading(false);
        return;
      }

      setContributorLoading(true);

      const { data, error } = await supabase
        .from("contributors")
        .select("name")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("تعذر تحميل اسم المشارك:", error);
        setCommentError("تعذر التحقق من حساب المشارك.");
        setContributorName("");
      } else {
        setContributorName(data?.name?.trim() || "");
      }

      setContributorLoading(false);
    }

    loadContributor();

    return () => {
      active = false;
    };
  }, [user]);

  // معرفة الصورة المفتوحة للحصول على تعليقاتها
  const activePhoto = lightbox?.images?.[lightbox.index];
  const activePhotoId = activePhoto?.id ?? null;

  // تحميل تعليقات الصورة عند فتحها أو الانتقال إلى صورة أخرى
  useEffect(() => {
    let active = true;

    setComments([]);
    setCommentText("");
    setCommentError("");

    if (!activePhotoId) {
      setCommentsLoading(false);
      return;
    }

    setCommentsLoading(true);

    async function loadComments() {
      const { data, error } = await supabase
        .from("timeline_comments")
        .select("id, photo_id, author_name, content, created_at")
        .eq("photo_id", activePhotoId)
        .order("created_at", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("تعذر تحميل التعليقات:", error);
        setCommentError("تعذر تحميل تعليقات هذه الصورة.");
      } else {
        setComments(data ?? []);
      }

      setCommentsLoading(false);
    }

    loadComments();

    return () => {
      active = false;
    };
  }, [activePhotoId]);

  // إرسال تعليق على الصورة المفتوحة
  async function submitComment(event) {
    event.preventDefault();

    const content = commentText.trim();
    const name = contributorName.trim();

    if (!user || !activePhotoId || !name) {
      setCommentError(
        "يجب تسجيل الدخول بحساب مشارك مرتبط بحسابك لإضافة تعليق."
      );
      return;
    }

    if (!content || content.length > 1000) {
      setCommentError("يجب أن يكون التعليق بين حرف واحد و1000 حرف.");
      return;
    }

    const photoId = activePhotoId;
    setSendingComment(true);
    setCommentError("");

    try {
      const { error } = await supabase
        .from("timeline_comments")
        .insert({
          photo_id: photoId,
          user_id: user.id,
          author_name: name,
          content,
        });

      if (error) throw error;

      setCommentText("");

      // تحديث التعليقات بعد نجاح الإرسال
      const { data, error: reloadError } = await supabase
        .from("timeline_comments")
        .select("id, photo_id, author_name, content, created_at")
        .eq("photo_id", photoId)
        .order("created_at", { ascending: true });

      if (reloadError) {
        setCommentError("تم إرسال التعليق، لكن تعذر تحديث القائمة.");
      } else if (activePhotoId === photoId) {
        setComments(data ?? []);
      }
    } catch (error) {
      console.error("تعذر إرسال التعليق:", error);
      setCommentError("تعذر إرسال التعليق: " + error.message);
    } finally {
      setSendingComment(false);
    }
  }

  // التنقل بين الصور وإغلاق المعرض بلوحة المفاتيح
  function moveImage(direction) {
    setLightbox((current) => {
      if (!current || current.images.length < 2) return current;

      return {
        ...current,
        index:
          (current.index + direction + current.images.length) %
          current.images.length,
      };
    });
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") setLightbox(null);
      if (!lightbox || lightbox.images.length < 2) return;

      if (event.key === "ArrowRight") moveImage(1);
      if (event.key === "ArrowLeft") moveImage(-1);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightbox]);

  return (
    <section
      className="
        overflow-hidden
        bg-[#F8F5F0]
        px-6
        py-32
        text-[#252525]
      "
    >
      {/* مقدمة المرحلة الجديدة */}
      <div className="mx-auto mb-24 max-w-3xl text-center">
        <p className="mb-6 text-sm tracking-[0.2em] text-[#C9A96E]">
          وما بعد الثانوية
        </p>

        <h2 className="text-4xl font-light leading-relaxed md:text-6xl">
          ثم كبرت الحكاية...
        </h2>

        <p className="mt-8 text-lg leading-loose text-gray-600">
          تغيّرت الأيام، وكبرت الأحلام،
          <br />
          لكن بعض الذكريات بقيت معنا.
        </p>
      </div>

      {/* صور ما بعد الثانوية التي نشرها المشرف */}
      <div className="mx-auto max-w-5xl">
        {loading && (
          <p className="text-center text-gray-500">
            جارٍ تحميل الذكريات...
          </p>
        )}

        {loadError && (
          <p role="status" className="text-center text-amber-700">
            تعذر تحميل الصور. حاول تحديث الصفحة.
          </p>
        )}

        {!loading && !loadError && photos.length === 0 && (
          <p className="text-center text-gray-500">
            ستظهر الذكريات هنا عندما ينشرها المشرف.
          </p>
        )}

        {!loading && !loadError && photos.length > 0 && (
          <div className="grid gap-8 md:grid-cols-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() =>
                  setLightbox({ images: photos, index })
                }
                aria-label={`فتح صورة ${index + 1}`}
                className={`
                  group overflow-hidden rounded-2xl shadow-xl
                  focus:outline-none focus:ring-2
                  focus:ring-[#C9A96E]
                  ${index % 2 === 1 ? "md:mt-24" : ""}
                `}
              >
                <img
                  src={photo.signedUrl}
                  alt={
                    photo.alt_text ||
                    photo.memoryTitle ||
                    "ذكرى من مرحلة ما بعد الثانوية"
                  }
                  loading="lazy"
                  className="
                    h-[500px]
                    w-full
                    object-cover
                    transition
                    duration-700
                    group-hover:scale-105
                  "
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* الانتقال إلى الحاضر */}
      <div className="mt-32 text-center">
        <div
          className="mb-12 text-3xl text-[#C9A96E]"
          aria-hidden="true"
        >
          ↓
        </div>

        <p className="mb-6 text-sm tracking-[0.2em] text-[#C9A96E]">
          واليوم...
        </p>

        <h3
          className="text-5xl font-light md:text-7xl"
          dir="ltr"
        >
          17 أكتوبر 2026
        </h3>

        <p className="mt-8 text-xl text-gray-600">
          بداية فصل جديد
        </p>
      </div>

      {/* نافذة الصورة والتعليقات */}
      {lightbox && activePhoto && (
        <div
          className="
            fixed inset-0 z-[100]
            flex items-start justify-center
            overflow-y-auto
            bg-black/95 p-4 pt-20
            backdrop-blur-md
            md:p-10 md:pt-16
          "
          role="dialog"
          aria-modal="true"
          aria-label="عرض الصورة والتعليقات"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="إغلاق الصورة"
            className="
              absolute right-5 top-5 z-20
              flex h-11 w-11 items-center justify-center
              rounded-full border border-white/20
              bg-white/10 text-2xl text-white
              transition hover:bg-[#C9A96E] hover:text-black
            "
          >
            ×
          </button>

          <div
            className="relative flex w-full max-w-5xl flex-col items-center pb-12"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              key={activePhoto.id}
              src={activePhoto.signedUrl}
              alt={activePhoto.alt_text || activePhoto.memoryTitle || ""}
              className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"
            />

            <p className="mt-5 text-center text-sm text-[#C9A96E]">
              {activePhoto.memoryTitle || "ذكرى من رحلتنا"}
            </p>

            <p className="mt-2 text-xs text-gray-400" dir="ltr">
              {lightbox.index + 1} / {lightbox.images.length}
            </p>

            {/* قسم التعليقات */}
            <div
              dir="rtl"
              className="
                mt-8 w-full max-w-2xl rounded-2xl
                border border-white/10 bg-[#1D1D1D]
                p-5 text-right md:p-7
              "
            >
              <h3 className="mb-5 text-lg text-[#C9A96E]">
                تعليقات الصورة ({comments.length})
              </h3>

              {commentsLoading && (
                <p className="text-sm text-gray-400">
                  جارٍ تحميل التعليقات...
                </p>
              )}

              {!commentsLoading && comments.length === 0 && (
                <p className="text-sm text-gray-400">
                  لا توجد تعليقات بعد. كن أول من يعلّق.
                </p>
              )}

              <div className="max-h-64 space-y-4 overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border-b border-white/10 pb-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm font-medium text-[#C9A96E]">
                        {comment.author_name}
                      </strong>

                      <time
                        className="text-xs text-gray-500"
                        dateTime={comment.created_at}
                      >
                        {new Date(
                          comment.created_at
                        ).toLocaleDateString("ar")}
                      </time>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-200">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>

              {commentError && (
                <p role="alert" className="mt-4 text-sm text-red-300">
                  {commentError}
                </p>
              )}

              {!user ? (
                <p className="mt-5 text-sm text-gray-400">
                  سجّل الدخول بحسابك للمشاركة حتى تتمكن من كتابة تعليق.
                </p>
              ) : contributorLoading ? (
                <p className="mt-5 text-sm text-gray-400">
                  جارٍ التحقق من حساب المشارك...
                </p>
              ) : contributorName ? (
                <form onSubmit={submitComment} className="mt-6 space-y-3">
                  <p className="text-sm text-gray-400">
                    التعليق باسم:{" "}
                    <strong className="text-[#C9A96E]">
                      {contributorName}
                    </strong>
                  </p>

                  <textarea
                    value={commentText}
                    onChange={(event) =>
                      setCommentText(event.target.value)
                    }
                    maxLength={1000}
                    rows={3}
                    required
                    placeholder="اكتب تعليقك على هذه الصورة..."
                    className="
                      w-full resize-y rounded-lg
                      border border-white/20
                      bg-black/30 p-3 text-sm text-white
                      outline-none focus:border-[#C9A96E]
                    "
                  />

                  <button
                    type="submit"
                    disabled={sendingComment}
                    className="
                      rounded-lg bg-[#C9A96E]
                      px-5 py-2.5 text-sm font-medium text-black
                      disabled:opacity-50
                    "
                  >
                    {sendingComment
                      ? "جارٍ الإرسال..."
                      : "نشر التعليق"}
                  </button>
                </form>
              ) : (
                <p className="mt-5 text-sm text-amber-200">
                  هذا الحساب غير مرتبط بسجل مشارك. استخدم حساب المشاركة
                  المعتمد لإضافة تعليق.
                </p>
              )}
            </div>

            {/* أزرار الانتقال بين الصور */}
            {lightbox.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => moveImage(-1)}
                  aria-label="الصورة السابقة"
                  className="
                    absolute left-0 top-1/3
                    flex h-11 w-11 items-center justify-center
                    rounded-full border border-white/20
                    bg-white/10 text-2xl text-white
                    hover:bg-[#C9A96E] hover:text-black
                    md:-left-16
                  "
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() => moveImage(1)}
                  aria-label="الصورة التالية"
                  className="
                    absolute right-0 top-1/3
                    flex h-11 w-11 items-center justify-center
                    rounded-full border border-white/20
                    bg-white/10 text-2xl text-white
                    hover:bg-[#C9A96E] hover:text-black
                    md:-right-16
                  "
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default GroomJourney;
