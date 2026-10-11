import { useEffect, useState } from "react";

function Countdown({ event }) {

  // --------------------------------
  // الحالة التي تحتوي على الوقت المتبقي
  // --------------------------------
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });


  // --------------------------------
  // useEffect
  //
  // نستخدمه لتشغيل المؤقت وتحديثه
  // كل ثانية.
  // --------------------------------
  useEffect(() => {

    // تاريخ المناسبة القادم من Supabase
    const targetDate = new Date(event.event_date);


    // --------------------------------
    // دالة حساب الوقت المتبقي
    // --------------------------------
    function calculateTime() {

      // الوقت الحالي
      const now = new Date();

      // الفرق بين موعد المناسبة والوقت الحالي
      const difference = targetDate - now;


      // --------------------------------
      // إذا انتهى العد التنازلي
      // --------------------------------
      if (difference <= 0) {

        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        });

        return;
      }


      // --------------------------------
      // حساب الأيام
      // --------------------------------
      const days = Math.floor(
        difference / (1000 * 60 * 60 * 24)
      );


      // --------------------------------
      // حساب الساعات
      // --------------------------------
      const hours = Math.floor(
        (difference / (1000 * 60 * 60)) % 24
      );


      // --------------------------------
      // حساب الدقائق
      // --------------------------------
      const minutes = Math.floor(
        (difference / (1000 * 60)) % 60
      );


      // --------------------------------
      // حساب الثواني
      // --------------------------------
      const seconds = Math.floor(
        (difference / 1000) % 60
      );


      // --------------------------------
      // تحديث الحالة
      // --------------------------------
      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
      });
    }


    // --------------------------------
    // حساب الوقت مباشرة عند تشغيل المكوّن
    // --------------------------------
    calculateTime();


    // --------------------------------
    // تحديث العداد كل ثانية
    // --------------------------------
    const timer = setInterval(
      calculateTime,
      1000
    );


    // --------------------------------
    // تنظيف المؤقت عند مغادرة المكوّن
    // --------------------------------
    return () => {
      clearInterval(timer);
    };

  }, [event]);


  return (
    <section
      className="
        bg-[#171717]
        text-white
        min-h-screen
        flex
        items-center
        justify-center
        text-center
        px-6
        relative
        overflow-hidden
      "
    >

      {/* --------------------------------
          توهج ذهبي خفيف في الخلفية
          -------------------------------- */}
      <div
        className="
          absolute
          w-[500px]
          h-[500px]
          rounded-full
          bg-[#C9A96E]/10
          blur-[120px]
        "
      />


      {/* --------------------------------
          محتوى العداد
          -------------------------------- */}
      <div
        className="
          relative
          z-10
          max-w-4xl
          w-full
        "
      >

        {/* --------------------------------
            العنوان الصغير
            -------------------------------- */}
        <p
          className="
            text-[#C9A96E]
            text-sm
            tracking-[0.2em]
            mb-8
          "
        >
          واليوم...
        </p>


        {/* --------------------------------
            العنوان الرئيسي
            -------------------------------- */}
        <h2
          className="
            text-4xl
            md:text-6xl
            font-light
          "
        >
          لم يبقَ الكثير
        </h2>


        {/* --------------------------------
            الوصف
            -------------------------------- */}
        <p
          className="
            mt-6
            text-gray-400
            text-lg
          "
        >
          على بداية فصل جديد
        </p>


        {/* --------------------------------
            تاريخ المناسبة
            --------------------------------
            التاريخ هنا يأتي من Supabase
            بدل كتابته يدويًا.
            -------------------------------- */}
        <p
          dir="ltr"
          className="
            mt-10
            text-[#C9A96E]
            text-2xl
            md:text-3xl
            font-light
          "
        >
          {new Date(event.event_date).toLocaleDateString(
            "ar-EG",
            {
              day: "numeric",
              month: "long",
              year: "numeric",
            }
          )}
        </p>


        {/* --------------------------------
            أرقام العد التنازلي
            -------------------------------- */}
        <div
          className="
            mt-16
            grid
            grid-cols-2
            md:grid-cols-4
            gap-4
            max-w-3xl
            mx-auto
          "
        >

          {/* --------------------------------
              الأيام
              -------------------------------- */}
          <div
            className="
              border
              border-white/10
              rounded-2xl
              p-6
              bg-white/5
            "
          >
            <p
              dir="ltr"
              className="
                text-4xl
                md:text-5xl
                font-light
              "
            >
              {timeLeft.days}
            </p>

            <p className="mt-3 text-gray-500">
              يوم
            </p>
          </div>


          {/* --------------------------------
              الساعات
              -------------------------------- */}
          <div
            className="
              border
              border-white/10
              rounded-2xl
              p-6
              bg-white/5
            "
          >
            <p
              dir="ltr"
              className="
                text-4xl
                md:text-5xl
                font-light
              "
            >
              {String(timeLeft.hours).padStart(2, "0")}
            </p>

            <p className="mt-3 text-gray-500">
              ساعة
            </p>
          </div>


          {/* --------------------------------
              الدقائق
              -------------------------------- */}
          <div
            className="
              border
              border-white/10
              rounded-2xl
              p-6
              bg-white/5
            "
          >
            <p
              dir="ltr"
              className="
                text-4xl
                md:text-5xl
                font-light
              "
            >
              {String(timeLeft.minutes).padStart(2, "0")}
            </p>

            <p className="mt-3 text-gray-500">
              دقيقة
            </p>
          </div>


          {/* --------------------------------
              الثواني
              -------------------------------- */}
          <div
            className="
              border
              border-white/10
              rounded-2xl
              p-6
              bg-white/5
            "
          >
            <p
              dir="ltr"
              className="
                text-4xl
                md:text-5xl
                font-light
              "
            >
              {String(timeLeft.seconds).padStart(2, "0")}
            </p>

            <p className="mt-3 text-gray-500">
              ثانية
            </p>
          </div>

        </div>

      </div>

    </section>
  );
}

export default Countdown;