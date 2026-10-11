// نستورد بعض الصور مؤقتًا.
// سنرتبها لاحقًا حسب مراحل حياة العريس.
import photo2 from "../../assets/memories/photo2.jpeg";
import photo3 from "../../assets/memories/photo3.jpeg";

function GroomJourney() {
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

      {/* مقدمة المرحلة الجديدة */}
      <div
        className="
          max-w-3xl
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
          وما بعد الثانوية
        </p>

        <h2
          className="
            text-4xl
            md:text-6xl
            font-light
            leading-relaxed
          "
        >
          ثم كبرت الحكاية...
        </h2>

        <p
          className="
            mt-8
            text-gray-600
            text-lg
            leading-loose
          "
        >
          تغيّرت الأيام، وكبرت الأحلام،
          <br />
          لكن بعض الذكريات بقيت معنا.
        </p>

      </div>


      {/* صور العريس */}
      <div
        className="
          max-w-5xl
          mx-auto
          grid
          md:grid-cols-2
          gap-8
        "
      >

        {/* الصورة الأولى */}
        <div
          className="
            overflow-hidden
            rounded-2xl
            shadow-xl
          "
        >
          <img
            src={photo2}
            alt="ذكرى من رحلة العريس"
            className="
              w-full
              h-[500px]
              object-cover
              transition
              duration-700
              hover:scale-105
            "
          />
        </div>


        {/* الصورة الثانية */}
        <div
          className="
            overflow-hidden
            rounded-2xl
            shadow-xl
            md:mt-24
          "
        >
          <img
            src={photo3}
            alt="ذكرى من رحلة العريس"
            className="
              w-full
              h-[500px]
              object-cover
              transition
              duration-700
              hover:scale-105
            "
          />
        </div>

      </div>


      {/* الانتقال إلى الحاضر */}
      <div
        className="
          text-center
          mt-32
        "
      >

        {/* سهم الانتقال */}
        <div
          className="
            text-[#C9A96E]
            text-3xl
            mb-12
          "
        >
          ↓
        </div>

        <p
          className="
            text-[#C9A96E]
            text-sm
            tracking-[0.2em]
            mb-6
          "
        >
          واليوم...
        </p>

        <h3
          className="
            text-5xl
            md:text-7xl
            font-light
          "
          dir="ltr"
        >
          17 أكتوبر 2026
        </h3>

        <p
          className="
            mt-8
            text-gray-600
            text-xl
          "
        >
          بداية فصل جديد
        </p>

      </div>

    </section>
  );
}

// مهم جدًا:
// هذا يجعل GroomJourney متاحًا للاستيراد في App.jsx.
export default GroomJourney;