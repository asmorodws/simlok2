/**
 * SessionExpiryWarning Component
 * Shows a warning when session is about to expire
 */

'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

export default function SessionExpiryWarning() {
  const { sessionStatus, showExpiryWarning, refreshSession, dismissWarning } = useSessionMonitor();

  const handleRefresh = async () => {
    const success = await refreshSession();
    if (success) {
      dismissWarning();
    }
  };

  return (
    <Transition appear show={showExpiryWarning} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={dismissWarning}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500" />
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-gray-900"
                  >
                    Sesi Anda Hampir Berakhir
                  </Dialog.Title>
                </div>

                <div className="mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <ClockIcon className="h-5 w-5" />
                    <span>
                      Sesi Anda akan berakhir dalam{' '}
                      <strong className="text-gray-900">
                        {sessionStatus.minutesRemaining} menit
                      </strong>
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Untuk tetap masuk, silakan klik tombol "Perpanjang Sesi" di bawah ini. 
                    Jika tidak, Anda akan otomatis keluar ketika sesi berakhir.
                  </p>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={handleRefresh}
                  >
                    Perpanjang Sesi
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={dismissWarning}
                  >
                    Nanti Saja
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
