import { CalendarClock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeTH } from "@/lib/utils";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "shared";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  no_show: "ไม่มาตามนัด",
};

const STATUS_TONE: Record<AppointmentStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  confirmed: "info",
  completed: "success",
  cancelled: "danger",
  no_show: "danger",
};

export function AppointmentsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.appointments.list.useQuery();
  const updateStatus = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => utils.appointments.list.invalidate(),
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900 dark:text-slate-100">นัดหมาย</h1>

      {isLoading && <SkeletonRows rows={6} />}
      {error && <ErrorState message={error.message} />}
      {data && data.length === 0 && (
        <EmptyState icon={CalendarClock} title="ยังไม่มีนัดหมาย" description="นัดหมายที่จองผ่าน LIFF form จะแสดงที่นี่" />
      )}

      {data && data.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.map((appt) => (
            <div
              key={appt.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-navy-800/60 dark:bg-navy-800/40"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-navy-900 dark:text-slate-100">{appt.customerName}</p>
                <Badge tone={STATUS_TONE[appt.status]}>{STATUS_LABEL[appt.status]}</Badge>
              </div>
              {appt.serviceName && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{appt.serviceName}</p>}
              <p className="mt-2 text-sm text-navy-900 dark:text-slate-200">{formatDateTimeTH(appt.scheduledAt)}</p>
              {appt.reason && <p className="mt-1 text-xs text-slate-400">{appt.reason}</p>}

              <select
                value={appt.status}
                onChange={(e) => updateStatus.mutate({ id: appt.id, status: e.target.value as AppointmentStatus })}
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-navy-800/60 dark:bg-navy-900"
              >
                {APPOINTMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
