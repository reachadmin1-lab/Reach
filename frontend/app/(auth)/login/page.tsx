"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RadarMotif } from "@/components/shared/RadarMotif";
import { ReachMark } from "@/components/shared/ReachMark";

type LoginMethod = "email" | "phone";
type PhoneStep = "number" | "otp";

export default function LoginPage() {
  const router = useRouter();

  const [method, setMethod] = useState<LoginMethod>("email");

  // Email/password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("number");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function syncUser(token: string) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user.email ?? email,
          handle: user.user_metadata?.handle ?? email.split("@")[0],
          role: user.user_metadata?.role ?? "creator",
          display_name: user.user_metadata?.display_name ?? null,
          avatar_url: user.user_metadata?.avatar_url ?? null,
          phone: user.phone ?? null,
        }),
      });
    } catch {
      // sync failure is non-fatal — user can still proceed
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      if (data.session?.access_token) {
        await syncUser(data.session.access_token);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Ensure +91 prefix for Indian numbers
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      if (otpError) throw otpError;
      setPhoneStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    try {
      const supabase = createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });
      if (verifyError) throw verifyError;
      if (data.session?.access_token) {
        await syncUser(data.session.access_token);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
      },
    });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ink text-white">
      {/* Left — brand copy */}
      <div className="relative flex-1 flex flex-col justify-center px-10 py-16 overflow-hidden">
        <RadarMotif />
        <div className="relative z-10 max-w-sm">
          <ReachMark className="text-3xl text-white mb-8" />
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Welcome{" "}
            <span className="serif text-[var(--brand-warm)]">back.</span>
          </h1>
          <p className="text-[var(--muted-dark)] text-base leading-relaxed">
            Log in to manage your bookings, track earnings, and connect with
            brands.
          </p>
        </div>
      </div>

      {/* Right — form card */}
      <div className="flex items-center justify-center px-6 py-12 md:w-[480px] md:min-h-screen">
        <div className="w-full max-w-sm bg-white text-ink rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold mb-1">Log in</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            New here?{" "}
            <Link href="/signup" className="text-ink underline underline-offset-2">
              Create an account
            </Link>
          </p>

          {/* Method toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-[var(--paper-2)] rounded-full">
            {(["email", "phone"] as LoginMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMethod(m); setError(""); setPhoneStep("number"); }}
                className={`flex-1 h-9 rounded-full text-sm font-medium transition-all ${
                  method === m
                    ? "bg-ink text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-ink"
                }`}
              >
                {m === "email" ? "Email" : "Phone OTP"}
              </button>
            ))}
          </div>

          {method === "email" ? (
            <>
              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="btn btn-paper w-full justify-center gap-2 text-sm mb-5"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <hr className="flex-1 border-[var(--line)]" />
                <span className="text-xs text-[var(--muted)]">or</span>
                <hr className="flex-1 border-[var(--line)]" />
              </div>

              <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
                <div>
                  <label className="label-eyebrow block mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label-eyebrow block mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      required
                      className="input w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-ink"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-[var(--brand)] bg-[var(--rose-soft)] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!email || !password || loading}
                  className="btn btn-ink w-full justify-center mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Logging in…" : "Log in"}
                </button>
              </form>
            </>
          ) : (
            /* Phone OTP flow */
            phoneStep === "number" ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div>
                  <label className="label-eyebrow block mb-1.5">Phone number</label>
                  <div className="flex items-center border border-[var(--line)] rounded-xl overflow-hidden focus-within:border-ink h-12">
                    <span className="pl-3 pr-1 text-sm text-[var(--muted)] whitespace-nowrap select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      placeholder="9876543210"
                      maxLength={10}
                      required
                      className="flex-1 h-full bg-transparent text-sm outline-none pr-3"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-[var(--brand)] bg-[var(--rose-soft)] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={phone.length < 10 || loading}
                  className="btn btn-ink w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending OTP…" : "Send OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <p className="text-sm text-[var(--muted)]">
                  OTP sent to +91 {phone}
                </p>
                <div>
                  <label className="label-eyebrow block mb-1.5">Enter OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="6-digit code"
                    maxLength={6}
                    required
                    className="input w-full tracking-widest text-center text-lg"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-[var(--brand)] bg-[var(--rose-soft)] rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={otp.length < 6 || loading}
                  className="btn btn-ink w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying…" : "Verify OTP"}
                </button>

                <button
                  type="button"
                  onClick={() => { setPhoneStep("number"); setOtp(""); setError(""); }}
                  className="text-sm text-[var(--muted)] underline underline-offset-2 text-center"
                >
                  Change number
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  );
}
