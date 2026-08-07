import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Mail, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Masuk ke Taskora — Study Planner untuk Pelajar" },
      {
        name: "description",
        content:
          "Masuk ke Taskora dan atur jadwal belajar, tugas, serta progres penyelesaian tugasmu dalam satu dashboard yang rapi.",
      },
      { property: "og:title", content: "Masuk ke Taskora — Study Planner untuk Pelajar" },
      { property: "og:description", content: "Organize Your Study, Achieve Your Goals." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: "/dashboard", replace: true });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) void navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Selamat datang kembali!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Akun dibuat. Cek email kamu untuk konfirmasi.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Gagal masuk dengan Google");
      return;
    }
    if (result.redirected) return;
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Isi email dulu untuk reset password");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Link reset password sudah dikirim ke email kamu.");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="gradient-brand relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-16 top-1/3 h-40 w-40 rotate-12 rounded-3xl border border-white/25" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </span>
          <span className="text-xl font-semibold text-primary-foreground">Taskora</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight text-primary-foreground">
            Organize Your Study, Achieve Your Goals.
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Satu tempat untuk jadwal pelajaran mingguan, daftar tugas, dan progres belajarmu.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-sm text-primary-foreground/80">
          <Sparkles className="h-4 w-4" />
          One task at a time. You're closer than you think.
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="gradient-brand flex h-10 w-10 items-center justify-center rounded-xl">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-lg font-semibold">Taskora</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Masuk ke akunmu" : "Buat akun Taskora"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Organize Your Study, Achieve Your Goals.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama kamu"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kamu@email.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>
              {mode === "login" ? "Login" : "Create Account"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            atau
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="h-11 w-full rounded-xl" onClick={handleGoogle}>
            Lanjutkan dengan Google
          </Button>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              Forgot Password?
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "login" ? "Create Account" : "Sudah punya akun?"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
