import React from 'react';
import { MonitorOff } from 'lucide-react';
import { usePublisherOnline } from '../state/usePublisher';

/** Shown on the MC screen and the admin pages when no admin tab is publishing scores to the public copies. */
export const PublisherOfflineBanner: React.FC<{ className?: string }> = ({ className = '' }) =>
  usePublisherOnline() === false ? (
    <div
      role="alert"
      className={`flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-center text-xs font-black text-white ${className}`}
    >
      <MonitorOff className="h-4 w-4 shrink-0" />
      <span>Không có máy admin nào đang mở: điểm mới chưa lên MC, LED và trang kết quả. Mở trang admin trên máy công bố.</span>
    </div>
  ) : null;
