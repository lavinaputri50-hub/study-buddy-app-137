import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useUpdateProfile } from "@/hooks/use-taskora-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan Akun — Taskora" },
      {
        name: "description",
        content:
          "Ubah nama, email, password, foto profil, bahasa, serta mode gelap atau terang akun Taskora kamu.",
      },
      { property: "og:title", content: "Pengaturan Akun — Taskora" },
      { property: "og:description", content: "Kelola profil dan preferensi tampilan Taskora." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [language, setLanguage] = useState("id");
  const [dark, setDark] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setAvatarUrl(profile.avatar_url ?? "");
    setLanguage(profile.language);
    setDark(profile.theme === "dark");
  }, [profile]);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  async function handleSave() {
    try {
      await updateProfile.mutateAsync({
        full_name: fullName,
        avatar_url: avatarUrl || null,
        language,
        theme: dark ? "dark" : "light",
      });
      if (email && email !== user?.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
        toast.info("Cek email baru kamu untuk konfirmasi perubahan.");
      }
      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword("");
      }
      toast.success("Perubahan disimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kelola profil dan preferensi akunmu.</p>
      </header>

      <section className="card-surface space-y-5 p-6">
        <h2 className="font-semibold">Profil</h2>

        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
            <AvatarFallback className="bg-accent text-lg text-accent-foreground">
              {(fullName || "S").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Label htmlFor="avatar">Foto Profil (URL)</Label>
            <Input
              id="avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullname">Nama</Label>
          <Input id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password Baru</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Kosongkan jika tidak diubah"
          />
        </div>
      </section>

      <section className="card-surface space-y-5 p-6">
        <h2 className="font-semibold">Preferensi</h2>

        <div className="flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Mode Gelap</p>
            <p className="text-xs text-muted-foreground">Ganti antara tema terang dan gelap.</p>
          </div>
          <Switch checked={dark} onCheckedChange={setDark} />
        </div>

        <div className="space-y-2">
          <Label>Bahasa</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">Bahasa Indonesia</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <Button
        className="h-11 w-full rounded-xl"
        onClick={handleSave}
        disabled={updateProfile.isPending}
      >
        Simpan Perubahan
      </Button>
    </div>
  );
}
