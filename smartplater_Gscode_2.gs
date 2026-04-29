function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // =========================================================
  // 1. ส่วน Real-time: อัปเดตสถานะปั๊มน้ำปัจจุบัน (ช่อง H1, I1)
  // =========================================================
  if (e.parameter.pump !== undefined && e.parameter.action !== "log") {
    sheet.getRange("H1").setValue("Real-time Pump:");
    sheet.getRange("H1").setFontWeight("bold"); 
    sheet.getRange("I1").setValue(e.parameter.pump);
    
    if(e.parameter.pump == "ON") {
      sheet.getRange("I1").setBackground("#b6d7a8"); // สีเขียว
    } else {
      sheet.getRange("I1").setBackground("#ea9999"); // สีแดง
    }
    return ContentService.createTextOutput("Success: Real-time Pump Updated");
  }

  // =========================================================
  // 2. ส่วน Data Log: บันทึกข้อมูลสถิติ
  // =========================================================
  if (e.parameter.action === "log" && e.parameter.temp !== undefined) {
    var rowData = [];
    var currDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
    var currTime = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss");
    
    rowData.push(currDate, currTime, e.parameter.temp, e.parameter.hum, e.parameter.soil, e.parameter.pump);
    sheet.appendRow(rowData); 
    
    // 💡 3. เรียกใช้ฟังก์ชัน AI พยากรณ์เวลา
    predictWateringTime(sheet);

    // 💡 4. เรียกใช้ Gemini API ให้คอมเมนต์สภาพอากาศ
    askGeminiAI(sheet, e.parameter.temp, e.parameter.hum, e.parameter.soil);
    
    return ContentService.createTextOutput("Success: Logged & Predicted & AI Analysed");
  }
}

// =========================================================
// 📈 ส่วน AI Analytics 1: คำนวณ Simple Linear Regression
// =========================================================
function predictWateringTime(sheet) {
  var lastRow = sheet.getLastRow();
  
  // ต้องมีข้อมูลอย่างน้อย 5 แถว ถึงจะเริ่มพยากรณ์ได้
  if (lastRow < 6) return; 

  var data = sheet.getRange(lastRow - 4, 5, 5, 1).getValues(); 
  var oldestMoisture = parseFloat(data[0][0]);
  var newestMoisture = parseFloat(data[4][0]);
  
  var totalDrop = oldestMoisture - newestMoisture;
  var dropPerInterval = totalDrop / 4;

  sheet.getRange("H3").setValue("พยากรณ์น้ำจะหมด (30%) ในอีก:");
  sheet.getRange("H3").setFontWeight("bold");

  if (dropPerInterval > 0) {
    var diffToThreshold = newestMoisture - 30; 
    
    if (diffToThreshold > 0) {
      var intervalsNeeded = diffToThreshold / dropPerInterval;
      var totalMinutes = Math.round(intervalsNeeded * 30);
      
      var hrs = Math.floor(totalMinutes / 60);
      var mins = totalMinutes % 60;
      var timeString = hrs > 0 ? hrs + " ชม. " + mins + " นาที" : mins + " นาที";
      
      sheet.getRange("I3").setValue(timeString);
      sheet.getRange("I3").setBackground("#fff2cc"); 
    } else {
      sheet.getRange("I3").setValue("ถึงจุดรดน้ำแล้ว!");
      sheet.getRange("I3").setBackground("#ea9999"); 
    }
  } else {
    sheet.getRange("I3").setValue("กำลังรดน้ำ / ดินยังชุ่มชื้น");
    sheet.getRange("I3").setBackground("#cfe2f3"); 
  }
}

// =========================================================
// 🤖 ส่วน AI Analytics 2: เชื่อมต่อกับ Google Gemini API
// =========================================================
function askGeminiAI(sheet, temp, hum, soil) {
  // 1. ใส่ API Key ของคุณ
  var apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
  
  // 2. สร้าง Prompt สั่งงาน AI
  var prompt = "คุณคือผู้เชี่ยวชาญด้านต้นไม้ ตอนนี้กระถางต้นไม้มีอุณหภูมิ " + temp + " องศา, ความชื้นอากาศ " + hum + "%, และความชื้นดิน " + soil + "% ช่วยวิเคราะห์สั้นๆ 1 ประโยค (ไม่เกิน 30 คำ) ว่าสภาพอากาศตอนนี้เป็นอย่างไรและต้นไม้รู้สึกอย่างไร";

  // 3. จัดรูปแบบข้อมูลเพื่อส่งให้ Gemini
  var payload = {
    "contents": [{
      "parts": [{"text": prompt}]
    }]
  };
  
  var options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  try {
    // 4. ส่งข้อมูลไปหา AI และรอรับคำตอบ
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    
    // ดึงเฉพาะข้อความที่ AI ตอบกลับมา
    var aiText = json.candidates[0].content.parts[0].text;
    
    // 5. นำคำตอบไปแสดงใน Google Sheets ช่อง H4 และ I4
    sheet.getRange("H4").setValue("🤖 Gemini AI วิเคราะห์:");
    sheet.getRange("H4").setFontWeight("bold");
    sheet.getRange("H4").setFontColor("#1a73e8");
    
    sheet.getRange("I4").setValue(aiText);
    sheet.getRange("I4").setBackground("#e8f0fe"); 
    
  } catch (e) {
    sheet.getRange("I4").setValue("ระบบ AI กำลังหลับ...");
  }
}

// ฟังก์ชันสำหรับกด "เรียกใช้" เพื่อทดสอบระบบ AI โดยไม่ต้องง้อ ESP32
function testAI() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // ทดสอบเรียกฟังก์ชันพยากรณ์
  predictWateringTime(sheet);
  
  // ทดสอบเรียก AI โดยจำลองว่า อุณหภูมิ 35, ความชื้นอากาศ 60, ความชื้นดิน 25
  askGeminiAI(sheet, 35, 60, 25); 
}