# 🚀 Simlok Refactor & Optimization Guide

Panduan lengkap untuk melakukan **refactor total project Simlok** agar:
- Lebih **terstruktur & scalable**
- Lebih **cepat dan efisien**
- Lebih **mudah di-maintain**
- Mengikuti **best practice arsitektur Next.js modern**

---

## 📘 Deskripsi Singkat

**Simlok (Surat Izin Masuk Lokasi)** adalah aplikasi berbasis web untuk mengelola proses perizinan masuk lokasi proyek.  
Aplikasi ini dikembangkan menggunakan:
- **Next.js (App Router)**
- **Tailwind CSS**
- **Prisma ORM (MySQL)**
- **Node.js + Express (opsional backend service tambahan)**

---

## 🎯 Tujuan Refactor

1. Menjadikan struktur folder **bersih, modular, dan mudah dipahami**.
2. Menghapus **kode duplikat dan package tidak digunakan**.
3. Menerapkan **clean architecture & separation of concerns**.
4. Meningkatkan **performa dan efisiensi query**.
5. Menyusun ulang **komponen UI agar reusable dan konsisten**.
6. Menerapkan **praktik modern API design** di Next.js.

---

## 👥 Role & Flow Utama

| Role | Tugas Utama |
|------|--------------|
| **Vendor** | Membuat pengajuan SIMLOK (dengan upload file/foto), memantau status pengajuan, dan menerima notifikasi. |
| **Reviewer** | Meninjau pengajuan vendor, menentukan apakah layak diteruskan ke approver atau ditolak otomatis. Memverifikasi vendor baru. |
| **Approver** | Menyetujui atau menolak pengajuan yang telah direview. |
| **Verifier** | Memindai dan menandai pengajuan yang sudah selesai. |
| **Super Admin** | Mengelola semua user (CRUD penuh), melihat semua data. |
| **Visitor** | Melihat data publik seperti jumlah pengajuan, status, dan statistik. |

### 🧭 Alur Utama
Vendor → Reviewer → Approver → Verifier → Selesai

yaml
Salin kode

---

## 🧱 Struktur Folder Baru (Best Practice Next.js)

