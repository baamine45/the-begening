// نستورد بيانات السنوات والصور
import timelineData from "../../data/timelineData";

function Timeline() {
  return (
    <section
      className="
        bg-[#171717]
        text-white
        py-32
        px-6
        overflow-hidden
      "
    >
      {/* عنوان قسم الخط الزمني */}
      <div className="text-center max-w-2xl mx-auto mb-24">
        <p
          className="
            text-[#C9A96E]
            text-sm
            tracking-[0.2em]
            mb-6
          "
        >
          رحلتنا
        </p>

        <h2
          className="
            text-4xl
            md:text-6xl
            font-light
          "
        >
          سنوات أصبحت ذكريات
        </h2>
      </div>

      {/* الحاوية الرئيسية للـ Timeline */}
      <div className="max-w-5xl mx-auto relative">

        {/* الخط العمودي */}
        <div
          className="
            absolute
            right-4
            md:right-1/2
            top-0
            bottom-0
            w-px
            bg-[#C9A96E]/30
            md:-translate-x-1/2
          "
        />

        {/* نمر على السنوات */}
        {timelineData.map((item, index) => {

          // نحدد هل المحطة زوجية أم فردية
          const isEven = index % 2 === 0;

          return (
            <div
              key={item.year}
              className="
                relative
                mb-32
                min-h-[300px]
              "
            >

              {/* الدائرة الموجودة على الخط */}
              <div
                className="
                  absolute
                  right-4
                  md:right-1/2
                  top-6
                  w-4
                  h-4
                  rounded-full
                  bg-[#C9A96E]
                  border-4
                  border-[#171717]
                  md:-translate-x-1/2
                  z-20
                "
              />

              {/* محتوى السنة */}
              <div
                className={`
                  pr-14
                  md:pr-0
                  md:w-1/2

                  ${
                    isEven
                      ? "md:ml-0 md:mr-auto md:pr-12"
                      : "md:ml-auto md:mr-0 md:pl-12"
                  }
                `}
              >

                {/* السنة */}
                <p
                  dir="ltr"
                  className="
                    text-[#C9A96E]
                    text-lg
                    md:text-xl
                    mb-4
                    font-light
                  "
                >
                  {item.year}
                </p>

                {/* --------------------------------
                    معرض الصور
                    -------------------------------- */}
                <div
                  className="
                    grid
                    grid-cols-2
                    gap-3
                    mb-8
                  "
                >

                  {/* نمر على صور السنة */}
                  {item.images.map((image, imageIndex) => (

                    <div
                      key={imageIndex}
                      className={`
                        overflow-hidden
                        rounded-2xl
                        border
                        border-white/10
                        bg-white/5

                        ${
                          imageIndex === 0
                            ? "col-span-2 h-64"
                            : "h-40"
                        }
                      `}
                    >

                      <img
                        src={image}
                        alt={`${item.title} - صورة ${imageIndex + 1}`}
                        className="
                          w-full
                          h-full
                          object-cover
                          transition
                          duration-700
                          hover:scale-105
                        "
                      />

                    </div>

                  ))}

                </div>

                {/* عنوان الذكرى */}
                <h3
                  className="
                    text-2xl
                    md:text-3xl
                    font-light
                  "
                >
                  {item.title}
                </h3>

                {/* وصف الذكرى */}
                <p
                  className="
                    mt-4
                    text-gray-400
                    leading-loose
                    max-w-md
                  "
                >
                  {item.description}
                </p>

              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Timeline;