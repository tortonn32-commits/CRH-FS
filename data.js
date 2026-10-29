// ตารางข้อมูลเวรและการปฏิบัติงาน - กลุ่มงานการเงิน รพ.เชียงรายประชานุเคราะห์
// เดือนพฤศจิกายน พ.ศ. 2569

window.APP_CONFIG = {
  hospitalName: "โรงพยาบาลเชียงรายประชานุเคราะห์",
  departmentName: "กลุ่มงานการเงินและบัญชี",
  monthName: "พฤศจิกายน 2569",
  yearBE: 2569,
  yearCE: 2026,
  monthIndex: 10,
  totalDays: 30,
  startDayOfWeek: 0, // 1 พ.ย. 2569 = อาทิตย์
  imageFile: "schedule_nov_2569.jpg",
  csvFile: "source_schedule.csv"
};

// รายชื่อเจ้าหน้าที่การเงิน
window.STAFF_MEMBERS = [
  { nickname: "เอ็ม", fullName: "จุรีพร ผาบสุวรรณ์", role: "เจ้าหน้าที่การเงิน", isDefault: true },
  { nickname: "เต่า", fullName: "ตะวัน ตาซิว", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "แตง", fullName: "ผกาย พรชัย", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "โปร", fullName: "ไพลิน วงค์ปิ่นแก้ว", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "อัน", fullName: "อัญชลี อินถา", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "ต่าย", fullName: "ธนันนิดา ติทวงค์", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "รุ่ง", fullName: "อรยา ไทยวัตเขตร", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "อุ้ม", fullName: "วรรณิศา นรรัตน์", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "อ้อม", fullName: "กัญญ์ภิรมย์ สังตะชัย", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "ปอ", fullName: "ชลลรินทร์ ปันแก้ว", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "นีน", fullName: "ปริชานัญ สนสง", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "แพร", fullName: "ผกา พรชัย", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "แม็ก", fullName: "ศุภรักษ์ เจริญวงศ์", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "นุ้ย", fullName: "ณัฐทิตา ภิลักษณ์", role: "เจ้าหน้าที่การเงิน" },
  { nickname: "ดารุ", fullName: "ดารุวรรณ ดวงคำ", role: "เจ้าหน้าที่การเงิน" }
];

// ข้อมูลจุดบริการ "เวลาปกติ" จากรูปภาพตารางปฏิบัติงาน
window.DAILY_REGULAR_DUTY = {
  // สัปดาห์ที่ 1
  2: { dayName: "จันทร์", dutyPoint: "PCU", extraNote: "", pointAfternoonNight: "อุ้ม", leave: "นุ้ย" },
  3: { dayName: "อังคาร", dutyPoint: "ER", extraNote: "", pointAfternoonNight: "ต่าย" },
  4: { dayName: "พุธ", dutyPoint: "เก็บเงิน 19", extraNote: "คืนนี้มีต่อกะดึก (IPD ดึก เที่ยงคืน-8:00)", pointAfternoonNight: "แดง" },
  5: { dayName: "พฤหัส", dutyPoint: "ตึกรังสี", extraNote: "มีต่อเวรบ่าย/ดึก (IPD ดึก + IPD บ่าย)", pointAfternoonNight: "เอ็ม" },
  6: { dayName: "ศุกร์", dutyPoint: "คิดชาร์ท 19", extraNote: "", pointAfternoonNight: "อ้อม", outUnit: "ปอ" },

  // สัปดาห์ที่ 2
  9: { dayName: "จันทร์", dutyPoint: "คิดชาร์ท 999", extraNote: "มีชื่อในช่องลา", pointAfternoonNight: "รุ่ง", leave: "เอ็ม" },
  10: { dayName: "อังคาร", dutyPoint: "แทน บ่ายดึก", extraNote: "ประจำจุดแทน บ่ายดึก", pointAfternoonNight: "แพร" },
  11: { dayName: "พุธ", dutyPoint: "เก็บเงิน 119", extraNote: "", pointAfternoonNight: "ดารุ", leave: "แพร" },
  12: { dayName: "พฤหัส", dutyPoint: "NO.9 (3)", extraNote: "", pointAfternoonNight: "ปอ" },
  13: { dayName: "ศุกร์", dutyPoint: "NO.9 (1)", extraNote: "", pointAfternoonNight: "อัน" },

  // สัปดาห์ที่ 3
  16: { dayName: "จันทร์", dutyPoint: "OPD ชั้น 2", extraNote: "", pointAfternoonNight: "นุ้ย", leave: "อัน" },
  17: { dayName: "อังคาร", dutyPoint: "OPD ชั้น 3", extraNote: "", pointAfternoonNight: "อุ้ม", leave: "อัน" },
  18: { dayName: "พุธ", dutyPoint: "NO.9 (2)", extraNote: "", pointAfternoonNight: "ต่าย", leave: "อุ้ม" },
  19: { dayName: "พฤหัส", dutyPoint: "เก็บเงิน 999", extraNote: "", pointAfternoonNight: "แตง" },
  20: { dayName: "ศุกร์", dutyPoint: "เซ็นทรัล", extraNote: "มีต่อเวรบ่าย/ดึก (IPD ดึก + IPD บ่าย)", pointAfternoonNight: "เอ็ม", leave: "รุ่ง" },

  // สัปดาห์ที่ 4
  23: { dayName: "จันทร์", dutyPoint: "PCU", extraNote: "", pointAfternoonNight: "แม็ก", leave: "โปร" },
  24: { dayName: "อังคาร", dutyPoint: "ER", extraNote: "", pointAfternoonNight: "รุ่ง", leave: "แม็ก" },
  25: { dayName: "พุธ", dutyPoint: "เก็บเงิน 19", extraNote: "", pointAfternoonNight: "แพร" },
  26: { dayName: "พฤหัส", dutyPoint: "ตึกรังสี", extraNote: "", pointAfternoonNight: "ดารุ", leave: "แพร" },
  27: { dayName: "ศุกร์", dutyPoint: "คิดชาร์ท 19", extraNote: "", pointAfternoonNight: "ปอ", leave: "ดารุ" },

  // สัปดาห์ที่ 5
  30: { dayName: "จันทร์", dutyPoint: "คิดชาร์ท 999", extraNote: "", pointAfternoonNight: "นีน" }
};

