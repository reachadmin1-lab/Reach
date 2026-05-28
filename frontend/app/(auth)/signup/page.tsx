"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RadarMotif } from "@/components/shared/RadarMotif";
import { ReachMark } from "@/components/shared/ReachMark";

type Role = "creator" | "brand";

function useHandleCheck(handle: string) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!handle || handle.length < 3) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/creators/check-handle?handle=${encodeURIComponent(handle)}`
        );
        const data = await res.json();
        setAvailable(data.available);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handle]);

  return { available, checking };
}

export default function SignUpPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("creator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { available, checking } = useHandleCheck(handle);

  const handlePattern = /^[a-z0-9._]{3,30}$/;
  const handleValid = handlePattern.test(handle);

  async function syncUserToBackend(token: string) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, handle, role, display_name: handle }),
    });
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!handleValid || available === false) return;
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { handle, role },
          emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding/profile`,
        },
      });
      if (signUpError) throw signUpError;

      // If email confirmation is enabled, session will be null
      // Show confirmation message instead of redirecting
      const token = data.session?.access_token;
      if (!token) {
        // Email confirmation required — show message
        setError("");
        setLoading(false);
        router.push(`/signup/confirm?email=${encodeURIComponent(email)}`);
        return;
      }

      try {
        await syncUserToBackend(token);
      } catch {
        // non-fatal
      }

      router.push("/onboarding/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding/profile`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  }

  async function handleAppleSignUp() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/onboarding/profile`,
      },
    });
  }

  function handleHandleInput(val: string) {
    setHandle(val.toLowerCase().replace(/[^a-z0-9._]/g, ""));
  }

  const handleIndicator = () => {
    if (!handle || handle.length < 3) return null;
    if (checking) return <span className="text-xs text-[var(--muted)]">Checking…</span>;
    if (!handleValid) return <span className="text-xs text-[var(--brand)]">Invalid format</span>;
    if (available === true) return <span className="text-xs text-[var(--green)]">Available</span>;
    if (available === false) return <span className="text-xs text-[var(--brand)]">Unavailable</span>;
    return null;
  };

  const canSubmit = email && password.length >= 8 && handleValid && available === true && !loading;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ink text-white">
      {/* Left — brand copy */}
      <div className="relative flex-1 flex flex-col justify-center px-10 py-16 overflow-hidden">
        <RadarMotif />
        <div className="relative z-10 max-w-sm">
          <ReachMark className="text-3xl text-white mb-8" />
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Get paid for your{" "}
            <span className="serif text-[var(--brand-warm)]">influence.</span>
          </h1>
          <p className="text-[var(--muted-dark)] text-base leading-relaxed">
            India&apos;s escrow-secured creator marketplace. Set your packages,
            share your link, get paid — safely.
          </p>
        </div>
      </div>

      {/* Right — form card */}
      <div className="flex items-center justify-center px-6 py-12 md:w-[480px] md:min-h-screen">
        <div className="w-full max-w-sm bg-white text-ink rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold mb-1">Create your account</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            Already have one?{" "}
            <Link href="/login" className="text-ink underline underline-offset-2">
              Log in
            </Link>
          </p>

          {/* Role toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-[var(--paper-2)] rounded-full">
            {(["creator", "brand"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 h-9 rounded-full text-sm font-medium transition-all ${
                  role === r
                    ? "bg-ink text-white shadow-sm"
                    : "text-[var(--muted)] hover:text-ink"
                }`}
              >
                {r === "creator" ? "Creator" : "Brand"}
              </button>
            ))}
          </div>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-3 mb-5">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              className="btn btn-paper w-full justify-center gap-2 text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button
              type="button"
              onClick={handleAppleSignUp}
              className="btn btn-paper w-full justify-center gap-2 text-sm"
            >
              <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor">
                <path d="M13.173 9.545c-.02-2.17 1.772-3.22 1.853-3.272-1.01-1.476-2.58-1.678-3.138-1.7-1.334-.136-2.607.79-3.283.79-.676 0-1.718-.772-2.826-.75-1.449.022-2.79.843-3.535 2.138C.7 9.27 1.77 13.6 3.3 15.97c.762 1.16 1.67 2.46 2.86 2.414 1.15-.047 1.583-.74 2.972-.74 1.39 0 1.78.74 2.99.716 1.24-.02 2.02-1.18 2.775-2.345.878-1.34 1.237-2.64 1.257-2.71-.028-.012-2.41-.924-2.43-3.76ZM10.9 3.04C11.52 2.28 11.94 1.23 11.82 0c-.9.038-1.99.6-2.635 1.36-.578.67-1.085 1.74-.948 2.77.998.077 2.02-.508 2.663-1.09Z"/>
              </svg>
              Continue with Apple
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <hr className="flex-1 border-[var(--line)]" />
            <span className="text-xs text-[var(--muted)]">or</span>
            <hr className="flex-1 border-[var(--line)]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
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
                  placeholder="Min. 8 characters"
                  minLength={8}
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

            <div>
              <label className="label-eyebrow block mb-1.5">Your handle</label>
              <div className="flex items-center border border-[var(--line)] rounded-xl overflow-hidden focus-within:border-ink h-12">
                <span className="pl-3 pr-1 text-sm text-[var(--muted)] whitespace-nowrap select-none">
                  reach.app/@
                </span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => handleHandleInput(e.target.value)}
                  placeholder="yourname"
                  maxLength={30}
                  className="flex-1 h-full bg-transparent text-sm outline-none pr-3"
                />
              </div>
              <div className="mt-1 h-4">{handleIndicator()}</div>
            </div>

            {error && (
              <p className="text-sm text-[var(--brand)] bg-[var(--rose-soft)] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-ink w-full justify-center mt-1 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-xs text-[var(--muted)] text-center mt-5 leading-relaxed">
            By signing up you agree to our{" "}
            <a href="#" className="underline underline-offset-2">Terms</a> and{" "}
            <a href="#" className="underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
