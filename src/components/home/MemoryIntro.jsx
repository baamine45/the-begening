function MemoryIntro() {
  return (
    <section
      id="memories"
      className="
        min-h-screen
        bg-[#F8F5F0]
        text-[#252525]
        flex
        items-center
        justify-center
        text-center
        px-6
        relative
        overflow-hidden
      "
    >
      {/* 
        دائرة ذهبية خفيفة في الخلفية.
        نستخدمها لإعطاء القسم عمقًا بصريًا.
      */}
      <div
        className="
          absolute
          w-80
          h-80
          rounded-full
          bg-[#C9A96E]/10
          blur-[100px]
        "
      />

      {/* 
        المحتوى فوق الخلفية.
        relative + z-10 يضمنان ظهوره فوق التوهج.
      */}
      <div className="relative z-10 max-w-2xl">

        {/* اسم القسم */}
        <p
          className="
            text-[#C9A96E]
            text-sm
            tracking-[0.2em]
            mb-8
          "
        >
          الذكريات
        </p>

        {/* السؤال الرئيسي */}
        <h2
          className="
            text-4xl
            md:text-6xl
            font-light
            leading-relaxed
          "
        >
          هل تتذكر تلك الأيام؟
        </h2>

        {/* النص */}
        <p
          className="
            mt-8
            text-gray-600
            text-lg
            md:text-xl
            leading-loose
          "
        >
          أيامٌ بدأت فيها الحكاية،
          <br />
          ووجوهٌ أصبحت جزءًا من أجمل الذكريات.
        </p>

        {/* 
          هذا العنصر مجرد إشارة بصرية للمستخدم
          بأن هناك المزيد في الأسفل.
        */}
        <div
          className="
            mt-16
            text-[#C9A96E]
            text-2xl
            animate-bounce
          "
        >
          ↓
        </div>

      </div>
    </section>
  );
}

export default MemoryIntro;