// ข้อมูลเวรนอกเวลา / เวรวันหยุด / OT ของ "เอ็ม" (จุรีพร ผาบสุวรรณ์)
window.EM_OT_DUTIES = {
  3: [
    { type: "OPD", name: "OPD บ่ายเสริมเบอร์ 9/3", category: "OPD เสริม", shiftTime: "กะบ่าย" }
  ],
  5: [
    { type: "IPD", name: "IPD ดึก (เข้าเที่ยงคืน - 8:00 น.)", category: "IPD", shiftTime: "กะดึก" },
    { type: "IPD", name: "IPD บ่าย (16:00 - 24:00 น.)", category: "IPD", shiftTime: "กะบ่าย" }
  ],
  7: [
    { type: "เวรวันหยุด", name: "เก็บเงิน 119", category: "วันหยุด ส/อ", shiftTime: "เวรวันหยุด" },
    { type: "IPD", name: "IPD เช้า", category: "IPD", shiftTime: "กะเช้า" }
  ],
  10: [
    { type: "OPD", name: "OPD บ่ายเซ็นทรัล", category: "OPD", shiftTime: "กะบ่าย" }
  ],
  12: [
    { type: "OPD", name: "OPD บ่ายเสริมเบอร์ 9/2", category: "OPD เสริม", shiftTime: "กะบ่าย" }
  ],
  14: [
    { type: "เวรวันหยุด", name: "เก็บเงิน 99 ER", category: "วันหยุด ส/อ", shiftTime: "เวรวันหยุด" },
    { type: "IPD", name: "IPD เช้า", category: "IPD", shiftTime: "กะเช้า" }
  ],
  15: [
    { type: "OPD", name: "OPD เช้าเบอร์ 9 เสริม (หยุด)", category: "OPD เสริม", shiftTime: "กะเช้า" }
  ],
  18: [
    { type: "OPD", name: "OPD บ่ายเบอร์ 9", category: "OPD", shiftTime: "กะบ่าย" }
  ],
  20: [
    { type: "IPD", name: "IPD ดึก (เข้าเที่ยงคืน - 8:00 น.)", category: "IPD", shiftTime: "กะดึก" },
    { type: "IPD", name: "IPD บ่าย (16:00 - 24:00 น.)", category: "IPD", shiftTime: "กะบ่าย" }
  ],
  22: [
    { type: "เวรวันหยุด", name: "คิดชาร์ท 19", category: "วันหยุด ส/อ", shiftTime: "เวรวันหยุด" },
    { type: "IPD", name: "IPD เช้า", category: "IPD", shiftTime: "กะเช้า" }
  ],
  23: [
    { type: "OPD", name: "OPD บ่ายเบอร์ 19 (เต็ม)", category: "OPD", shiftTime: "กะบ่าย" }
  ],
  25: [
    { type: "OPD", name: "OPD บ่ายเสริมเบอร์ 9/1", category: "OPD เสริม", shiftTime: "กะบ่าย" }
  ],
  29: [
    { type: "เวรวันหยุด", name: "เก็บเงิน 19", category: "วันหยุด ส/อ", shiftTime: "เวรวันหยุด" },
    { type: "IPD", name: "IPD เช้า", category: "IPD", shiftTime: "กะเช้า" }
  ],
  30: [
    { type: "OPD", name: "OPD บ่ายเสริมเบอร์ 9/2", category: "OPD เสริม", shiftTime: "กะบ่าย" }
  ]
};

