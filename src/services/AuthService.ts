import { prisma } from '@/lib/database/singletons';
import { toJakartaISOString } from '@/lib/helpers/timezone';
import { notifyAdminNewVendor } from '@/lib/notification/events';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schema for vendor registration
export const vendorRegistrationSchema = z.object({
  officer_name: z
    .string()
    .min(2, 'Nama petugas minimal 2 karakter')
    .max(100, 'Nama petugas maksimal 100 karakter')
    .trim(),
  email: z
    .string()
    .email('Format email tidak valid')
    .min(5, 'Email terlalu pendek')
    .max(100, 'Email terlalu panjang')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password terlalu panjang')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password harus mengandung huruf besar, huruf kecil, dan angka'
    ),
  vendor_name: z
    .string()
    .min(2, 'Nama vendor minimal 2 karakter')
    .max(150, 'Nama vendor maksimal 150 karakter')
    .trim(),
  address: z
    .string()
    .min(10, 'Alamat minimal 10 karakter')
    .max(500, 'Alamat maksimal 500 karakter')
    .trim(),
  phone_number: z
    .string()
    .min(10, 'Nomor telepon minimal 10 digit')
    .max(15, 'Nomor telepon maksimal 15 digit')
    .regex(/^[0-9+\-\s]+$/, 'Nomor telepon hanya boleh berisi angka, +, -, dan spasi')
    .trim(),
  turnstile_token: z.string().min(1, 'Token keamanan diperlukan'),
});

// Rate limiting store (in production, use Redis)
const registrationAttempts = new Map<string, { count: number; lastAttempt: number }>();

export interface VendorRegistrationData {
  officer_name: string;
  email: string;
  password: string;
  vendor_name: string;
  address: string;
  phone_number: string;
  turnstile_token: string;
}

/**
 * Service for authentication and user registration
 */
class AuthService {
  /**
   * Check rate limit for registration attempts
   */
  checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 5; // Maximum 5 registration attempts per 15 minutes

    const attempts = registrationAttempts.get(ip);

    if (!attempts) {
      registrationAttempts.set(ip, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset counter if window has passed
    if (now - attempts.lastAttempt > windowMs) {
      registrationAttempts.set(ip, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if limit exceeded
    if (attempts.count >= maxAttempts) {
      return false;
    }

    // Increment counter
    attempts.count++;
    attempts.lastAttempt = now;
    return true;
  }

  /**
   * Check if email already exists
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!existingUser;
  }

  /**
   * Check if vendor name already exists
   */
  async checkVendorNameExists(vendorName: string): Promise<boolean> {
    const existingVendor = await prisma.user.findFirst({
      where: {
        vendor_name: {
          equals: vendorName,
        },
      },
      select: { id: true },
    });
    return !!existingVendor;
  }

  /**
   * Register a new vendor user
   */
  async registerVendor(data: VendorRegistrationData) {
    const { officer_name, email, password, vendor_name, address, phone_number } = data;

    // Hash password with strong settings
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new vendor user
    const newUser = await prisma.user.create({
      data: {
        officer_name,
        email,
        password: hashedPassword,
        vendor_name,
        address,
        phone_number,
        role: 'VENDOR', // Always VENDOR for this registration endpoint
        verified_at: null, // Requires admin verification
      },
      select: {
        id: true,
        officer_name: true,
        email: true,
        vendor_name: true,
        role: true,
        created_at: true,
        verified_at: true,
        verification_status: true,
      },
    });

    // Notify admin and reviewer about new vendor registration
    await notifyAdminNewVendor(newUser.id);

    const { notifyReviewerNewUser } = await import('@/lib/notification/events');
    await notifyReviewerNewUser(newUser.id);

    // Log successful registration
    console.log(
      `✅ New vendor registered: ${email} (${vendor_name}) at ${toJakartaISOString(new Date()) || new Date().toISOString()}`
    );

    return {
      message: 'Pendaftiran berhasil! Akun Anda sedang menunggu verifikasi admin.',
      user: {
        id: newUser.id,
        officer_name: newUser.officer_name,
        email: newUser.email,
        vendor_name: newUser.vendor_name,
        role: newUser.role,
        verified: !!newUser.verified_at,
      },
      redirectTo: '/verification-pending',
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
