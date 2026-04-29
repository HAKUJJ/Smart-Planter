🌱 Smart Planter (กระถางต้นไม้อัจฉริยะ)
ระบบดูแลต้นไม้อัตโนมัติที่ช่วยตรวจสอบสภาพแวดล้อมและรดน้ำต้นไม้ พร้อมระบบโต้ตอบกับผู้ใช้งานผ่านหน้าจอแสดงอารมณ์ (Emotes) และการวิเคราะห์ข้อมูลขั้นสูงด้วยปัญญาประดิษฐ์ (AI) ผ่านระบบ Cloud

✨ Features
Automated Watering System: ระบบรดน้ำอัตโนมัติเมื่อดินมีความชื้นต่ำกว่า 30%

Interactive UI: แสดงผลอารมณ์ของต้นไม้ (มีความสุข / เศร้า) ผ่านจอ OLED 0.96"

Smart Dashboard: ตรวจสอบอุณหภูมิและความชื้นแบบ Real-time ผ่านแอปพลิเคชัน Blynk

AI Predictive Analytics: พยากรณ์ล่วงหน้าว่าความชื้นจะลดถึงจุดวิกฤตในอีกกี่ชั่วโมงข้างหน้า ด้วยสมการ Simple Linear Regression บน Google Sheets

Generative AI Expert: เชื่อมต่อ Google Gemini API (gemini-2.5-flash) เพื่อวิเคราะห์สภาพแวดล้อมและความเครียดของต้นไม้ พร้อมให้คำแนะนำอัตโนมัติ

Data Logging: บันทึกสถิติข้อมูลเซนเซอร์ลง Google Sheets ทุกๆ 30 นาที

Power Saving Mode: พักหน้าจออัตโนมัติเมื่อเซนเซอร์ PIR ไม่พบการเคลื่อนไหวเกิน 5 นาที

Secure Cloud API: จัดการ API Key อย่างปลอดภัยด้วย Environment Variables (Script Properties) ป้องกันข้อมูลรั่วไหล

Manual Override: หยุดระบบ Auto ชั่วคราว 5 นาที เมื่อสั่งรดน้ำด้วยตนเองผ่านแอป

🛠️ Hardware Components
ESP32 Development Board

DHT22 Temperature & Humidity Sensor

Analog Soil Moisture Sensor

PIR Motion Sensor

5V Mini Submersible Water Pump & 1-Channel Relay

0.96" OLED Display & 16x2 I2C LCD

💻 Technologies & Cloud Services
C++ (Arduino IDE)

Google Apps Script (Web App API)

Google Gemini 2.5 Flash API

Blynk IoT Platform

📂 Project Structure
/src : โค้ดสำหรับอัปโหลดลง ESP32 (เขียนด้วย C++)

/backend : โค้ด Google Apps Script (Code.gs) สำหรับ Data Logger และ AI Analytics

/schematics : แผนผังวงจร (Wiring Diagram) จาก Fritzing

/docs : เอกสารรายงาน BOM และคู่มือการใช้งาน

🚀 How to Use
ประกอบวงจรตามไฟล์ Schematic ในโฟลเดอร์ /schematics

ติดตั้ง Web App API: นำโค้ดใน /backend/Code.gs ไปวางใน Google Apps Script พร้อมตั้งค่า GEMINI_API_KEY ในหน้าสคริปต์พร็อพเพอร์ตี้ และกด Deploy

อัปโหลดโค้ดในโฟลเดอร์ /src ลงบอร์ด ESP32 (อย่าลืมเปลี่ยน URL ของ Web App API ให้ตรงกับของคุณ)

เมื่อบอร์ดเริ่มทำงาน ให้เชื่อมต่อ Wi-Fi ชื่อ "SmartPlant_Setup" เพื่อตั้งค่าเครือข่ายอินเทอร์เน็ต

ตรวจสอบสถานะ สั่งงาน และดูผลการวิเคราะห์จาก AI ผ่านแอปพลิเคชัน Blynk และ Google Sheets
