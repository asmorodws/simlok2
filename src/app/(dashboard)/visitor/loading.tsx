/**
 * Loading page for Next.js App Router
 * Displays while page is being loaded
 */

import PageLoader from '@/components/ui/loading/PageLoader';

export default function Loading() {
  return <PageLoader message="Memuat halaman..." />;
}
