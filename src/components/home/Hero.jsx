function Hero({ event }) {
  return (
    <section
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#171717]
        text-white
        flex
        flex-col
        items-center
        justify-center
        text-center
        px-6
      "
    >
      {/* 
        توهج ذهبي خفيف في خلفية المشهد.
        blur يجعل الضوء ناعمًا جدًا.
      */}
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

      {/* المحتوى يظهر فوق التوهج */}
      <div className="relative z-10 flex flex-col items-center">

        {/* 
          الرقم 17 يظهر أولًا.
          delay-1 يعني أن الحركة تبدأ بعد 0.2 ثانية.
        */}
        <p
          className="
            fade-up
            delay-1
            text-8xl
            md:text-9xl
            font-serif
            font-light
            tracking-wide
          "
        >
          17
        </p>

        {/* 
          اسم المشروع يظهر بعد الرقم.
        */}
        <h1
          className="
            fade-up
            delay-2
            mt-6
            text-4xl
            md:text-6xl
            font-light
          "
        >
          البداية
        </h1>

        {/* 
          الجملة تظهر بعد اسم المشروع.
        */}
      <p
  className="
    fade-up
    delay-3
    mt-8
    max-w-xl
    text-gray-400
    text-lg
    md:text-xl
    leading-relaxed
  "
>
  من أيام الثانوية
  <br />
  إلى بداية العمر الجديد
</p>

{/* أسماء العروسين قادمة من Supabase */}
<p
  className="
    fade-up
    delay-5
    mt-6
    text-[#C9A96E]
    text-xl
    md:text-2xl
  "
>
  {event.groom_name}
  <span className="mx-3"> و </span>
  {event.bride_name}
</p>

        {/* 
          الزر يظهر أخيرًا.
        */}
        <a
  href="#memories"
  className="
    fade-up
    delay-4
    mt-12
    border
    border-[#C9A96E]/60
    text-[#C9A96E]
    px-8
    py-4
    rounded-full
    transition
    duration-500
    hover:bg-[#C9A96E]
    hover:text-black
  "
>
  ابدأ الرحلة ↓
</a>
       
      </div>
    </section>
  );
}

export default Hero;