// ฟังก์ชันสร้างรายการข้อมูล 30 วัน
window.buildMonthSchedule = function(targetNickname) {
  const daysOfWeek = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
  const customNotes = JSON.parse(localStorage.getItem('crh_custom_day_notes') || '{}');
  const list = [];

  for (let date = 1; date <= 30; date++) {
    const dayOfWeekIndex = (date - 1) % 7;
    const dayName = daysOfWeek[dayOfWeekIndex];
    const isWeekend = (dayOfWeekIndex === 0 || dayOfWeekIndex === 6);

    const reg = window.DAILY_REGULAR_DUTY[date];
    let regularDuty = null;

    if (!isWeekend && reg) {
      regularDuty = {
        title: reg.dutyPoint,
        location: getStationLocation(reg.dutyPoint),
        extraNote: reg.extraNote,
        leave: reg.leave === targetNickname ? "มีลงชื่อลา" : ""
      };
    }

    const otList = (targetNickname === "เอ็ม" || targetNickname === "จุรีพร") ? (window.EM_OT_DUTIES[date] || []) : [];
    const hasDuty = otList.length > 0;
    const isDayOff = (!regularDuty && !hasDuty);
    const userNote = customNotes[date] || null;

    list.push({
      date: date,
      dayName: dayName,
      dayOfWeekIndex: dayOfWeekIndex,
      isWeekend: isWeekend,
      regularDuty: regularDuty,
      otDuties: otList,
      hasDuty: hasDuty,
      isDayOff: isDayOff,
      userNote: userNote
    });
  }

  return list;
};

// สรุปสถิติการเข้างานตามจุด (PCU, ER, ตึกรังสี ฯลฯ)
window.getStationStats = function(targetNickname) {
  const schedule = window.buildMonthSchedule(targetNickname);
  const stationCounts = {};
  let totalWorkDays = 0;
  let totalOtShifts = 0;
  let totalOffDays = 0;

  schedule.forEach(day => {
    if (day.regularDuty) {
      const p = day.regularDuty.title;
      stationCounts[p] = (stationCounts[p] || 0) + 1;
      totalWorkDays++;
    }
    if (day.otDuties && day.otDuties.length > 0) {
      totalOtShifts += day.otDuties.length;
    }
    if (day.isDayOff) {
      totalOffDays++;
    }
  });

  return {
    stationCounts: stationCounts,
    totalWorkDays: totalWorkDays,
    totalOtShifts: totalOtShifts,
    totalOffDays: totalOffDays
  };
};

function getStationLocation(pointName) {
  if (!pointName) return "กลุ่มงานการเงิน";
  if (pointName.includes("PCU")) return "ตึกบริการปฐมภูมิ (PCU)";
  if (pointName.includes("ER")) return "ห้องอุบัติเหตุและฉุกเฉิน (ER)";
  if (pointName.includes("ตึกรังสี")) return "อาคารรังสีวินิจฉัย";
  if (pointName.includes("เซ็นทรัล")) return "จุดเก็บเงินเซ็นทรัล / ศูนย์การแพทย์";
  if (pointName.includes("OPD ชั้น 2")) return "อาคารผู้ป่วยนอก (OPD) ชั้น 2";
  if (pointName.includes("OPD ชั้น 3")) return "อาคารผู้ป่วยนอก (OPD) ชั้น 3";
  if (pointName.includes("NO.9")) return "ห้องเบอร์ 9 อาคารผู้ป่วยนอก";
  if (pointName.includes("เก็บเงิน 19")) return "จุดเก็บเงิน เบอร์ 19";
  if (pointName.includes("คิดชาร์ท 19")) return "จุดคิดชาร์ท เบอร์ 19";
  if (pointName.includes("เก็บเงิน 999")) return "จุดเก็บเงิน เบอร์ 999";
  if (pointName.includes("คิดชาร์ท 999")) return "จุดคิดชาร์ท เบอร์ 999";
  if (pointName.includes("เก็บเงิน 119")) return "จุดเก็บเงิน เบอร์ 119";
  if (pointName.includes("แทน บ่ายดึก")) return "จุดหมุนเวียนเวรแทน บ่าย-ดึก";
  return pointName;
}
