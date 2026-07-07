import type { FlexMessagePayload } from "shared";
import type { orderItems, orders, appointments } from "../db/schema.js";

type Order = typeof orders.$inferSelect;
type OrderItem = typeof orderItems.$inferSelect;
type Appointment = typeof appointments.$inferSelect;

const STATUS_LABEL_TH: Record<string, string> = {
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  preparing: "กำลังเตรียม",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  no_show: "ไม่มาตามนัด",
};

export function buildOrderFlexMessage(
  order: Order,
  items: OrderItem[],
  heroImageUrl?: string | null,
): FlexMessagePayload {
  const bubble: Record<string, unknown> = {
    type: "bubble",
    ...(heroImageUrl
      ? { hero: { type: "image", url: heroImageUrl, size: "full", aspectRatio: "20:13", aspectMode: "cover" } }
      : {}),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: `ออเดอร์ #${order.id}`, weight: "bold", size: "lg" },
        { type: "text", text: STATUS_LABEL_TH[order.status] ?? order.status, size: "sm", color: "#06b6d4" },
        { type: "separator", margin: "md" },
        ...items.map((item) => ({
          type: "box",
          layout: "horizontal",
          margin: "sm",
          contents: [
            { type: "text", text: `${item.productName} x${item.quantity}`, size: "sm", flex: 4, wrap: true },
            { type: "text", text: `฿${item.unitPrice}`, size: "sm", flex: 2, align: "end" },
          ],
        })),
        { type: "separator", margin: "md" },
        {
          type: "box",
          layout: "horizontal",
          margin: "md",
          contents: [
            { type: "text", text: "รวมทั้งหมด", weight: "bold" },
            { type: "text", text: `฿${order.totalAmount}`, weight: "bold", align: "end", color: "#06b6d4" },
          ],
        },
      ],
    },
  };

  return { type: "flex", altText: `ออเดอร์ #${order.id} — ${STATUS_LABEL_TH[order.status] ?? order.status}`, contents: bubble };
}

export function buildAppointmentFlexMessage(
  appointment: Appointment,
  heroImageUrl?: string | null,
): FlexMessagePayload {
  const scheduledLabel = new Date(appointment.scheduledAt).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const bubble: Record<string, unknown> = {
    type: "bubble",
    ...(heroImageUrl
      ? { hero: { type: "image", url: heroImageUrl, size: "full", aspectRatio: "20:13", aspectMode: "cover" } }
      : {}),
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        { type: "text", text: "นัดหมาย", weight: "bold", size: "lg" },
        { type: "text", text: STATUS_LABEL_TH[appointment.status] ?? appointment.status, size: "sm", color: "#06b6d4" },
        { type: "separator", margin: "md" },
        { type: "text", text: `ผู้เข้ารับบริการ: ${appointment.customerName}`, size: "sm", margin: "md", wrap: true },
        ...(appointment.serviceName
          ? [{ type: "text", text: `บริการ: ${appointment.serviceName}`, size: "sm", wrap: true }]
          : []),
        { type: "text", text: `วันเวลานัด: ${scheduledLabel}`, size: "sm", wrap: true },
      ],
    },
  };

  return {
    type: "flex",
    altText: `นัดหมาย ${scheduledLabel} — ${STATUS_LABEL_TH[appointment.status] ?? appointment.status}`,
    contents: bubble,
  };
}
