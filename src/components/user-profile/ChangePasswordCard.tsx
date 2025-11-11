"use client";
import React, { useMemo, useState } from "react";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { useToast } from "@/hooks/useToast";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function ChangePasswordCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const { showSuccess, showError } = useToast();

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const toggleShow = (field: "current" | "new" | "confirm") => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // biarkan spasi tengah; hapus spasi ujung agar tidak bikin salah ketik
    const sanitized = value.replace(/\s+$/g, "");
    setPasswords((prev) => ({ ...prev, [name]: sanitized }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Aturan kompleksitas kata sandi baru
  const cekKompleksitas = (pwd: string): string | "" => {
    if (!pwd) return "Kata sandi baru wajib diisi.";
    if (pwd.length < 8) return "Kata sandi baru minimal 8 karakter.";
    if (!/[a-z]/.test(pwd)) return "Kata sandi baru harus mengandung huruf kecil.";
    if (!/[A-Z]/.test(pwd)) return "Kata sandi baru harus mengandung huruf besar.";
    if (!/[0-9]/.test(pwd)) return "Kata sandi baru harus mengandung angka.";
    return "";
  };

  const validate = () => {
    let ok = true;
    const next = { currentPassword: "", newPassword: "", confirmPassword: "" };

    if (!passwords.currentPassword) {
      next.currentPassword = "Kata sandi saat ini wajib diisi.";
      ok = false;
    }

    const eNew = cekKompleksitas(passwords.newPassword);
    if (eNew) {
      next.newPassword = eNew;
      ok = false;
    } else if (passwords.newPassword === passwords.currentPassword) {
      next.newPassword = "Kata sandi baru tidak boleh sama dengan kata sandi saat ini.";
      ok = false;
    }

    if (!passwords.confirmPassword) {
      next.confirmPassword = "Konfirmasi kata sandi baru wajib diisi.";
      ok = false;
    } else if (passwords.newPassword !== passwords.confirmPassword) {
      next.confirmPassword = "Konfirmasi tidak sama dengan kata sandi baru.";
      ok = false;
    }

    setErrors(next);
    return ok;
  };

  // Hint ringkas di bawah input "Kata sandi baru"
  const hintKompleksitas = useMemo(() => {
    if (!passwords.newPassword) return "Minimal 8 karakter.";
    const msg = cekKompleksitas(passwords.newPassword);
    return msg || "Kombinasi kuat.";
  }, [passwords.newPassword]);

  const canSubmit = useMemo(() => {
    // cepat: cek dasar supaya tombol utama tidak aktif saat kosong
    return (
      passwords.currentPassword.length > 0 &&
      passwords.newPassword.length >= 8 &&
      passwords.confirmPassword.length > 0
    );
  }, [passwords]);

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSaving(true);
      const res = await fetch("/api/users/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          text?.trim() ||
            "Gagal mengubah kata sandi. Pastikan kata sandi saat ini benar, lalu coba lagi."
        );
      }

      closeModal();
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showSuccess("Berhasil", "Kata sandi Anda telah diperbarui.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengubah kata sandi.";
      showError("Gagal", msg);
      setErrors((prev) => ({ ...prev, currentPassword: msg }));
    } finally {
      setIsSaving(false);
    }
  };

  const onCloseModal = () => {
    if (isSaving) return; // cegah menutup saat proses
    closeModal();
  };

  return (
    <div className="rounded-2xl border border-gray-200 p-5 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 lg:mb-2">Pengaturan kata sandi</h4>
          <p className="text-sm text-gray-500">
            Ubah kata sandi Anda untuk menjaga keamanan akun.
          </p>
        </div>

        <button
          onClick={openModal}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-800 lg:inline-flex lg:w-auto"
        >
          Ubah kata sandi
        </button>
      </div>

      <Modal isOpen={isOpen} onClose={onCloseModal} className="m-4 max-w-[520px]">
        <div className="no-scrollbar relative w-full overflow-y-auto rounded-3xl bg-white p-5 lg:p-8">
          {/* Header */}
          <div className="pb-4">
            <h4 className="text-2xl font-semibold text-gray-800">Ubah kata sandi</h4>
            <p className="mt-1 text-sm text-gray-500">
              Masukkan kata sandi saat ini dan pilih kata sandi baru.
            </p>
          </div>

          {/* Form */}
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!isSaving) handleSave();
            }}
          >
            {/* Kata sandi saat ini */}
            <div>
              <Label>Kata sandi saat ini</Label>
              <div className="relative">
                <Input
                  type={showPassword.current ? "text" : "password"}
                  name="currentPassword"
                  value={passwords.currentPassword}
                  onChange={handleChange}
                  error={errors.currentPassword}
                  placeholder="Masukkan kata sandi saat ini"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => toggleShow("current")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword.current ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword.current ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Kata sandi baru */}
            <div>
              <Label>Kata sandi baru</Label>
              <div className="relative">
                <Input
                  type={showPassword.new ? "text" : "password"}
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handleChange}
                  error={errors.newPassword}
                  placeholder="Minimal 8 karakter dengan kombinasi"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => toggleShow("new")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword.new ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword.new ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              <p
                className={`mt-1 text-xs ${
                  errors.newPassword
                    ? "text-red-600"
                    : hintKompleksitas === "Kombinasi kuat."
                    ? "text-green-700"
                    : "text-amber-600"
                }`}
              >
                {errors.newPassword || hintKompleksitas}
              </p>
            </div>

            {/* Konfirmasi kata sandi baru */}
            <div>
              <Label>Konfirmasi kata sandi baru</Label>
              <div className="relative">
                <Input
                  type={showPassword.confirm ? "text" : "password"}
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  placeholder="Ketik ulang kata sandi baru"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => toggleShow("confirm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword.confirm ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword.confirm ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Aksi */}
            <div className="mt-3 flex items-center gap-3 lg:justify-end">
              <Button size="sm" variant="outline" onClick={onCloseModal} disabled={isSaving}>
                Batal
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!canSubmit || isSaving}>
                {isSaving ? "Menyimpan..." : "Perbarui kata sandi"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
