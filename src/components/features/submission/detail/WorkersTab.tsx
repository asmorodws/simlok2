'use client';

import React from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import DetailSection from '@/components/features/dashboard/DetailSection';
import WorkersList from '../WorkersList';
import type { BaseSubmissionDetail } from '../SubmissionDetailShared';

interface WorkersTabProps {
  submission: BaseSubmissionDetail;
}

export default function WorkersTab({
  submission,
}: WorkersTabProps) {
  return (
    <div className="space-y-6">
      <DetailSection title="Data Pekerja" icon={<UserGroupIcon className="h-5 w-5" />}>
        <WorkersList 
          submissionId={submission.id}
          fallbackWorkers={submission.worker_names}
        />
      </DetailSection>
    </div>
  );
}
