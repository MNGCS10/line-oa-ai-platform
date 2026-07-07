import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import liff from "@line/liff";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/empty-state";

type Stage = "initializing" | "ready" | "submitted" | "error";

export function LiffBookingPage() {
  const [stage, setStage] = useState<Stage>("initializing");
  const [errorMessage, setErrorMessage] = useState("");
  const config = trpc.liff.getConfig.useQuery();
  const products = trpc.products.list.useQuery();
  const createAppointment = trpc.appointments.createPublic.useMutation();

  const [form, setForm] = useState({
    customerName: "",
    patientAge: "",
    serviceName: "",
    reason: "",
    scheduledAt: "",
  });

  useEffect(() => {
    if (!config.data) return;

    if (!config.data.liffId) {
      setErrorMessage("ระบบยังไม่ได้ตั้งค่า LIFF ID กรุณาติดต่อคลินิก");
      setStage("error");
      return;
    }

    liff
      .init({ liffId: config.data.liffId })
      .then(() => {
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        setStage("ready");
      })
      .catch((err: Error) => {
        setErrorMessage(err.message || "ไม่สามารถเชื่อมต่อ LINE ได้");
        setStage("error");
      });
  }, [config.data]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const idToken = liff.getIDToken();
    if (!idToken) {
      setErrorMessage("ไม่พบข้อมูลการเข้าสู่ระบบ LINE กรุณาลองเปิดหน้านี้ใหม่อีกครั้ง");
      setStage("error");
      return;
    }

    try {
      await createAppointment.mutateAsync({
        idToken,
        customerName: form.customerName,
        patientAge: form.patientAge || undefined,
        serviceName: form.serviceName || undefined,
        reason: form.reason || undefined,
        scheduledAt: new Date(form.scheduledAt),
      });
      setStage("submitted");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "จองนัดไม่สำเร็จ กรุณาลองใหม่");
      setStage("error");
    }
  }

  if (stage === "initializing") {
    return <CenteredMessage text="กำลังเชื่อมต่อ LINE..." />;
  }

  if (stage === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-navy-900">
        <ErrorState message={errorMessage} />
      </div>
    );
  }

  if (stage === "submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-navy-900">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-semibold text-navy-900 dark:text-slate-100">จองนัดสำเร็จ!</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              เราได้ส่งข้อความยืนยันนัดหมายไปที่แชท LINE ของคุณแล้ว และจะแจ้งเตือนอีกครั้งล่วงหน้า 1 วันก่อนถึงนัด
            </p>
            <Button onClick={() => liff.closeWindow()} className="mt-2 w-full">
              ปิดหน้าต่างนี้
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-navy-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-accent-600" /> จองนัดหมาย
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">
                ชื่อลูกค้า/เด็ก
              </label>
              <Input
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">อายุ</label>
              <Input
                value={form.patientAge}
                onChange={(e) => setForm((f) => ({ ...f, patientAge: e.target.value }))}
                placeholder="เช่น 2 ปี 6 เดือน"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">
                บริการที่ต้องการ
              </label>
              <select
                value={form.serviceName}
                onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-navy-800/60 dark:bg-navy-900"
              >
                <option value="">-- เลือกบริการ --</option>
                {products.data?.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">
                วันเวลาที่ต้องการนัด
              </label>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy-900 dark:text-slate-200">
                อาการ/ประวัติย่อ
              </label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createAppointment.isPending}>
              {createAppointment.isPending ? "กำลังจอง..." : "ยืนยันการจอง"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-400 dark:bg-navy-900">
      {text}
    </div>
  );
}
