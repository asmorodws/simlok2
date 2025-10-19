/**
 * Global loading page for Next.js App Router
 * Displays while any route is being loaded
 */

import PageLoader from '@/components/ui/loading/PageLoader';

export default function Loading() {
  return <PageLoader message="Memuat..." />;
}
