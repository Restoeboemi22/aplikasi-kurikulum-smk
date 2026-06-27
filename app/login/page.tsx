"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogIn, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import schoolLogo from "../../logo SMKS PACET.png";

export default function LoginPage() {
  const { user, loading, configured, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Kalau sudah login, langsung ke dashboard.
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      router.replace("/");
    } catch (err: any) {
      const code = err?.code ?? "";
      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found" ||
        code === "auth/invalid-email"
      ) {
        setError("Username atau kata sandi salah.");
      } else if (code === "auth/too-many-requests") {
        setError("Terlalu banyak percobaan. Coba lagi beberapa saat.");
      } else if (code === "auth/network-request-failed") {
        setError("Gagal terhubung. Periksa koneksi internet.");
      } else {
        setError("Tidak bisa masuk. Coba lagi.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),_transparent_24%),linear-gradient(140deg,_#020617_0%,_#0b1836_34%,_#0f3c88_72%,_#1d4ed8_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.04)_0%,transparent_32%,rgba(245,158,11,0.08)_52%,transparent_72%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_100%)]" />
      <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:84px_84px]" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/15 bg-white/10 shadow-[0_30px_120px_rgba(15,23,42,0.55)] backdrop-blur-2xl lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#041127]/95 via-[#0d2f68]/90 to-[#2563eb]/80 p-10 text-white lg:flex">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,transparent_38%,rgba(245,158,11,0.08)_100%)]" />
            <div className="absolute right-[-70px] top-1/2 h-72 w-72 -translate-y-1/2 rounded-full border border-white/10 bg-white/5 blur-sm" />
            <div className="relative">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-50 shadow-[0_8px_30px_rgba(15,23,42,0.2)]">
                <Sparkles size={16} className="text-amber-300" />
                Portal resmi akademik SMKS PACET
              </div>
              <h1 className="max-w-lg text-4xl font-bold leading-tight">
                Sistem kurikulum sekolah dengan tampilan resmi, rapi, dan lebih berkelas.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-blue-50/85">
                Mendukung pengelolaan penilaian, jurnal mengajar, perangkat pembelajaran, dan data
                akademik dalam satu platform terpadu.
              </p>
            </div>

            <div className="relative grid gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.18)] transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.14]">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldCheck size={18} className="text-amber-300" />
                  Akses aman berbasis akun
                </div>
                <p className="text-sm leading-6 text-blue-50/80">
                  Setiap pengguna masuk sesuai peran admin atau guru agar data sekolah tetap aman
                  dan terfokus.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-950/20 p-5 shadow-[0_20px_40px_rgba(2,6,23,0.16)] transition duration-300 hover:-translate-y-0.5 hover:border-amber-300/30">
                <p className="mt-3 text-center text-2xl font-black italic uppercase leading-tight tracking-[0.14em] text-transparent bg-clip-text bg-[linear-gradient(90deg,#fcd34d_0%,#ffffff_45%,#93c5fd_100%)] drop-shadow-[0_10px_30px_rgba(245,158,11,0.22)]">
                  <span className="block">SMKS PACET</span>
                  <span className="mt-2 block text-xl tracking-[0.18em]">SEKOLAH SAK NGAJINE</span>
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/95 p-6 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="group mb-4 rounded-[30px] border border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)] px-6 py-5 shadow-[0_22px_60px_rgba(37,99,235,0.18)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(245,158,11,0.18)]">
                  <Image
                    src={schoolLogo}
                    alt="Logo SMKS Pacet"
                    className="h-20 w-20 object-contain transition duration-300 group-hover:scale-[1.04] sm:h-24 sm:w-24"
                    priority
                  />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">SMKS PACET</h1>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#1d4ed8]">
                  Aplikasi Kurikulum Terpadu
                </p>
                <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-amber-400 via-sky-500 to-blue-700" />
                <p className="mt-4 text-sm leading-6 text-slate-500">
                  Masuk untuk melanjutkan ke dashboard akademik sekolah.
                </p>
              </div>
              {!configured && (
                <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm transition duration-200 hover:shadow-md">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>
                    Firebase belum dikonfigurasi. Isi <code className="font-mono">.env.local</code>{" "}
                    sesuai panduan <code className="font-mono">SETUP_FIREBASE.md</code>, lalu
                    jalankan ulang server.
                  </span>
                </div>
              )}

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm transition duration-200 hover:shadow-md">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="space-y-5 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(15,23,42,0.12)]"
              >
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Username</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition duration-200 placeholder:text-slate-400 hover:border-sky-300 hover:bg-sky-50/30 focus:-translate-y-0.5 focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-sky-100"
                    placeholder="Contoh guru: 16121963"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Kata Sandi</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition duration-200 placeholder:text-slate-400 hover:border-sky-300 hover:bg-sky-50/30 focus:-translate-y-0.5 focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-sky-100"
                      placeholder="Masukkan kata sandi"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition duration-200 hover:scale-110 hover:text-amber-500 focus:outline-none focus:text-[#1d4ed8]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !configured}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#1d4ed8_0%,#2563eb_55%,#f59e0b_115%)] px-6 py-3.5 font-semibold text-white shadow-[0_16px_35px_rgba(37,99,235,0.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_rgba(245,158,11,0.28)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Masuk
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-6 text-slate-400">
                Akun guru memakai username tanggal lahir format <code className="font-mono">ddmmyyyy</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
