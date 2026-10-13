import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

const BUCKET_NAME = "timeline-photos";
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB لكل صورة

const initialForm = {
  section: "secondary",
  year_label: "2020 - 2021",
  title: "",
  description: "",
  sort_order: 0,
  is_published: false,
};

function safeFileName(fileName) {
  // نحتفظ بامتداد الملف ونستبدل المسافات والرموز غير المناسبة.
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function TimelineAdmin() {
  const navigate = useNavigate();

  // حالة التحقق من حساب المشرف.
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // بيانات الذكريات والصور ورسائل الصفحة.
  const [memories, setMemories] = useState([]);
  const [photosByMemory, setPhotosByMemory] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoActionId, setPhotoActionId] = useState(null);

  // بيانات النموذج والذكرى الجاري تعديلها.
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  // التحقق من المستخدم وصلاحية المشرف.
  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        if (active) navigate("/admin-login", { replace: true });
        return;
      }

      const { data: allowed, error: adminError } =
        await supabase.rpc("is_admin");

      if (!active) return;

      if (adminError) {
        setMessage("تعذر التحقق من صلاحيات المشرف: " + adminError.message);
      } else if (allowed === true) {
        setIsAdmin(true);
      } else {
        setMessage("هذا الحساب لا يملك صلاحية المشرف.");
      }

      setLoading(false);
    }

    checkAdmin();
    return () => {
      active = false;
    };
  }, [navigate]);

  // تحميل الذكريات وصورها. الصور الخاصة تُعرض عبر روابط موقّعة قصيرة العمر.
  const loadMemories = useCallback(async () => {
    const { data: memoryRows, error: memoryError } = await supabase
      .from("timeline_memories")
      .select("*")
      .order("section", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (memoryError) {
      setMessage("تعذر تحميل الذكريات: " + memoryError.message);
      return;
    }

    setMemories(memoryRows ?? []);

    const { data: photoRows, error: photoError } = await supabase
      .from("timeline_photos")
      .select("*")
      .order("sort_order", { ascending: true });

    if (photoError) {
      setMessage("تم تحميل الذكريات، لكن تعذر تحميل الصور: " + photoError.message);
      return;
    }

    const groupedPhotos = {};

    for (const photo of photoRows ?? []) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(photo.storage_path, 60 * 60);

      if (!groupedPhotos[photo.memory_id]) {
        groupedPhotos[photo.memory_id] = [];
      }

      groupedPhotos[photo.memory_id].push({
        ...photo,
        signedUrl: signedError ? null : signedData?.signedUrl,
      });
    }

    setPhotosByMemory(groupedPhotos);
  }, []);

  useEffect(() => {
    if (isAdmin) loadMemories();
  }, [isAdmin, loadMemories]);

  // تحديث قيمة أحد حقول النموذج.
  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : name === "sort_order"
            ? Number(value)
            : value,
    }));
  }

  // اختيار الصور والتحقق من نوعها وحجمها قبل رفعها.
  function handleFilesChange(event) {
    const files = Array.from(event.target.files ?? []);
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name}: الملف ليس صورة.`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: حجم الصورة أكبر من 8 ميغابايت.`);
      } else {
        validFiles.push(file);
      }
    }

    setSelectedFiles(validFiles);
    setMessage(errors.length ? errors.join(" ") : "");
  }

  // تفريغ النموذج استعدادًا لإضافة ذكرى.
  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setSelectedFiles([]);
    setMessage("");
  }

  // تحميل بيانات ذكرى موجودة داخل النموذج.
  function handleEdit(memory) {
    setEditingId(memory.id);
    setForm({
      section: memory.section,
      year_label: memory.year_label ?? "",
      title: memory.title,
      description: memory.description ?? "",
      sort_order: memory.sort_order ?? 0,
      is_published: memory.is_published,
    });
    setSelectedFiles([]);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // رفع الصور المختارة وربط كل صورة بالذكرى في جدول timeline_photos.
  async function uploadSelectedPhotos(memoryId) {
    const uploadedPaths = [];
    const photoRows = [];

    for (let index = 0; index < selectedFiles.length; index += 1) {
      const file = selectedFiles[index];
      const uniqueName = `${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const storagePath = `${memoryId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        // نحذف الملفات التي رُفعت في هذه العملية إذا تعذر رفع صورة لاحقة.
        if (uploadedPaths.length) {
          await supabase.storage.from(BUCKET_NAME).remove(uploadedPaths);
        }
        throw new Error(`تعذر رفع الصورة "${file.name}": ${uploadError.message}`);
      }

      uploadedPaths.push(storagePath);
      photoRows.push({
        memory_id: memoryId,
        storage_path: storagePath,
        alt_text: `${form.title.trim()} - صورة ${index + 1}`,
        sort_order: index,
      });
    }

    if (!photoRows.length) return;

    const { error: insertError } = await supabase
      .from("timeline_photos")
      .insert(photoRows);

    if (insertError) {
      await supabase.storage.from(BUCKET_NAME).remove(uploadedPaths);
      throw new Error("رُفعت الصور لكن تعذر تسجيلها في قاعدة البيانات: " + insertError.message);
    }
  }

  // إضافة ذكرى أو حفظ تعديلاتها ثم رفع الصور المختارة.
  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    let memoryId = editingId;

    try {
      const memoryData = {
        section: form.section,
        year_label: form.section === "secondary" ? form.year_label.trim() : null,
        title: form.title.trim(),
        description: form.description.trim(),
        sort_order: form.sort_order,
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("timeline_memories")
          .update(memoryData)
          .eq("id", editingId);

        if (error) throw new Error("تعذر حفظ الذكرى: " + error.message);
      } else {
        const { data, error } = await supabase
          .from("timeline_memories")
          .insert(memoryData)
          .select("id")
          .single();

        if (error) throw new Error("تعذر إضافة الذكرى: " + error.message);
        memoryId = data.id;
      }

      if (selectedFiles.length > 0) {
        await uploadSelectedPhotos(memoryId);
      }

      setMessage(
        selectedFiles.length
          ? "تم حفظ الذكرى ورفع الصور بنجاح."
          : editingId
            ? "تم تحديث الذكرى بنجاح."
            : "تمت إضافة الذكرى بنجاح."
      );

      setForm(initialForm);
      setEditingId(null);
      setSelectedFiles([]);
      await loadMemories();
    } catch (error) {
      setMessage(error.message || "حدث خطأ غير متوقع أثناء الحفظ.");
      // نحدّث القائمة لاحتمال أن تكون الذكرى قد حُفظت قبل تعثر رفع الصور.
      await loadMemories();
    } finally {
      setSaving(false);
    }
  }

  // نشر الذكرى أو إخفاؤها عن الزوار.
  async function togglePublished(memory) {
    setMessage("");
    const { error } = await supabase
      .from("timeline_memories")
      .update({
        is_published: !memory.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memory.id);

    if (error) {
      setMessage("تعذر تغيير حالة النشر: " + error.message);
      return;
    }

    setMessage(memory.is_published ? "تم إخفاء الذكرى." : "تم نشر الذكرى.");
    await loadMemories();
  }

  // حذف صورة من التخزين ثم حذف سجلها من جدول الصور.
  async function handleDeletePhoto(photo) {
    const confirmed = window.confirm("هل تريد حذف هذه الصورة نهائيًا؟");
    if (!confirmed) return;

    setPhotoActionId(photo.id);
    setMessage("");

    try {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([photo.storage_path]);

      if (storageError) throw new Error("تعذر حذف ملف الصورة: " + storageError.message);

      const { error: rowError } = await supabase
        .from("timeline_photos")
        .delete()
        .eq("id", photo.id);

      if (rowError) throw new Error("حُذف الملف لكن تعذر حذف سجل الصورة: " + rowError.message);

      setMessage("تم حذف الصورة.");
      await loadMemories();
    } catch (error) {
      setMessage(error.message || "تعذر حذف الصورة.");
    } finally {
      setPhotoActionId(null);
    }
  }

  // حذف ذكرى كاملة. حذف سجلات الصور مرتبط بالذاكرة عبر ON DELETE CASCADE.
  // نحذف الملفات من Storage أولًا كي لا تبقى ملفات يتيمة.
  async function handleDelete(memory) {
    const confirmed = window.confirm(
      `هل تريد حذف الذكرى "${memory.title}"؟ سيتم حذف سجلات صورها أيضًا.`
    );
    if (!confirmed) return;

    setMessage("");
    const photos = photosByMemory[memory.id] ?? [];
    const paths = photos.map((photo) => photo.storage_path);

    if (paths.length) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(paths);

      if (storageError) {
        setMessage("تعذر حذف ملفات الصور؛ لم تُحذف الذكرى: " + storageError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("timeline_memories")
      .delete()
      .eq("id", memory.id);

    if (error) {
      setMessage("تعذر حذف الذكرى: " + error.message);
      return;
    }

    if (editingId === memory.id) resetForm();
    setMessage("تم حذف الذكرى وصورها.");
    await loadMemories();
  }

  // تسجيل الخروج.
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage("تعذر تسجيل الخروج: " + error.message);
      return;
    }
    navigate("/admin-login", { replace: true });
  }

  if (loading) {
    return <main dir="rtl" className="p-10 text-center">جارٍ التحقق من صلاحيات المشرف...</main>;
  }

  if (!isAdmin) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#171717] p-8 text-center text-white">
        <p>{message || "لا تملك صلاحية الوصول إلى هذه الصفحة."}</p>
        <button
          onClick={() => navigate("/admin-login")}
          className="mt-6 rounded-full bg-[#C9A96E] px-6 py-3 text-black"
        >
          العودة إلى تسجيل الدخول
        </button>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#171717] px-4 py-8 text-white md:px-10">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-sm tracking-widest text-[#C9A96E]">THE BEGINNING — 17</p>
          <h1 className="text-3xl font-light md:text-4xl">إدارة ذكريات الخط الزمني</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-white/20 px-5 py-3 transition hover:bg-white/10"
        >
          تسجيل الخروج
        </button>
      </header>

      {/* نموذج إضافة ذكرى أو تعديلها ورفع صورها */}
      <section className="mb-12 rounded-2xl border border-white/10 bg-white/5 p-5 md:p-8">
        <h2 className="mb-6 text-2xl font-light">{editingId ? "تعديل الذكرى" : "إضافة ذكرى جديدة"}</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="section" className="mb-2 block">قسم الذكرى</label>
            <select
              id="section"
              name="section"
              value={form.section}
              onChange={handleChange}
              className="w-full rounded-xl bg-white p-3 text-black"
            >
              <option value="secondary">سنوات الثانوية</option>
              <option value="after_secondary">ما بعد الثانوية</option>
            </select>
          </div>

          {form.section === "secondary" && (
            <div>
              <label htmlFor="year_label" className="mb-2 block">السنة الدراسية</label>
              <select
                id="year_label"
                name="year_label"
                value={form.year_label}
                onChange={handleChange}
                required
                className="w-full rounded-xl bg-white p-3 text-black"
              >
                <option value="2020 - 2021">2020 - 2021</option>
                <option value="2021 - 2022">2021 - 2022</option>
                <option value="2022 - 2023">2022 - 2023</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="title" className="mb-2 block">عنوان الذكرى</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              maxLength={150}
              placeholder="مثال: بداية الحكاية"
              className="w-full rounded-xl bg-white p-3 text-black"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block">وصف الذكرى</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              maxLength={3000}
              placeholder="اكتب تفاصيل الذكرى..."
              className="w-full rounded-xl bg-white p-3 text-black"
            />
          </div>

          <div>
            <label htmlFor="sort_order" className="mb-2 block">ترتيب الذكرى (رقم أصغر يعني ظهورًا أولًا)</label>
            <input
              id="sort_order"
              name="sort_order"
              type="number"
              value={form.sort_order}
              onChange={handleChange}
              className="w-full rounded-xl bg-white p-3 text-black"
            />
          </div>

          <div>
            <label htmlFor="memory-photos" className="mb-2 block">صور الذكرى</label>
            <input
              id="memory-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesChange}
              className="w-full rounded-xl bg-white p-3 text-black"
            />
            <p className="mt-2 text-sm text-gray-400">يمكنك اختيار عدة صور. الحد الأقصى 8 ميغابايت للصورة الواحدة.</p>
            {selectedFiles.length > 0 && (
              <div className="mt-3 rounded-xl border border-white/10 p-3">
                <p className="mb-2 text-sm text-[#C9A96E]">الصور المختارة: {selectedFiles.length}</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-gray-300">
                  {selectedFiles.map((file) => <li key={`${file.name}-${file.size}`}>{file.name}</li>)}
                </ul>
              </div>
            )}
            {editingId && <p className="mt-2 text-sm text-gray-400">الصور الجديدة ستُضاف إلى صور هذه الذكرى الحالية.</p>}
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_published"
              checked={form.is_published}
              onChange={handleChange}
              className="h-5 w-5 accent-[#C9A96E]"
            />
            نشر الذكرى للزوار فور الحفظ
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#C9A96E] px-7 py-3 text-black transition hover:bg-white disabled:opacity-50"
            >
              {saving ? "جارٍ الحفظ ورفع الصور..." : editingId ? "حفظ التعديلات" : "إضافة الذكرى"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-white/20 px-7 py-3 hover:bg-white/10"
              >
                إلغاء التعديل
              </button>
            )}
          </div>
        </form>

        {message && (
          <p role="status" aria-live="polite" className="mt-5 rounded-xl border border-white/10 p-4 text-sm leading-loose">
            {message}
          </p>
        )}
      </section>

      {/* قائمة الذكريات وصورها المسجلة */}
      <section>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-light">الذكريات المسجلة</h2>
          <button
            type="button"
            onClick={loadMemories}
            className="rounded-full border border-white/20 px-5 py-2 hover:bg-white/10"
          >
            تحديث القائمة
          </button>
        </div>

        {memories.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
            لا توجد ذكريات في قاعدة البيانات حتى الآن.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {memories.map((memory) => {
              const memoryPhotos = photosByMemory[memory.id] ?? [];

              return (
                <article key={memory.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-white/10 px-3 py-1">
                      {memory.section === "secondary" ? "سنوات الثانوية" : "ما بعد الثانوية"}
                    </span>
                    <span className={`rounded-full px-3 py-1 ${memory.is_published ? "bg-green-900/50 text-green-300" : "bg-yellow-900/40 text-yellow-200"}`}>
                      {memory.is_published ? "منشورة" : "مخفية"}
                    </span>
                  </div>

                  {memory.year_label && <p dir="ltr" className="mb-2 text-[#C9A96E]">{memory.year_label}</p>}
                  <h3 className="mb-3 text-xl">{memory.title}</h3>
                  <p className="mb-5 whitespace-pre-wrap leading-loose text-gray-300">{memory.description || "لا يوجد وصف."}</p>
                  <p className="mb-3 text-sm text-gray-400">الترتيب: {memory.sort_order}</p>

                  <div className="mb-5">
                    <p className="mb-3 text-sm text-gray-300">الصور ({memoryPhotos.length})</p>
                    {memoryPhotos.length === 0 ? (
                      <p className="text-sm text-gray-500">لم تُرفع صور لهذه الذكرى بعد.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {memoryPhotos.map((photo) => (
                          <div key={photo.id} className="overflow-hidden rounded-xl border border-white/10">
                            {photo.signedUrl ? (
                              <img src={photo.signedUrl} alt={photo.alt_text || memory.title} className="h-36 w-full object-cover" />
                            ) : (
                              <div className="flex h-36 items-center justify-center p-2 text-center text-xs text-gray-400">تعذر إنشاء رابط الصورة</div>
                            )}
                            <button
                              type="button"
                              disabled={photoActionId === photo.id}
                              onClick={() => handleDeletePhoto(photo)}
                              className="w-full border-t border-white/10 px-2 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {photoActionId === photo.id ? "جارٍ الحذف..." : "حذف الصورة"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => handleEdit(memory)} className="rounded-full border border-white/20 px-4 py-2 hover:bg-white/10">تعديل</button>
                    <button type="button" onClick={() => togglePublished(memory)} className="rounded-full bg-[#C9A96E] px-4 py-2 text-black hover:bg-white">{memory.is_published ? "إخفاء" : "نشر"}</button>
                    <button type="button" onClick={() => handleDelete(memory)} className="rounded-full border border-red-400/40 px-4 py-2 text-red-300 hover:bg-red-500/10">حذف الذكرى</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default TimelineAdmin;
