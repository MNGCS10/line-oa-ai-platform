import { Users, ShoppingCart, Wallet, CalendarClock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/empty-state";
import { formatCurrencyTHB } from "@/lib/utils";

const STAT_CARDS = [
  { key: "newCustomersToday" as const, label: "ลูกค้าใหม่วันนี้", icon: Users, format: (v: number) => v.toString() },
  { key: "ordersToday" as const, label: "ออเดอร์วันนี้", icon: ShoppingCart, format: (v: number) => v.toString() },
  { key: "salesToday" as const, label: "ยอดขายวันนี้", icon: Wallet, format: (v: number) => formatCurrencyTHB(v) },
  { key: "upcomingAppointments" as const, label: "นัดหมายวันนี้", icon: CalendarClock, format: (v: number) => v.toString() },
];

export function DashboardPage() {
  const { data, isLoading, error } = trpc.dashboard.stats.useQuery();

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900 dark:text-slate-100">ภาพรวมวันนี้</h1>

      {error && <ErrorState message={error.message} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <Card key={stat.key}>
            <CardContent className="flex items-center gap-4">
              <div className="rounded-lg bg-accent-600/10 p-3 text-accent-600">
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                {isLoading ? (
                  <Skeleton className="mt-1 h-6 w-16" />
                ) : (
                  <p className="text-xl font-semibold text-navy-900 dark:text-slate-100">
                    {stat.format(data?.[stat.key] ?? 0)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
