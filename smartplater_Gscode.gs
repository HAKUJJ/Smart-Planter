// ---------------------------------------------------------
// 1. นำเข้าไลบรารีที่จำเป็น (Libraries)
// ---------------------------------------------------------
#define BLYNK_TEMPLATE_ID "TMPL6fqyarRbr"
#define BLYNK_TEMPLATE_NAME "Smart Planter"
#define BLYNK_AUTH_TOKEN "bsTYUNS_kKoCPMul01g-WLi6QpqKnsGi"

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h> 
#include <DHT.h>
#include <WiFiManager.h> 
#include <HTTPClient.h>

// เรียกใช้ไฟล์เก็บข้อมูลรูปภาพแอนิเมชัน (แยกไฟล์เพื่อความสะอาดของโค้ด)
#include "emotes.h"

// ---------------------------------------------------------
// 2. ตั้งค่าการเชื่อมต่อ Cloud & ขาอุปกรณ์ (Pin Definitions)
// ---------------------------------------------------------
// URL สำหรับส่งข้อมูลเข้า Google Apps Script
String cloud_url = "https://script.google.com/macros/s/AKfycbythqOwYThK2xtDm5c2Nd_fQNQamQjWFSD0XpWzUPJyA_KLpQ_YIpZXSqAkvP0wNyip/exec"; 

#define DHTPIN 19         // ขาเซนเซอร์อุณหภูมิและความชื้น
#define DHTTYPE DHT22     // ใช้ DHT22 (มีความแม่นยำสูง ต้องการเวลาพัก 3 วิ)
#define PIR_PIN 23        // ขาเซนเซอร์จับความเคลื่อนไหว (ปลุกหน้าจอ)
#define SOIL_PIN 34       // ขาเซนเซอร์วัดความชื้นในดิน (Analog)
#define RELAY_PIN 27      // ขาควบคุมปั๊มน้ำ

// ตั้งค่าหน้าจอ OLED (128x64) และ LCD (16x2)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SH1106G oled(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1); 
LiquidCrystal_I2C lcd(0x27, 16, 2); 

DHT dht(DHTPIN, DHTTYPE);
BlynkTimer timer;

// ---------------------------------------------------------
// 3. ตัวแปรเก็บสถานะระบบ (Global Variables)
// ---------------------------------------------------------
// ตัวแปรข้อมูลเซนเซอร์
float last_t = 0, last_h = 0;
int soilPercentGlobal = 100;
bool pumpState = false;       

// ตัวแปรระบบ Manual Override (พัก Auto ชั่วคราวเมื่อกดสั่งผ่านแอป)
bool isManualOverride = false;
unsigned long manualOverrideTime = 0;
const unsigned long OVERRIDE_DELAY = 300000; // พัก Auto 5 นาที (300,000 ms)

// ตัวแปรระบบประหยัดพลังงาน (พักหน้าจอ)
unsigned long lastMotionTime = 0; 
const unsigned long SLEEP_DELAY = 300000;  // พักจอเมื่อไม่มีคนผ่าน 5 นาที
bool displayActive = true;                 

// ตัวแปรควบคุมแอนิเมชัน (OLED)
bool isBlinking = false;
int currentBlinkFrame = 0;
unsigned long lastBlinkFrameTime = 0;
unsigned long lastBlinkWaitTime = 0;
int nextBlinkInterval = 3000;
const int blinkFrameDelay = 50; 

bool isSadPausing = false;
int currentSadFrame = 0;
unsigned long lastSadFrameTime = 0;
unsigned long sadPauseStartTime = 0;
const int sadFrameDelay = 80;   
bool isCurrentlyHappy = true;


// =========================================================
// ส่วนที่ 1: ระบบส่งข้อมูลขึ้น Cloud (Google Sheets)
// =========================================================

// ฟังก์ชัน 1.1: อัปเดตสถานะปั๊มน้ำแบบ "ทันที" (Real-time)
void updateRealtimePump() {
  if (WiFi.status() == WL_CONNECTED) { 
    HTTPClient http;
    // ส่งเฉพาะพารามิเตอร์ pump (ไม่มี action=log) เพื่อให้อัปเดตเซลล์เดิม
    String finalUrl = cloud_url + "?pump=" + (pumpState ? "ON" : "OFF");
    
    http.begin(finalUrl);
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    http.GET(); 
    http.end();
    Serial.println("⚡ Real-time Pump Status Updated!");
  }
}

// ฟังก์ชัน 1.2: บันทึกประวัติสถิติทุกๆ 30 นาที (Data Logging)
void logToGoogleSheets() {
  if (WiFi.status() == WL_CONNECTED && last_t > 0) { 
    HTTPClient http;
    // เติม action=log เพื่อสั่งให้ Google สร้างแถวใหม่สำหรับบันทึกสถิติ
    String finalUrl = cloud_url + "?action=log&temp=" + String((int)last_t) + "&hum=" + String((int)last_h) + "&soil=" + String(soilPercentGlobal) + "&pump=" + (pumpState ? "ON" : "OFF");
    
    Serial.println("\n--- Sending Log to Google Sheet ---");
    http.begin(finalUrl);
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    int httpCode = http.GET(); 
    
    if (httpCode > 0) {
      Serial.println("✅ Log Success!");
    } else {
      Serial.println("❌ Log Failed. Code: " + http.errorToString(httpCode));
    }
    http.end();
  }
}


