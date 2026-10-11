// نستورد بيانات التسجيلات
import audioData from "../../data/audioData";

function AudioMessages() {
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
          أصوات من الماضي
        </p>

        <h2
          className="
            text-4xl
            md:text-6xl
            font-light
          "
        >
          هل تريد أن تسمعهم؟
        </h2>

        <p
          className="
            mt-8
            text-gray-400
            text-lg
            leading-loose
          "
        >
          بعض الكلمات أجمل عندما نسمع صوت صاحبها.
        </p>

      </div>


      {/* --------------------------------
          قائمة التسجيلات
          -------------------------------- */}
      <div
        className="
          max-w-3xl
          mx-auto
          space-y-6
        "
      >

        {audioData.map((item, index) => (

          <div
            key={index}
            className="
              border
              border-white/10
              rounded-2xl
              p-6
              md:p-8
              bg-white/5
              transition
              duration-500
              hover:border-[#C9A96E]/40
            "
          >

            {/* اسم صاحب التسجيل */}
            <div
              className="
                flex
                items-center
                justify-between
                mb-6
              "
            >

              <div>

                <p
                  className="
                    text-[#C9A96E]
                    text-lg
                  "
                >
                  {item.name}
                </p>

                <p
                  className="
                    mt-2
                    text-gray-500
                    text-sm
                  "
                >
                  {item.message}
                </p>

              </div>

              {/* رقم التسجيل */}
              <span
                className="
                  text-gray-600
                  text-sm
                "
                dir="ltr"
              >
                0{index + 1}
              </span>

            </div>


            {/* --------------------------------
                مشغل الصوت
                -------------------------------- */}

            {item.audio ? (

              // إذا كان لدينا ملف صوتي
              // نعرض مشغل الصوت.
              <audio
                controls
                src={item.audio}
                className="w-full"
              />

            ) : (

              // لا يوجد تسجيل حقيقي حتى الآن.
              <div
                className="
                  h-12
                  rounded-xl
                  bg-black/20
                  border
                  border-white/5
                  flex
                  items-center
                  justify-center
                  text-gray-600
                  text-sm
                "
              >
                التسجيل سيظهر هنا
              </div>

            )}

          </div>

        ))}

      </div>

    </section>
  );
}

export default AudioMessages;