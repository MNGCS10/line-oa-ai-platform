import "dotenv/config";
import { db, pool } from "./client.js";
import { companyInfo, products, users } from "./schema.js";
import { hashPassword } from "../services/auth.js";

async function main() {
  console.log("Seeding test case: บ้านเด็ก คลินิกกุมารเวชและพัฒนาการ...");

  const existingCompany = await db.select().from(companyInfo).limit(1);
  if (existingCompany.length === 0) {
    await db.insert(companyInfo).values({
      businessName: "บ้านเด็ก คลินิกกุมารเวชและพัฒนาการ",
      businessType: "คลินิกเฉพาะทางเด็ก — กุมารเวชทั่วไป + พัฒนาการเด็ก + กระตุ้นพัฒนาการ",
      businessHours: "จันทร์–เสาร์ 09:00–18:00 (ปิดวันอาทิตย์)",
      address: "สุขุมวิท 49, กรุงเทพฯ",
      phone: "02-XXX-XXXX",
      lineOaId: "@baandekclinic",
      customerJourney: [
        "1. ลูกค้าทัก LINE OA → บอทถามอาการ/ความต้องการเบื้องต้น",
        "2. บอทเสนอช่วงเวลานัดว่าง (เชื่อม Google Calendar) → ลูกค้าเลือกวัน-เวลา",
        "3. กรอกฟอร์ม LIFF: ชื่อลูกค้า/เด็ก, อายุ, อาการ/ประวัติย่อ",
        "4. ระบบยืนยันนัด + ส่ง reminder ล่วงหน้า 1 วัน",
        "5. หลังตรวจ → ส่งสรุปผล/นัดครั้งถัดไป (ถ้ามี) ผ่าน LINE อัตโนมัติ",
      ].join("\n"),
      aiPersonaName: "น้องแคร์ (Nong Care)",
      aiPersonaStyle: "อบอุ่น เป็นกันเอง สุภาพแบบพี่พยาบาล ไม่เป็นทางการจ๋า",
      aiPersonaLanguageNote: "ภาษาไทยเป็นหลัก แทรกอังกฤษเฉพาะศัพท์ทางการแพทย์ (OT, screening)",
    });
    console.log("  ✓ company_info seeded");
  } else {
    console.log("  · company_info already present, skipping");
  }

  const existingProducts = await db.select().from(products).limit(1);
  if (existingProducts.length === 0) {
    await db.insert(products).values([
      {
        name: "ตรวจสุขภาพเด็กทั่วไป (ไข้ ไอ หวัด ท้องเสีย)",
        priceLabel: "฿500–800/ครั้ง",
        priceMin: "500",
        priceMax: "800",
        category: "ตรวจรักษาทั่วไป",
        sortOrder: 1,
      },
      {
        name: "ตรวจพัฒนาการเด็ก (Developmental Screening)",
        priceLabel: "฿1,200/ครั้ง",
        priceMin: "1200",
        priceMax: "1200",
        category: "พัฒนาการเด็ก",
        sortOrder: 2,
      },
      {
        name: "กระตุ้นพัฒนาการ (OT/พูด/กายภาพ)",
        priceLabel: "฿800/ชม. หรือแพ็กเกจ 10 ครั้ง ฿7,000",
        priceMin: "800",
        category: "พัฒนาการเด็ก",
        sortOrder: 3,
      },
      {
        name: "วัคซีนตามวัย",
        priceLabel: "฿650–3,500 แล้วแต่ชนิด",
        priceMin: "650",
        priceMax: "3500",
        category: "วัคซีน",
        sortOrder: 4,
      },
      {
        name: "ปรึกษาพัฒนาการ+จิตวิทยาเด็ก (ออทิสติก, สมาธิสั้น, พูดช้า)",
        priceLabel: "฿1,500/ชม.",
        priceMin: "1500",
        priceMax: "1500",
        category: "ปรึกษาผู้เชี่ยวชาญ",
        sortOrder: 5,
      },
      {
        name: "แพ็กเกจตรวจสุขภาพเด็กประจำปี",
        priceLabel: "฿3,900",
        priceMin: "3900",
        priceMax: "3900",
        category: "แพ็กเกจ",
        sortOrder: 6,
      },
    ]);
    console.log("  ✓ products seeded (6 services)");
  } else {
    console.log("  · products already present, skipping");
  }

  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length === 0) {
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
    await db.insert(users).values({
      email: "admin@baandekclinic.example",
      passwordHash: await hashPassword(defaultPassword),
      name: "Clinic Admin",
      role: "owner",
    });
    console.log(`  ✓ admin user seeded (admin@baandekclinic.example / ${defaultPassword} — change this immediately)`);
  } else {
    console.log("  · users already present, skipping");
  }

  console.log("Done.");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
