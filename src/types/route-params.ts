/**
 * Type definitions untuk dynamic route parameters
 * Memastikan type safety di semua dynamic routes
 */

/**
 * Standard params untuk submission detail pages
 * Digunakan di:
 * - app/(dashboard)/vendor/[id]
 * - app/(dashboard)/approver/[id]
 * - app/(dashboard)/reviewer/[id]
 * - app/(dashboard)/verifier/[id]
 * - app/(dashboard)/visitor/[id]
 */
export interface SubmissionDetailParams {
  params: Promise<{ id: string }>;
}

/**
 * Standard params untuk edit submission pages
 * Digunakan di:
 * - app/(dashboard)/vendor/edit-submission/[id]
 */
export interface EditSubmissionParams {
  params: Promise<{ id: string }>;
}

/**
 * Standard params untuk user management pages
 * Digunakan di:
 * - app/(dashboard)/super-admin/user-management/[userId]
 */
export interface UserManagementParams {
  params: Promise<{ userId: string }>;
}

/**
 * Standard params untuk system logs by category
 * Digunakan di:
 * - app/(dashboard)/super-admin/system-logs/[category]
 */
export interface SystemLogsParams {
  params: Promise<{ category: string }>;
}

/**
 * Helper untuk await params di server components
 */
export async function getSubmissionId(params: SubmissionDetailParams['params']): Promise<string> {
  const { id } = await params;
  return id;
}

export async function getUserId(params: UserManagementParams['params']): Promise<string> {
  const { userId } = await params;
  return userId;
}

export async function getLogCategory(params: SystemLogsParams['params']): Promise<string> {
  const { category } = await params;
  return category;
}
