https://docs.google.com/spreadsheets/d/e/2PACX-1vTfM4EoCRiToLKRYQSeovr8uFWcBsKoDU1YOBWznCZ7Nr6y2v8MBbOQdfxosgGbQyk5v252eG1WWqHd/pub?gid=2019443894&single=true&output=csvhttps://docs.google.com/spreadsheets/d/e/2PACX-1vTfM4EoCRiToLKRYQSeovr8uFWcBsKoDU1YOBWznCZ7Nr6y2v8MBbOQdfxosgGbQyk5v252eG1WWqHd/pub?gid=641605841&single=true&output=csv/*
  ตั้งค่าแหล่งข้อมูลของแอพ (แก้ไฟล์นี้ไฟล์เดียว)
  ----------------------------------------------------------
  นำลิงก์ CSV จาก Google Sheets: ไฟล์ > แชร์ > เผยแพร่ไปยังเว็บ
  เลือกชีต แล้วเลือกรูปแบบ "ค่าที่คั่นด้วยจุลภาค (.csv)" แล้วคัดลอกลิงก์มาวาง

  scheduleCsv : ลิงก์ CSV ของชีต "ตารางออกตรวจ"   (จำเป็น)
  daysCsv     : ลิงก์ CSV ของชีต "ข้อมูลรายวัน"   (ไม่บังคับ: ป้ายวันหยุด/หมายเหตุ)

  ถ้าเว้นว่าง แอพจะแสดงข้อมูลตัวอย่างเดือนตุลาคม 2569 จาก data/sample.json
*/
window.APP_CONFIG = {
  scheduleCsv: "",
  daysCsv: "",
  refreshSeconds: 60,            // ดึงข้อมูลใหม่ทุกกี่วินาที
  phone: "053-582-888",          // เบอร์ที่แสดงท้ายหน้า
  entDoctor: "พญ.สุณัฐดา"        // ชื่อแพทย์คลินิกหู คอ จมูก (แสดงเป็นแถบสีฟ้า)
};
