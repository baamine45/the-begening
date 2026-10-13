
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function AdminResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpdatePassword(e) {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);

    try {
      // نتأكد أن رابط الاستعادة أنشأ جلسة صالحة
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !data.session) {
        setMessage(
          "رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا."
        );
        return;
      }

      // تحديث كلمة مرور الحساب الحالي
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage("تعذر تغيير كلمة المرور: " + error.message);
        return;
      }

      setMessage("تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.");

      // الانتقال إلى تسجيل دخول المشرف بعد لحظة
      setTimeout(() => {
        navigate("/admin-login", { replace: true });
      }, 1500);
    } catch (err) {
      setMessage("حدث خطأ غير متوقع: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#171717] px-4 text-white"
    >
      <form
        onSubmit={handleUpdatePassword}
        className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8"
      >
        <p className="text-sm tracking-widest text-[#C9A96E]">
          17 — THE BEGINNING
        </p>

        <h1 className="text-3xl font-light">
          تعيين كلمة مرور جديدة
        </h1>

        <div>
          <label htmlFor="new-password" className="mb-2 block">
            كلمة المرور الجديدة
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-xl bg-white p-3 text-black"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-2 block">
            تأكيد كلمة المرور
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-xl bg-white p-3 text-black"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#C9A96E] p-3 text-black disabled:opacity-50"
        >
          {loading ? "جارٍ حفظ كلمة المرور..." : "حفظ كلمة المرور"}
        </button>

        {message && (
          <p role="status" className="text-sm leading-loose">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}

export default AdminResetPassword;
