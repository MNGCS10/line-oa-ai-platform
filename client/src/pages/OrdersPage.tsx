import { ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyTHB, formatDateTimeTH } from "@/lib/utils";
import { ORDER_STATUSES, type OrderStatus } from "shared";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  preparing: "กำลังเตรียม",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const STATUS_TONE: Record<OrderStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  pending: "warning",
  confirmed: "info",
  preparing: "info",
  completed: "success",
  cancelled: "danger",
};

export function OrdersPage() {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.orders.list.useQuery();
  const updateStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => utils.orders.list.invalidate(),
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900 dark:text-slate-100">ออเดอร์</h1>

      {isLoading && <SkeletonRows rows={6} />}
      {error && <ErrorState message={error.message} />}
      {data && data.length === 0 && (
        <EmptyState icon={ShoppingCart} title="ยังไม่มีออเดอร์" description="ออเดอร์ที่ลูกค้าสั่งผ่านแชทจะแสดงที่นี่" />
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-navy-800/60 dark:bg-navy-800/40">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs uppercase text-slate-500 dark:border-navy-800/60 dark:text-slate-400">
              <tr>
                <th className="p-3">ออเดอร์</th>
                <th className="p-3">ยอดรวม</th>
                <th className="p-3">สถานะ</th>
                <th className="p-3">วันที่</th>
                <th className="p-3">เปลี่ยนสถานะ</th>
              </tr>
            </thead>
            <tbody>
              {data.map((order) => (
                <tr key={order.id} className="border-b border-slate-50 last:border-0 dark:border-navy-800/40">
                  <td className="p-3 font-medium text-navy-900 dark:text-slate-100">#{order.id}</td>
                  <td className="p-3">{formatCurrencyTHB(order.totalAmount)}</td>
                  <td className="p-3">
                    <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{formatDateTimeTH(order.createdAt)}</td>
                  <td className="p-3">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateStatus.mutate({ id: order.id, status: e.target.value as OrderStatus })
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-navy-800/60 dark:bg-navy-900"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