// =========================================================
// ส่วนที่ 2: ระบบจัดการแอนิเมชันหน้าจอ OLED (UI/UX)
// =========================================================

// ฟังก์ชัน 2.1: เล่นแอนิเมชันหน้าปกติ (กะพริบตาเว้นจังหวะ)
void playBlinkAnimation() {
  if (!isBlinking) {
    if (millis() - lastBlinkWaitTime > nextBlinkInterval) {
      isBlinking = true;
      currentBlinkFrame = 0;
    }
  } else {
    if (millis() - lastBlinkFrameTime >= blinkFrameDelay) {
      lastBlinkFrameTime = millis();
      oled.clearDisplay();
      oled.drawBitmap(0, 0, blinkFrames[currentBlinkFrame], 128, 64, SH110X_WHITE);
      oled.display();
      
      currentBlinkFrame++; 
      if (currentBlinkFrame >= TOTAL_BLINK_FRAMES) { 
        isBlinking = false; 
        lastBlinkWaitTime = millis(); 
        nextBlinkInterval = random(3000, 6000); 
        
        oled.clearDisplay();
        oled.drawBitmap(0, 0, blinkFrames[0], 128, 64, SH110X_WHITE); 
        oled.display();
      }
    }
  }
}

// ฟังก์ชัน 2.2: เล่นแอนิเมชันหน้าเศร้า (เมื่อน้ำแห้ง)
void playSadAnimation() {
  if (isSadPausing) {
    if (millis() - sadPauseStartTime > 2500) {
      isSadPausing = false;
      currentSadFrame = 0;
    }
  } else {
    if (millis() - lastSadFrameTime >= sadFrameDelay) {
      lastSadFrameTime = millis();
      oled.clearDisplay();
      oled.drawBitmap(0, 0, sadFrames[currentSadFrame], 128, 64, SH110X_WHITE);
      oled.display();
      
      currentSadFrame++; 
      if (currentSadFrame >= TOTAL_SAD_FRAMES) { 
        isSadPausing = true; 
        sadPauseStartTime = millis(); 
      }
    }
  }
}


// =========================================================
// ส่วนที่ 3: ระบบประมวลผลหลัก (Sensors & Logic)
// =========================================================

// ฟังก์ชัน 3.1: รับคำสั่งเปิด-ปิดปั๊มน้ำจากแอป Blynk (Manual Override)
BLYNK_WRITE(V4) {
  pumpState = (param.asInt() == 1);
  digitalWrite(RELAY_PIN, pumpState ? HIGH : LOW);
  Blynk.virtualWrite(V3, pumpState ? "ON" : "OFF"); 
  updateRealtimePump(); // อัปเดตสถานะขึ้น Google Sheet ทันที
  
  // 💡 เมื่อผู้ใช้กดแอป สั่งให้ระบบ Auto พักชั่วคราวเป็นเวลา 5 นาที
  isManualOverride = true;
  manualOverrideTime = millis();
}

// ฟังก์ชัน 3.2: อ่านเซนเซอร์, ตัดสินใจรดน้ำอัตโนมัติ, และอัปเดตหน้าจอ LCD
void sendSensorData() {
  // อ่านและแปลงค่าความชื้นดินเป็นเปอร์เซ็นต์
  int soilAnalog = analogRead(SOIL_PIN);
  soilPercentGlobal = constrain(map(soilAnalog, 4095, 1500, 0, 100), 0, 100);
  
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  bool dhtError = isnan(h) || isnan(t);
  
  if (!dhtError) {
    last_h = h; last_t = t;
  }

  // --- ลอจิกรดน้ำอัตโนมัติ (Edge Analytic) ---
  if (isManualOverride) {
    // เช็คเวลาครบกำหนด 5 นาที คืนสิทธิ์ให้ระบบ Auto
    if (millis() - manualOverrideTime >= OVERRIDE_DELAY) {
      isManualOverride = false; 
    }
  } 
  
  // ทำงานอัตโนมัติเมื่อไม่อยู่ในโหมด Manual
  if (!isManualOverride) {
    if (soilPercentGlobal < 30) {
      if (pumpState == false) { 
        pumpState = true;
        Blynk.virtualWrite(V4, 1);
        updateRealtimePump(); // ส่งสถานะ ปั๊ม=ON ขึ้น Cloud ทันที
      }
    } else if (soilPercentGlobal > 45) {
      if (pumpState == true) { 
        pumpState = false;
        Blynk.virtualWrite(V4, 0);
        updateRealtimePump(); // ส่งสถานะ ปั๊ม=OFF ขึ้น Cloud ทันที
      }
    }
  }
  digitalWrite(RELAY_PIN, pumpState ? HIGH : LOW);

  // --- อัปเดตหน้าจอ LCD ให้พอดี 16 ตัวอักษร ---
  if (displayActive) {
    char lcdBuffer[17]; 
    lcd.setCursor(0, 0);
    if (dhtError && last_t == 0) {
      lcd.print("DHT Wait...     "); 
    } else { 
      snprintf(lcdBuffer, sizeof(lcdBuffer), "T:%02dC H:%02d%%     ", (int)last_t, (int)last_h);
      lcd.print(lcdBuffer); 
    }
    
    lcd.setCursor(0, 1);
    snprintf(lcdBuffer, sizeof(lcdBuffer), "S:%03d%% P:%-3s   ", soilPercentGlobal, pumpState ? "ON" : "OFF");
    lcd.print(lcdBuffer);
  }

  // --- ส่งค่าอัปเดตแผงควบคุมบนแอป Blynk ---
  Blynk.virtualWrite(V0, last_t);
  Blynk.virtualWrite(V1, last_h);
  Blynk.virtualWrite(V2, soilPercentGlobal);
  Blynk.virtualWrite(V3, pumpState ? "ON" : "OFF");
}


