import { z } from 'zod';

/**
 * Common validation schemas
 */
export const baseSchemas = {
  id: z.string().cuid('Invalid ID format'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  phone: z.string().regex(/^[0-9+\-\s]+$/, 'Format nomor telepon tidak valid'),
  url: z.string().url('Format URL tidak valid'),
  date: z.string().datetime('Format tanggal tidak valid'),
  file: z.instanceof(File, { message: 'File is required' }),
} as const;

/**
 * User validation schemas
 */
export const userSchemas = {
  register: z.object({
    nama_petugas: z.string().min(2, 'Nama petugas minimal 2 karakter'),
    email: baseSchemas.email,
    password: baseSchemas.password,
    nama_vendor: z.string().min(2, 'Nama vendor minimal 2 karakter').optional(),
    no_telp: baseSchemas.phone.optional(),
    alamat: z.string().optional(),
    role: z.enum(['VENDOR', 'ADMIN', 'VERIFIER']).default('VENDOR'),
  }),

  login: z.object({
    email: baseSchemas.email,
    password: z.string().min(1, 'Password wajib diisi'),
  }),

  profile: z.object({
    nama_petugas: z.string().min(2, 'Nama petugas minimal 2 karakter'),
    nama_vendor: z.string().min(2, 'Nama vendor minimal 2 karakter').optional(),
    no_telp: baseSchemas.phone.optional(),
    alamat: z.string().optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, 'Password lama wajib diisi'),
    newPassword: baseSchemas.password,
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  }),
} as const;

/**
 * Submission validation schemas
 */
export const submissionSchemas = {
  create: z.object({
    berdasarkan: z.string().min(1, 'Berdasarkan wajib diisi'),
    pekerjaan: z.string().min(1, 'Pekerjaan wajib diisi'),
    lokasi_kerja: z.string().min(1, 'Lokasi kerja wajib diisi'),
    jam_kerja: z.string().min(1, 'Jam kerja wajib diisi'),
    sarana_kerja: z.string().min(1, 'Sarana kerja wajib diisi'),
    pelaksanaan: z.string().optional(),
    lain_lain: z.string().optional(),
    nama_signer: z.string().min(1, 'Nama penandatangan wajib diisi'),
    jabatan_signer: z.string().min(1, 'Jabatan penandatangan wajib diisi'),
  }),

  update: z.object({
    berdasarkan: z.string().min(1, 'Berdasarkan wajib diisi'),
    pekerjaan: z.string().min(1, 'Pekerjaan wajib diisi'),
    lokasi_kerja: z.string().min(1, 'Lokasi kerja wajib diisi'),
    jam_kerja: z.string().min(1, 'Jam kerja wajib diisi'),
    sarana_kerja: z.string().min(1, 'Sarana kerja wajib diisi'),
    pelaksanaan: z.string().optional(),
    lain_lain: z.string().optional(),
    nama_signer: z.string().min(1, 'Nama penandatangan wajib diisi'),
    jabatan_signer: z.string().min(1, 'Jabatan penandatangan wajib diisi'),
  }),

  approval: z.object({
    status: z.enum(['APPROVED', 'REJECTED'], {
      message: 'Status approval wajib dipilih',
    }),
    keterangan: z.string().optional(),
    pelaksanaan: z.string().optional(),
  }).refine(
    data => {
      if (data.status === 'APPROVED') {
        return data.pelaksanaan && data.pelaksanaan.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Pelaksanaan wajib diisi untuk approval',
      path: ['pelaksanaan'],
    }
  ),

  worker: z.object({
    nama_pekerja: z.string().min(1, 'Nama pekerja wajib diisi'),
  }),
} as const;

/**
 * File upload validation schemas
 */
export const fileSchemas = {
  upload: z.object({
    file: baseSchemas.file.refine(
      file => file.size <= 5 * 1024 * 1024, // 5MB
      'File maksimal 5MB'
    ).refine(
      file => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type),
      'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau PDF'
    ),
    type: z.enum(['dokumen_sika', 'dokumen_simja', 'foto_pekerja']),
  }),

  multipleUpload: z.object({
    files: z.array(baseSchemas.file).min(1, 'Minimal 1 file harus dipilih'),
  }),
} as const;

/**
 * API query validation schemas
 */
const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

const searchSchema = z.object({
  q: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const filterSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const querySchemas = {
  pagination: paginationSchema,
  search: searchSchema,
  filter: filterSchema,
  submissionQuery: z.object({
    ...paginationSchema.shape,
    ...searchSchema.shape,
    ...filterSchema.shape,
  }),
} as const;

/**
 * Export validation schemas
 */
export const exportSchemas = {
  submissions: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    format: z.enum(['xlsx', 'csv']).default('xlsx'),
  }),
} as const;

// Type exports for better TypeScript integration
export type UserRegisterInput = z.infer<typeof userSchemas.register>;
export type UserLoginInput = z.infer<typeof userSchemas.login>;
export type UserProfileInput = z.infer<typeof userSchemas.profile>;
export type SubmissionCreateInput = z.infer<typeof submissionSchemas.create>;
export type SubmissionUpdateInput = z.infer<typeof submissionSchemas.update>;
export type SubmissionApprovalInput = z.infer<typeof submissionSchemas.approval>;
export type FileUploadInput = z.infer<typeof fileSchemas.upload>;
export type PaginationQuery = z.infer<typeof querySchemas.pagination>;
export type SubmissionQuery = z.infer<typeof querySchemas.submissionQuery>;

// Additional exports for actions.ts and services.ts compatibility
export const createUserSchema = userSchemas.register;
export const updateUserSchema = userSchemas.profile;
export const loginSchema = userSchemas.login;
export const changePasswordSchema = userSchemas.changePassword;
export const createSubmissionSchema = submissionSchemas.create;
export const updateSubmissionSchema = submissionSchemas.update;

export type CreateUserInput = UserRegisterInput;
export type UpdateUserInput = UserProfileInput;
export type LoginInput = UserLoginInput;
export type ChangePasswordInput = z.infer<typeof userSchemas.changePassword>;
export type CreateSubmissionInput = SubmissionCreateInput;
export type UpdateSubmissionInput = SubmissionUpdateInput;

// Query parameters types
export type PaginationParams = z.infer<typeof querySchemas.pagination>;
export type SortParams = z.infer<typeof querySchemas.search>;
export type FilterParams = z.infer<typeof querySchemas.filter>;
