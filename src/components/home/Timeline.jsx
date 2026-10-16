

import { useEffect, useState } from "react";


import { supabase } from "../../lib/supabase";



const BUCKET_NAME = "timeline-photos";



function Timeline() {

  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  const [lightbox, setLightbox] = useState(null);
  // التعليقات مرتبطة بمعرّف الصورة المحفوظة في Supabase فقط.
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [contributorLoading, setContributorLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [sendingComment, setSendingComment] = useState(false);



  // تحميل الذكريات المنشورة من Supabase.

  useEffect(() => {

    let active = true;



    async function loadMemories() {

      setLoading(true);

      setLoadError("");



      try {

        const { data: memories, error: memoriesError } = await supabase

          .from("timeline_memories")

          .select(

            "id, section, year_label, title, description, sort_order, created_at"

          )

          // هذا القسم يعرض سنوات الثانوية فقط؛ ذكريات ما بعد الثانوية يعرضها GroomJourney.
          .eq("section", "secondary")
          .eq("is_published", true)

          .order("section", { ascending: true })

          .order("sort_order", { ascending: true })

          .order("created_at", { ascending: true });



        if (memoriesError) throw memoriesError;

        if (!memories || memories.length === 0) {
  if (active) setItems([]);
  return;
}


        // تحميل الصور التابعة للذكريات المنشورة.

        const { data: photos, error: photosError } = await supabase

          .from("timeline_photos")

          .select("id, memory_id, storage_path, alt_text, title, description, sort_order")

          .order("sort_order", { ascending: true });



        if (photosError) throw photosError;



        const photosByMemory = {};



        for (const photo of photos ?? []) {

          const { data: signedData, error: signedError } =

            await supabase.storage

              .from(BUCKET_NAME)

              .createSignedUrl(photo.storage_path, 60 * 60);



          if (signedError || !signedData?.signedUrl) {

            console.error("تعذر تحميل الصورة:", signedError);

            continue;

          }



          if (!photosByMemory[photo.memory_id]) {

            photosByMemory[photo.memory_id] = [];

          }



          photosByMemory[photo.memory_id].push({

            id: photo.id,

            url: signedData.signedUrl,

            alt_text: photo.alt_text || "",
            title: photo.title || "",
            description: photo.description || "",

            // نميّز صور Supabase عن الصور المحلية حتى نحمّل تعليقاتها فقط.

            isDatabasePhoto: true,

          });

        }



        // السنة هنا اختيارية؛ إذا كانت فارغة نحفظها كسلسلة فارغة.

        const databaseItems = memories.map((memory) => ({

          id: memory.id,

          section: memory.section,

          year: memory.year_label || "",

          title: memory.title,

          description: memory.description || "",

          images: photosByMemory[memory.id] || [],

        }));




// عرض الذكريات المنشورة من Supabase فقط
if (active) {
  setItems(databaseItems);
}


        if (active) {

         setItems(databaseItems);

        }

      } catch (error) {

        console.error("خطأ في تحميل الذكريات:", error);



        if (active) {
setLoadError(
  `تعذر تحميل الذكريات: ${error?.message || "سبب غير معروف"}`
);

         setItems([]);

        }

      } finally {

        if (active) setLoading(false);

      }

    }



    loadMemories();



    return () => {

      active = false;

    };

  }, []);



  // دعم الصور المحلية وصور Supabase معًا.

  function normalizeImages(images, title) {

    return (images || []).map((image, index) => {

      if (typeof image === "string") {

        return {

          id: `${title}-${index}`,

          url: image,

          alt_text: `${title} - صورة ${index + 1}`,

        };

      }



      return {

        ...image,

        alt_text: image.alt_text || `${title} - صورة ${index + 1}`,

      };

    });

  }



  // متابعة حالة تسجيل الدخول دون إنشاء نظام حسابات جديد.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data?.user ?? null);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // جلب اسم المشارك تلقائيًا من جدول contributors بعد تسجيل الدخول.
  // لا نسمح بالتعليق لمجرد تسجيل الدخول؛ يجب وجود سجل مشارك مرتبط بالحساب.
  useEffect(() => {
    let active = true;

    async function loadContributor() {
      setContributorName("");
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
        setCommentError("تعذر التحقق من حساب المشارك. حاول تحديث الصفحة.");
        setContributorName("");
      } else {
        setContributorName(data?.name?.trim() || "");
      }
      setContributorLoading(false);
    }

    loadContributor();
    return () => { active = false; };
  }, [user]);

  // تحميل تعليقات الصورة المفتوحة كلما انتقل المستخدم إلى صورة أخرى.
  const activePhoto = lightbox?.images?.[lightbox.index];
  const activePhotoId = activePhoto?.isDatabasePhoto ? activePhoto.id : null;

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
    supabase.from("timeline_comments")
      .select("id, photo_id, author_name, content, created_at")
      .eq("photo_id", activePhotoId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setCommentError("تعذر تحميل التعليقات: " + error.message);
        else setComments(data ?? []);
        setCommentsLoading(false);
      });
    return () => { active = false; };
  }, [activePhotoId]);

  async function submitComment(event) {
    event.preventDefault();
    const content = commentText.trim();
    const name = contributorName.trim();
    if (!user || !activePhotoId || !name) {
      setCommentError("يجب تسجيل الدخول بحساب مشارك معتمد لإضافة تعليق.");
      return;
    }
    if (!content || content.length > 1000) {
      setCommentError("أدخل تعليقًا من 1 إلى 1000 حرف.");
      return;
    }
    setSendingComment(true);
    setCommentError("");
    const photoId = activePhotoId;
    const { error } = await supabase.from("timeline_comments").insert({
      photo_id: photoId,
      user_id: user.id,
      author_name: name,
      content,
    });
    if (error) {
      setCommentError("تعذر إرسال التعليق: " + error.message);
    } else {
      setCommentText("");
      const { data, error: reloadError } = await supabase.from("timeline_comments")
        .select("id, photo_id, author_name, content, created_at")
        .eq("photo_id", photoId)
        .order("created_at", { ascending: true });
      if (reloadError) setCommentError("تم الإرسال، لكن تعذر تحديث التعليقات.");
      else if (activePhotoId === photoId) setComments(data ?? []);
    }
    setSendingComment(false);
  }

  // إغلاق نافذة الصور والتنقل باستخدام لوحة المفاتيح.

  useEffect(() => {

    function handleKeyDown(event) {

      if (event.key === "Escape") {

        setLightbox(null);

        return;

      }



      if (!lightbox || lightbox.images.length < 2) return;



      if (event.key === "ArrowRight") {

        setLightbox((current) => ({

          ...current,

          index: (current.index + 1) % current.images.length,

        }));

      }



      if (event.key === "ArrowLeft") {

        setLightbox((current) => ({

          ...current,

          index:

            (current.index - 1 + current.images.length) %

            current.images.length,

        }));

      }

    }



    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [lightbox]);



  function moveImage(direction) {

    setLightbox((current) => ({

      ...current,

      index:

        (current.index + direction + current.images.length) %

        current.images.length,

    }));

  }



  return (

    <section className="relative overflow-hidden bg-[#171717] px-5 py-24 text-white md:px-8 md:py-32">

      {/* خلفية بسيطة بلمسات ذهبية */}

      <div className="pointer-events-none absolute -top-40 left-0 h-96 w-96 rounded-full bg-[#C9A96E]/5 blur-3xl" />



      {/* مقدمة القسم */}

      <header className="relative mx-auto mb-16 max-w-3xl text-center md:mb-24">

        <p className="mb-5 text-xs tracking-[0.35em] text-[#C9A96E] md:text-sm">

          حكايتنا المشتركة

        </p>



        <h2 className="text-4xl font-light leading-tight md:text-6xl">

          ذكريات

          <span className="mt-2 block text-[#C9A96E]">

            تبقى معنا

          </span>

        </h2>



        <div className="mx-auto mt-7 h-px w-16 bg-[#C9A96E]/70" />



        <p className="mx-auto mt-6 max-w-xl text-sm leading-8 text-gray-400 md:text-base">

          لحظات جمعتنا، وحكايات صنعت صداقتنا، وصور تحفظ أجمل ما عشنا.

        </p>



        {loading && (

          <p className="mt-5 text-sm text-gray-400">

            جارٍ تحميل الذكريات...

          </p>

        )}



        {loadError && (

          <p role="status" className="mt-5 text-sm text-amber-300">

            {loadError}

          </p>

        )}

      </header>



      {/* تجميع الذكريات حسب القسم والسنة الدراسية مع الحفاظ على ترتيب المشرف */}
      {(() => {
        const groupMap = new Map();

        items.forEach((item, itemIndex) => {
          const year = String(item.year || "").trim();
          // القسم المخزن في قاعدة البيانات هو المرجع الأساسي:
          // صور "ما بعد الثانوية" لا تُنقل إلى قسم الثانوية بسبب وجود سنة.
          const section = item.section === "after_secondary"
            ? "after_secondary"
            : "secondary";
          const groupLabel = section === "secondary"
            ? (year || "ذكريات من سنوات الثانوية")
            : "كبرت الحكاية";
          const groupKey = `${section}::${groupLabel}`;

          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, { key: groupKey, label: groupLabel, section, items: [] });
          }

          groupMap.get(groupKey).items.push({ item, itemIndex });
        });

        const yearOrder = ["2020 - 2021", "2021 - 2022", "2022 - 2023"];
        const groups = Array.from(groupMap.values()).sort((a, b) => {
          if (a.section !== b.section) {
            return a.section === "secondary" ? -1 : 1;
          }
          if (a.section !== "secondary") return 0;
          const ai = yearOrder.indexOf(a.label);
          const bi = yearOrder.indexOf(b.label);
          if (ai === -1 && bi === -1) return a.label.localeCompare(b.label, "ar");
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });

        return (
          <div className="relative mx-auto max-w-7xl space-y-14 md:space-y-20">
            {groups.map((group) => (
              <section key={group.key} aria-label={group.label}>
                <header className="mb-6 flex items-center gap-4 md:mb-8">
                  <span className="h-px flex-1 bg-[#C9A96E]/30" />
                  <div className="text-center">
                    <p className="text-xs tracking-[0.2em] text-[#C9A96E]">
                      {group.section === "secondary" ? "من ذاكرة الثانوية" : "فصل جديد من الحكاية"}
                    </p>
                    <h3 className="mt-2 text-xl font-light text-white md:text-2xl">
                      {group.label}
                    </h3>
                  </div>
                  <span className="h-px flex-1 bg-[#C9A96E]/30" />
                </header>

                <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
                  {group.items.map(({ item, itemIndex }) => {
                    const images = normalizeImages(item.images, item.title);
                    const year = String(item.year || "").trim();

                    // إذا كانت للذكرى عدة صور، نعرض كل صورة في بطاقة مستقلة ومتناسقة.
                    if (images.length === 0) {
                      return (
                        <article
                          key={item.id || `${item.title}-${itemIndex}`}
                          className="h-full overflow-hidden rounded-2xl border border-white/10 bg-[#1D1D1D] p-6 shadow-lg shadow-black/10 transition hover:border-[#C9A96E]/30"
                        >
                          {year && <p dir="ltr" className="mb-3 text-sm tracking-wider text-[#C9A96E]">{year}</p>}
                          <h4 className="text-xl font-light leading-relaxed">{item.title}</h4>
                          {item.description && <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-gray-300">{item.description}</p>}
                          <p className="mt-4 text-xs text-gray-500">لا توجد صور مرفقة بهذه الذكرى.</p>
                        </article>
                      );
                    }

                    return images.map((image, imageIndex) => (
                      <article
                        key={`${item.id || item.title}-${image.id || imageIndex}`}
                        className="group overflow-hidden rounded-2xl border border-white/10 bg-[#1D1D1D] shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-[#C9A96E]/40 hover:shadow-xl hover:shadow-black/20"
                      >
                        <button
                          type="button"
                          onClick={() => setLightbox({ images, index: imageIndex, title: image.title || item.title })}
                          aria-label={`فتح الصورة ${imageIndex + 1} من ${item.title}`}
                          className="relative block aspect-[4/3] w-full overflow-hidden bg-black/30 text-right focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#C9A96E]"
                        >
                          <img
                            src={image.url}
                            alt={image.alt_text || item.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-70" />
                          <span className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white transition group-hover:border-[#C9A96E] group-hover:bg-[#C9A96E] group-hover:text-black">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
                              <circle cx="11" cy="11" r="6.5" />
                              <path d="m16 16 4 4 M11 8v6 M8 11h6" />
                            </svg>
                          </span>
                        </button>

                        {/* عنوان الذكرى ووصفها ظاهران أسفل الصورة دون الحاجة إلى فتحها */}
                        <div className="p-5 md:p-6">
                          {year && <p dir="ltr" className="mb-2 text-xs tracking-[0.16em] text-[#C9A96E]">{year}</p>}
                          <h4 className="text-lg font-medium leading-relaxed text-white md:text-xl">{image.title || item.title}</h4>
                          {(image.description || item.description) && (
                            <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-gray-300">
                              {image.description || item.description}
                            </p>
                          )}
                          {images.length > 1 && (
                            <p className="mt-4 border-t border-white/10 pt-3 text-xs text-gray-500">
                              الصورة {imageIndex + 1} من {images.length} · اضغط لعرض الصور والتعليقات
                            </p>
                          )}
                        </div>
                      </article>
                    ));
                  })}
                </div>
              </section>
            ))}
          </div>
        );
      })()}

      {/* نافذة تكبير الصور */}

      {lightbox && lightbox.images.length > 0 && (

        <div

          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/95 p-4 pt-20 backdrop-blur-md md:p-10 md:pt-16"

          role="dialog"

          aria-modal="true"

          aria-label="عارض الصور"

          onClick={() => setLightbox(null)}

        >

          <button

            type="button"

            onClick={() => setLightbox(null)}

            aria-label="إغلاق الصورة"

            className="absolute right-5 top-5 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-white transition hover:bg-[#C9A96E] hover:text-black"

          >

            ×

          </button>



          <div

            className="relative flex w-full max-w-5xl flex-col items-center pb-12"

            onClick={(event) => event.stopPropagation()}

          >

            <img

              key={lightbox.images[lightbox.index].url}

              src={lightbox.images[lightbox.index].url}

              alt={lightbox.images[lightbox.index].alt_text}

              className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"

            />



            <p className="mt-5 text-center text-sm text-[#C9A96E]">
              {lightbox.images[lightbox.index].title || lightbox.title}
            </p>
            {(lightbox.images[lightbox.index].description) && (
              <p className="mt-3 max-w-3xl whitespace-pre-line text-center text-sm leading-7 text-gray-300">
                {lightbox.images[lightbox.index].description}
              </p>
            )}



            <p className="mt-2 text-xs text-gray-400" dir="ltr">

              {lightbox.index + 1} / {lightbox.images.length}

            </p>



                          {/* التعليقات تظهر للصور المنشورة من قاعدة البيانات فقط. */}
              {activePhotoId && (
                <div dir="rtl" className="mt-8 w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1D1D1D] p-5 text-right md:p-7">
                  <h3 className="mb-5 text-lg text-[#C9A96E]">تعليقات الصورة ({comments.length})</h3>
                  {commentsLoading && <p className="text-sm text-gray-400">جارٍ تحميل التعليقات...</p>}
                  {!commentsLoading && comments.length === 0 && (
                    <p className="text-sm text-gray-400">لا توجد تعليقات بعد. كن أول من يعلّق.</p>
                  )}
                  <div className="max-h-64 space-y-4 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-b border-white/10 pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-sm font-medium text-[#C9A96E]">{comment.author_name}</strong>
                          <time className="text-xs text-gray-500" dateTime={comment.created_at}>
                            {new Date(comment.created_at).toLocaleDateString("ar")}
                          </time>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-gray-200">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                  {commentError && <p role="alert" className="mt-4 text-sm text-red-300">{commentError}</p>}
                  {!user ? (
                    <p className="mt-5 text-sm text-gray-400">سجّل الدخول بحسابك للمشاركة حتى تتمكن من كتابة تعليق.</p>
                  ) : contributorLoading ? (
                    <p className="mt-5 text-sm text-gray-400">جارٍ التحقق من حساب المشارك...</p>
                  ) : contributorName ? (
                    <form onSubmit={submitComment} className="mt-6 space-y-3">
                      <p className="text-sm text-gray-400">
                        التعليق باسم: <strong className="text-[#C9A96E]">{contributorName}</strong>
                      </p>
                      <textarea
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        maxLength={1000}
                        rows={3}
                        required
                        placeholder="اكتب تعليقك على هذه الصورة..."
                        className="w-full resize-y rounded-lg border border-white/20 bg-black/30 p-3 text-sm text-white outline-none focus:border-[#C9A96E]"
                      />
                      <button type="submit" disabled={sendingComment} className="rounded-lg bg-[#C9A96E] px-5 py-2.5 text-sm font-medium text-black disabled:opacity-50">
                        {sendingComment ? "جارٍ الإرسال..." : "نشر التعليق"}
                      </button>
                    </form>
                  ) : (
                    <p className="mt-5 text-sm text-amber-200">هذا الحساب غير مرتبط بسجل مشارك. استخدم حساب المشاركة المعتمد لإضافة تعليق.</p>
                  )}
                </div>
              )}

{lightbox.images.length > 1 && (

              <>

                <button

                  type="button"

                  onClick={() => moveImage(-1)}

                  aria-label="الصورة السابقة"

                  className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-white transition hover:bg-[#C9A96E] hover:text-black md:-left-16"

                >

                  ‹

                </button>



                <button

                  type="button"

                  onClick={() => moveImage(1)}

                  aria-label="الصورة التالية"

                  className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-white transition hover:bg-[#C9A96E] hover:text-black md:-right-16"

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



export default Timeline;
