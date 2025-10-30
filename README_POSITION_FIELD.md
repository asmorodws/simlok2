# ⚠️ IMPORTANT: Run This Command First!

Setelah pull/merge perubahan ini, jalankan:

```bash
npx prisma generate
```

Ini akan meng-update Prisma Client dengan field `position` yang baru ditambahkan.

---

## 📝 Summary of Changes

### Fitur Baru: Position Field untuk Approver

1. **Auto-fill Signer Info**: Saat approver approve SIMLOK, `signer_name` dan `signer_position` otomatis terisi dari data user approver yang login

2. **Edit Profile**: Approver bisa mengisi/edit jabatan di halaman profile

3. **Required Field**: Jabatan wajib diisi untuk role APPROVER

### Files Modified:
- ✅ `prisma/schema.prisma` - Field position sudah ada
- ✅ `prisma/seed.ts` - Approver default dengan position
- ✅ `src/app/api/submissions/[id]/approve/route.ts` - Auto-fill logic
- ✅ `src/app/api/user/profile/route.ts` - Support update position
- ✅ `src/components/user-profile/UserInfoCard.tsx` - UI field position

### Next Steps:
1. Run `npx prisma generate` ✨ **WAJIB!**
2. Run `npx prisma db push` (atau `migrate dev`) untuk update database
3. Restart dev server: `npm run dev`
4. Test dengan login sebagai approver

### Dokumentasi Lengkap:
Lihat `MIGRATION_POSITION_FIELD.md` untuk panduan detail.
