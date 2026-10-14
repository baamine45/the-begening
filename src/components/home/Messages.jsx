import { useEffect, useState } from "react";

// استيراد اتصال Supabase
import { supabase } from "../../lib/supabase";


function Messages() {

  // --------------------------------
  // الحالة التي ستحتوي على الرسائل
  // القادمة من Supabase
  // --------------------------------
  const [messages, setMessages] = useState([]);

  // --------------------------------
  // حالة التحميل
  // --------------------------------
  const [loading, setLoading] = useState(true);

  // --------------------------------
  // حالة الخطأ
  // --------------------------------
  const [error, setError] = useState("");


  // --------------------------------
  // جلب الرسائل من Supabase
  // --------------------------------
  useEffect(() => {

    const fetchMessages = async () => {

      setLoading(true);
      setError("");


      // --------------------------------
      // جلب المشاركات المقبولة فقط
      //
      // contributors(name)
      // تعني أننا نريد أيضًا اسم
      // صاحب المشاركة من جدول contributors
      // --------------------------------
      const { data, error } = await supabase
        .from("contributions")
        .select(`
  id,
  message,
  photo_url,
  created_at,
  contributors (
    name
  )
`)
        .eq("status", "approved")
        .eq("visibility", "public")
        .order("created_at", {
          ascending: true,
        });


      // --------------------------------
      // إذا حدث خطأ
      // --------------------------------
      if (error) {

        console.error(
          "Messages fetch error:",
          error
        );

        setError(
          "تعذر تحميل الرسائل."
        );

        setLoading(false);

        return;
      }


      // --------------------------------
      // تخزين الرسائل في state
      // --------------------------------
      // إنشاء رابط مؤقت لصورة كل مساهمة عامة
const messagesWithPhotos = await Promise.all(
  (data || []).map(async (item) => {
    // بعض المساهمات قد لا تحتوي على صورة
    if (!item.photo_url) {
      return { ...item, photoSignedUrl: null };
    }

    const { data: signedData, error: signedError } =
      await supabase.storage
        .from("contribution-media")
        .createSignedUrl(item.photo_url, 60 * 60);

    if (signedError) {
      console.error("تعذر إنشاء رابط الصورة:", signedError);
      return { ...item, photoSignedUrl: null };
    }

    return {
      ...item,
      photoSignedUrl: signedData?.signedUrl || null,
    };
  })
);

setMessages(messagesWithPhotos);

      setLoading(false);
    };


    fetchMessages();

  }, []);


  // --------------------------------
  // أثناء تحميل الرسائل
  // --------------------------------
  if (loading) {
    return (
      <section
        className="
          bg-[#F8F5F0]
          text-[#252525]
          py-32
          px-6
          text-center
        "
      >
        <p className="text-gray-500">
          جاري جمع الكلمات...
        </p>
      </section>
    );
  }


  // --------------------------------
  // إذا حدث خطأ
  // --------------------------------
  if (error) {
    return (
      <section
        className="
          bg-[#F8F5F0]
          text-[#252525]
          py-32
          px-6
          text-center
        "
      >
        <p className="text-red-600">
          {error}
        </p>
      </section>
    );
  }


  return (
    <section
      className="
        bg-[#F8F5F0]
        text-[#252525]
        py-32
        px-6
        overflow-hidden
      "
    >

      {/* --------------------------------
          مقدمة القسم
          -------------------------------- */}
      <div
        className="
          max-w-2xl
          mx-auto
          text-center
          mb-24
        "
      >

        <p
          className="
            text-[#C9A96E]
            text-sm
            tracking-[0.2em]
            mb-6
          "
        >
          من الذين كانوا هناك
        </p>


        <h2
          className="
            text-4xl
            md:text-6xl
            font-light
            leading-relaxed
          "
        >
          كلمات من الأصدقاء
        </h2>


        <p
          className="
            mt-8
            text-gray-600
            text-lg
            leading-loose
          "
        >
          بعض الذكريات لا تكفيها الصور،
          <br />
          وبعض الكلمات تستحق أن تبقى.
        </p>

      </div>


      {/* --------------------------------
          الرسائل
          -------------------------------- */}

      {messages.length === 0 ? (

        // إذا لم توجد رسائل مقبولة بعد
        <div
          className="
            max-w-xl
            mx-auto
            text-center
            text-gray-500
          "
        >
          <p className="text-lg">
            لم تصل الكلمات بعد...
          </p>

          <p className="mt-3 text-sm">
            ستظهر الرسائل هنا بعد اعتمادها.
          </p>
        </div>

      ) : (

        <div
          className="
            max-w-5xl
            mx-auto
            grid
            md:grid-cols-2
            gap-10
          "
        >

          {/* --------------------------------
              نمر على الرسائل القادمة من Supabase
              -------------------------------- */}
          {messages.map((item, index) => (

            <article
              key={item.id}
              className={`
                bg-white
                p-8
                md:p-10
                shadow-sm
                border
                border-[#252525]/5

                ${
                  index % 2 === 0
                    ? "md:rotate-[-1deg]"
                    : "md:rotate-[1deg]"
                }

                transition
                duration-500
                hover:rotate-0
                hover:-translate-y-2
                hover:shadow-xl
              `}
            >

              {/* --------------------------------
                  علامة صغيرة تشبه ختم الرسالة
                  -------------------------------- */}
              <div
                className="
                  text-[#C9A96E]
                  text-3xl
                  mb-8
                "
              >
                “
              </div>


              {/* --------------------------------
                  نص الرسالة
                  -------------------------------- */}
              <p
                className="
                  text-lg
                  leading-loose
                  text-[#444]
                "
              >
                {item.message}
              </p>

{item.photoSignedUrl && (
  <img
    src={item.photoSignedUrl}
    alt="صورة من ذكريات الأصدقاء"
    loading="lazy"
    className="mt-6 w-full rounded-xl object-cover"
  />
)}
              {/* --------------------------------
                  اسم صاحب الرسالة
                  -------------------------------- */}
              <div
                className="
                  mt-10
                  pt-6
                  border-t
                  border-[#252525]/10
                "
              >

                <p
                  className="
                    text-[#C9A96E]
                    text-sm
                  "
                >
                  —
                </p>


                <p
                  className="
                    mt-2
                    text-[#252525]
                    font-medium
                  "
                >
                  {item.contributors?.name}
                </p>

              </div>

            </article>

          ))}

        </div>

      )}

    </section>
  );
}

export default Messages;