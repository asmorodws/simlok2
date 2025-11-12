import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import LogsViewer from './LogsViewer';

export const metadata = {
  title: 'System Logs - SIMLOK',
  description: 'View and monitor system logs',
};

export default async function LogsPage() {
  const session = await getServerSession(authOptions);

  // Only SUPER_ADMIN can access logs
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          System Logs
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Monitor and analyze system activity, errors, and performance
        </p>
      </div>

      <LogsViewer />
    </div>
  );
}