```bash
src/
├── app/
│   ├── (public)/                 # Halaman umum (visitor, statistik)
│   ├── (dashboard)/              # Halaman privat (vendor, reviewer, dll)
│   │   ├── layout.tsx            # Layout utama dashboard (navbar/sidebar)
│   │   ├── vendor/
│   │   │   ├── page.tsx
│   │   │   ├── create/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── form.tsx
│   │   │   │   └── validation.ts
│   │   │   └── [id]/page.tsx
│   │   ├── reviewer/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── approver/
│   │   ├── verifier/
│   │   └── admin/
│   ├── api/                      # API Routes (App Router)
│   │   ├── auth/
│   │   │   └── route.ts
│   │   ├── submissions/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── users/
│   │       ├── route.ts
│   │       └── [id]/route.ts
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/                       # Komponen UI Reusable (shadcn + Tailwind)
│   ├── forms/                    # Komponen form input
│   ├── cards/
│   ├── tables/
│   └── feedback/                 # Toast, modal, loader, alert
│
├── hooks/
│   ├── useAuth.ts
│   ├── useRole.ts
│   └── useSubmission.ts
│
├── lib/
│   ├── prisma.ts                 # Prisma instance
│   ├── auth.ts                   # Auth & session middleware
│   ├── api-client.ts             # Wrapper untuk fetcher client-side
│   └── utils.ts                  # Helper umum
│
├── services/                     # Abstraksi layer bisnis logic
│   ├── userService.ts
│   ├── submissionService.ts
│   └── notificationService.ts
│
├── types/                        # TypeScript definitions
│   ├── user.ts
│   ├── submission.ts
│   └── enums.ts
│
├── middleware.ts                 # Role-based route guard
├── prisma/
│   └── schema.prisma
└── tailwind.config.js
🧩 Penamaan File dan Komponen
Jenis	Format	Contoh
Komponen	PascalCase	SubmissionCard.tsx
Hooks	camelCase	useSubmission.ts
File API	kebab-case	route.ts
Validasi	validation.ts	formValidation.ts
Layout	layout.tsx	dashboard/layout.tsx

⚡️ Best Practice API (Next.js App Router)
📁 Struktur API
bash
Salin kode
/app/api/submissions/route.ts
/app/api/submissions/[id]/route.ts
📜 Contoh Implementasi
ts
Salin kode
// app/api/submissions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";

export async function GET() {
  const submissions = await prisma.submission.findMany({
    include: { vendor: true, reviewer: true, approver: true },
  });
  return NextResponse.json(submissions);
}

export async function POST(req: Request) {
  const data = await req.json();
  const session = await getUserSession();

  const submission = await prisma.submission.create({
    data: {
      ...data,
      vendorId: session.user.id,
      status: "PENDING_REVIEW",
    },
  });

  return NextResponse.json(submission);
}
🧠 Service Layer (Clean Abstraction)
Pisahkan logika bisnis dari API handler agar mudah diuji & dipelihara.

ts
Salin kode
// services/submissionService.ts
import { prisma } from "@/lib/prisma";

export async function getSubmissionsByRole(role: string, userId: string) {
  switch (role) {
    case "reviewer":
      return prisma.submission.findMany({ where: { status: "PENDING_REVIEW" } });
    case "vendor":
      return prisma.submission.findMany({ where: { vendorId: userId } });
    default:
      return [];
  }
}
🧠 Best Practice Query (Prisma)
Gunakan select untuk membatasi field.

Gunakan index di MySQL pada kolom yang sering di-query.

Gunakan batch query ($transaction) untuk efisiensi.

Cache query dengan React Query / SWR jika di client.

Hindari query ganda di komponen → gunakan service layer.

Contoh:

ts
Salin kode
const submissions = await prisma.submission.findMany({
  where: { status: { in: ["PENDING_REVIEW", "APPROVED"] } },
  select: { id: true, vendorId: true, status: true },
});
🧱 Reusable Component Pattern
Buat komponen UI yang generik dan konsisten:

tsx
Salin kode
// components/ui/Button.tsx
"use client";
import { cn } from "@/lib/utils";

export function Button({ children, variant = "default", ...props }) {
  const styles = cn(
    "px-4 py-2 rounded-xl font-medium transition",
    variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
    variant === "outline" && "border border-gray-300 hover:bg-gray-50"
  );
  return <button className={styles} {...props}>{children}</button>;
}
💡 Optimasi Performansi
Area	Best Practice
Rendering	Gunakan dynamic() untuk komponen berat.
Gambar	Gunakan <Image /> Next.js agar otomatis dioptimalkan.
Data Fetching	Gunakan cache() untuk SSR dan useSWR/React Query untuk CSR.
Database Query	Index kolom penting, hindari join berlebihan.
Bundle Size	Hapus library tidak digunakan, gunakan analyze untuk cek.
Re-renders	Gunakan useCallback, useMemo dengan bijak.

🧹 Clean Code Rules
Single Responsibility: 1 file = 1 fungsi utama.

DRY Principle: Hindari duplikasi kode.

Consistent Naming: Gunakan konvensi tetap.

Role-based Logic: Pisahkan logic per role dalam service.

Validation: Gunakan zod atau yup untuk form validation.

Centralized Constants: Simpan semua ROLE, STATUS, dll di /types/enums.ts.

Contoh:

ts
Salin kode
// types/enums.ts
export enum SubmissionStatus {
  PendingReview = "PENDING_REVIEW",
  Rejected = "REJECTED",
  Approved = "APPROVED",
  Scanned = "SCANNED",
}

export enum UserRole {
  Vendor = "VENDOR",
  Reviewer = "REVIEWER",
  Approver = "APPROVER",
  Verifier = "VERIFIER",
  SuperAdmin = "SUPER_ADMIN",
  Visitor = "VISITOR",
}
🔒 Middleware & Role Guard
Gunakan middleware.ts untuk membatasi akses berdasarkan role.

ts
Salin kode
// middleware.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  if (!token && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token?.role === "vendor" && pathname.startsWith("/dashboard/reviewer")) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
}
🧩 Checklist Refactor
 Hapus package tidak digunakan (npm prune + audit manual)

 Refactor struktur folder

 Pindahkan logika bisnis ke services/

 Terapkan komponen reusable

 Terapkan validasi input berbasis schema (zod)

 Tambahkan caching & optimasi query Prisma

 Dokumentasikan semua endpoint & fungsi penting

📊 Hasil yang Diharapkan
✅ Struktur modular & bersih
✅ Performa meningkat (lebih ringan di server & client)
✅ Kode mudah di-maintain oleh tim
✅ Query cepat & efisien
✅ Reusable UI components
✅ Skalabilitas tinggi untuk jumlah user besar