// =========================================================
// ส่วนที่ 4: การตั้งค่าเริ่มต้น (Setup)
// =========================================================
void setup() {
  Serial.begin(115200);
  
  // ตั้งค่า Pin
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  digitalWrite(RELAY_PIN, LOW);
  
  // เริ่มต้นหน้าจอ
  lcd.init(); lcd.backlight();
  if(!oled.begin(0x3C, true)) Serial.println("OLED failed");
  
  dht.begin();

  // จัดการการเชื่อมต่อ WiFi (WiFiManager)
  lcd.setCursor(0, 0); lcd.print("Connecting WiFi ");
  WiFiManager wm;
  if(!wm.autoConnect("SmartPlant_Setup")) ESP.restart();

  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("WiFi Connected! ");
  
  // วาดหน้ายิ้มทักทายตอนเปิดเครื่อง
  oled.clearDisplay();
  oled.drawBitmap(0, 0, blinkFrames[0], 128, 64, SH110X_WHITE);
  oled.display();
  delay(1500);

  // เชื่อมต่อ Blynk
  Blynk.config(BLYNK_AUTH_TOKEN);
  Blynk.connect();
  
  timer.setInterval(3000L, sendSensorData);
  
  // ดึงข้อมูลเข้าระบบรอบแรกก่อนเข้า Loop เพื่อป้องกัน Error
  sendSensorData();
  delay(2000); // หน่วงรอให้เซนเซอร์ประมวลผลเสร็จ
  logToGoogleSheets();

  // ตั้งเวลาบันทึกสถิติลง Google Sheets ทุกๆ 30 นาที
  timer.setInterval(1800000L, logToGoogleSheets); 
  
  lastMotionTime = millis();
}


// =========================================================
// ส่วนที่ 5: ลูปการทำงานหลัก (Main Loop)
// =========================================================
void loop() {
  Blynk.run();
  timer.run();

  unsigned long currentMillis = millis();

  // --- ลอจิก 1: ตรวจจับการเคลื่อนไหวเพื่อปลุกหน้าจอ ---
  if (digitalRead(PIR_PIN) == HIGH) {
    lastMotionTime = currentMillis; 
    if (!displayActive) {
      displayActive = true;
      lcd.backlight();
      
      // วาดหน้าตาตามสถานะความชื้นทันทีเมื่อจอติด
      oled.clearDisplay();
      if (soilPercentGlobal >= 50) oled.drawBitmap(0, 0, blinkFrames[0], 128, 64, SH110X_WHITE);
      else oled.drawBitmap(0, 0, sadFrames[0], 128, 64, SH110X_WHITE);
      oled.display();
    }
  }

  // --- ลอจิก 2: แสดงแอนิเมชันตามความชื้นในดิน ---
  if (displayActive) {
    if (soilPercentGlobal >= 50) {
      // เปลี่ยนจากหน้าเศร้าเป็นหน้ายิ้ม
      if (!isCurrentlyHappy) {
        isCurrentlyHappy = true;
        oled.clearDisplay();
        oled.drawBitmap(0, 0, blinkFrames[0], 128, 64, SH110X_WHITE);
        oled.display();
        isBlinking = false;
        lastBlinkWaitTime = millis(); 
      }
      playBlinkAnimation(); 
      
    } else {
      // เปลี่ยนจากหน้ายิ้มเป็นหน้าเศร้า
      if (isCurrentlyHappy) {
        isCurrentlyHappy = false;
        oled.clearDisplay();
        oled.drawBitmap(0, 0, sadFrames[0], 128, 64, SH110X_WHITE);
        oled.display();
        isSadPausing = false;
        currentSadFrame = 0;
        lastSadFrameTime = millis();
      }
      playSadAnimation();
    }
  }

  // --- ลอจิก 3: โหมดประหยัดพลังงาน (ปิดหน้าจอเมื่อไม่มีคนอยู่) ---
  if (displayActive && (currentMillis - lastMotionTime > SLEEP_DELAY)) {
    displayActive = false; 
    lcd.clear(); lcd.print("Screen Sleeping ");
    oled.clearDisplay(); oled.display(); 
    lcd.noBacklight();                   
  }
}