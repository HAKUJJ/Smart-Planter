# 🌱Smart Planter (กระถางต้นไม้อัจฉริยะ)

ระบบดูแลต้นไม้อัตโนมัติที่ช่วยตรวจสอบสภาพแวดล้อมและรดน้ำต้นไม้ พร้อมระบบโต้ตอบกับผู้ใช้งานผ่านหน้าจอแสดงอารมณ์ (Emotes) และการควบคุมผ่านระบบ Cloud

**Developer:** ธิติวุฒิ ทางธนกุล (Student ID: 1660704642)  
**Institution:** School of Information Technology and Innovation, Bangkok University  

## ✨ Features
* **Automated Watering System:** ระบบรดน้ำอัตโนมัติเมื่อดินมีความชื้นต่ำกว่า 30%
* **Interactive UI:** แสดงผลอารมณ์ของต้นไม้ (มีความสุข / เศร้า) ผ่านจอ OLED 0.96"
* **Smart Dashboard:** ตรวจสอบอุณหภูมิและความชื้นแบบ Real-time ผ่านแอปพลิเคชัน Blynk
* **Data Logging:** บันทึกสถิติข้อมูลเซนเซอร์ลง Google Sheets ทุกๆ 30 นาที
* **Power Saving Mode:** พักหน้าจออัตโนมัติเมื่อเซนเซอร์ PIR ไม่พบการเคลื่อนไหวเกิน 5 นาที
* **Manual Override:** หยุดระบบ Auto ชั่วคราว 5 นาที เมื่อสั่งรดน้ำด้วยตนเองผ่านแอป

## 🛠️ Hardware Components
* ESP32 Development Board
* DHT22 Temperature & Humidity Sensor
* Analog Soil Moisture Sensor
* PIR Motion Sensor
* 5V Mini Submersible Water Pump & 1-Channel Relay
* 0.96" OLED Display & 16x2 I2C LCD

## 📂 Project Structure
* `/src` : โค้ดสำหรับอัปโหลดลง ESP32 (เขียนด้วย C++)
* `/schematics` : แผนผังวงจร (Wiring Diagram) จาก Fritzing
* `/docs` : เอกสารรายงาน BOM และคู่มือการใช้งาน

## 🚀 How to Use
1. ประกอบวงจรตามไฟล์ Schematic ในโฟลเดอร์ `/schematics`
2. อัปโหลดโค้ดในโฟลเดอร์ `/src` ลงบอร์ด ESP32
3. เชื่อมต่อ Wi-Fi "SmartPlant_Setup" เพื่อตั้งค่าเครือข่ายอินเทอร์เน็ต
4. ตรวจสอบสถานะและสั่งงานผ่านแอปพลิเคชัน Blynk
