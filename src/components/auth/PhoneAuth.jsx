
import { useState } from "react";
import { supabase } from "../../lib/supabase";

function PhoneAuth() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // توحيد رقم الهاتف بصيغة دولية
  const getPhoneNumber = () => {
    const cleaned = phone.trim().replace(/[\s()-]/g, "");

    if (cleaned.startsWith("+")) {
      return cleaned;
    }

    // إذا أدخل المستخدم رقمًا سنغاليًا محليًا يبدأ بـ 7
    if (/^7\d{8}$/.test(cleaned)) {
      return `+221${cleaned}`;
    }

    return cleaned;
  };

  // إرسال رمز التحقق الذي ينشئه Supabase
  const sendOtp = async () => {
    setError("");
    setSuccess("");

    const phoneNumber = getPhoneNumber();

    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
      setError("أدخل رقم هاتف صحيحًا مع رمز الدولة، مثل +221770000000.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) {
        console.error("Send OTP error:", error);
        setError(`تعذر إرسال الرمز: ${error.message}`);
        return;
      }

      setOtpSent(true);
      setSuccess("تم إرسال رمز التحقق إلى هاتفك.");
    } catch (err) {
      console.error("Send OTP error:", err);
      setError("حدث خطأ أثناء إرسال الرمز.");
    } finally {
      setLoading(false);
    }
  };

  // التحقق من الرمز وإنشاء جلسة Supabase
  const verifyOtp = async () => {
    setError("");
    setSuccess("");

    if (!otp.trim()) {
      setError("من فضلك أدخل رمز التحقق.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: getPhoneNumber(),
        token: otp.trim(),
        type: "sms",
      });

      if (error) {
        console.error("Verify OTP error:", error);
        setError(`تعذر التحقق من الرمز: ${error.message}`);
        return;
      }

      if (!data.session || !data.user) {
        setError("تمت معالجة الرمز، لكن لم تُنشأ جلسة دخول. حاول مجددًا.");
        return;
      }

      setVerified(true);
      setSuccess("تم التحقق من رقم هاتفك وتسجيل الدخول بنجاح ❤️");
    } catch (err) {
      console.error("Verify OTP error:", err);
      setError("حدث خطأ أثناء التحقق من الرمز.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#F8F5F0] px-6 py-20">
      <div className="mx-auto max-w-md text-center">
        <h2 className="text-3xl font-light text-[#171717]">
          قبل أن تبدأ...
        </h2>

        <p className="mt-4 text-[#777]">
          نحتاج فقط إلى التحقق من رقم هاتفك.
        </p>

        {!verified && !otpSent && (
          <div className="mt-10">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+221 77 000 00 00"
              className="w-full rounded-xl border border-[#C9A96E] bg-white px-5 py-4 text-center outline-none"
              dir="ltr"
              disabled={loading}
            />

            <button
              onClick={sendOtp}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-[#171717] px-5 py-4 text-white disabled:opacity-50"
            >
              {loading ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
            </button>
          </div>
        )}

        {!verified && otpSent && (
          <div className="mt-10">
            <p className="text-[#555]">
              أدخل الرمز الذي وصلك على هاتفك.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, ""))
              }
              placeholder="1234"
              maxLength={6}
              className="mt-5 w-full rounded-xl border border-[#C9A96E] bg-white px-5 py-4 text-center tracking-[0.5em] outline-none"
              dir="ltr"
              disabled={loading}
            />

            <button
              onClick={verifyOtp}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-[#171717] px-5 py-4 text-white disabled:opacity-50"
            >
              {loading ? "جارٍ التحقق..." : "تأكيد الرمز"}
            </button>
          </div>
        )}

        {success && (
          <p className="mt-5 text-green-700" role="status">
            {success}
          </p>
        )}

        {error && (
          <p className="mt-5 text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

export default PhoneAuth;
