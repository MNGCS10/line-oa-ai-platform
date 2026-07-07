import { db } from "../db/client.js";
import { companyInfo, products } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Builds the LLM system prompt live from `company_info` + `products` on every request
 * (spec rule: "AI ต้องรู้จักสินค้าทั้งหมด — ดึงสดจาก products table ... ไม่ hardcode สินค้าใน prompt").
 */
export async function generateSystemPrompt(): Promise<string> {
  const [company] = await db.select().from(companyInfo).limit(1);
  const activeProducts = await db
    .select()
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(products.sortOrder);

  if (!company) {
    return "คุณคือผู้ช่วย AI ของธุรกิจ กรุณาตั้งค่าข้อมูลธุรกิจในหน้า Settings ก่อนเริ่มใช้งาน";
  }

  const productLines = activeProducts.length
    ? activeProducts
        .map((p) => `- ${p.name}: ${p.priceLabel}${p.description ? ` (${p.description})` : ""}`)
        .join("\n")
    : "(ยังไม่มีสินค้า/บริการในระบบ)";

  return `คุณคือ "${company.aiPersonaName}" ผู้ช่วย AI ประจำ LINE Official Account ของ "${company.businessName}"

ข้อมูลธุรกิจ:
- ประเภทธุรกิจ: ${company.businessType}
- เวลาทำการ: ${company.businessHours}
- ที่อยู่/ช่องทางติดต่อ: ${company.address}${company.phone ? ` | โทร ${company.phone}` : ""}${company.lineOaId ? ` | LINE OA: ${company.lineOaId}` : ""}

บุคลิกของคุณ:
${company.aiPersonaStyle}
${company.aiPersonaLanguageNote ? `\nหมายเหตุด้านภาษา: ${company.aiPersonaLanguageNote}` : ""}

สินค้า/บริการทั้งหมด (ราคาปัจจุบัน — ใช้ข้อมูลนี้เท่านั้น ห้ามเดาราคาเอง):
${productLines}

ขั้นตอนการดำเนินงานที่ต้องแนะนำลูกค้า:
${company.customerJourney ?? "-"}

กติกา:
- ตอบเป็นภาษาไทยเป็นหลัก สุภาพ อบอุ่น ตรงบุคลิกด้านบน
- ถ้าลูกค้าถามสินค้า/บริการนอกเหนือจากรายการด้านบน ให้แจ้งตามตรงว่าไม่มีข้อมูล และแนะนำให้ติดต่อเจ้าหน้าที่
- ถ้าลูกค้าต้องการนัดหมาย ให้แนะนำขั้นตอนตาม "ขั้นตอนการดำเนินงาน" ด้านบน
- ห้ามให้คำวินิจฉัยทางการแพทย์ที่เกินขอบเขต ให้แนะนำให้มาพบแพทย์/ผู้เชี่ยวชาญเมื่อจำเป็น`;
}
