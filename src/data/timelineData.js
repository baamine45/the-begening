// نستورد الصور من مجلد memories

import photo1 from "../assets/memories/photo1.jpeg";
import photo2 from "../assets/memories/photo2.jpeg";
import photo3 from "../assets/memories/photo3.jpeg";
import photo4 from "../assets/memories/photo4.jpeg";
import photo5 from "../assets/memories/photo5.jpeg";
import photo6 from "../assets/memories/photo6.jpeg";
import photo7 from "../assets/memories/photo7.jpeg";
import photo8 from "../assets/memories/photo8.jpeg";

// بيانات السنوات الدراسية
const timelineData = [
  {
    year: "2020 - 2021",

    title: "بداية الحكاية",

    description:
      "هنا بدأت رحلتنا في المرحلة الثانوية.",

    // صور هذه المرحلة
    // الترتيب مؤقت وسنغيره لاحقًا
    images: [
      photo1,
      photo4,
      photo7,
    ],
  },

  {
    year: "2021 - 2022",

    title: "عام من الذكريات",

    description:
      "عام آخر جمعنا فيه الدراسة والصداقة واللحظات الجميلة.",

    // صور هذه المرحلة
    images: [
      photo2,
      photo5,
      photo8,
    ],
  },

  {
    year: "2022 - 2023",

    title: "آخر أيام الثانوية",

    description:
      "آخر محطة في الثانوية، وبداية ذكريات ستبقى معنا.",

    // صور هذه المرحلة
    images: [
      photo3,
      photo6,
    ],
  },
];

export default timelineData;