[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$imageRaw = Get-Content "C:\Users\Asus\.gemini\antigravity\scratch\crh-finance-duty\image_schedule.json" -Raw -Encoding UTF8
$csvLines = [System.IO.File]::ReadAllLines("C:\Users\Asus\.gemini\antigravity\scratch\crh-finance-duty\source_schedule.csv", [System.Text.Encoding]::UTF8)

# Output full JavaScript data file
$js = @"
// CRH Finance Duty App - Schedule Data (November 2569 / 2026)
window.DEFAULT_MONTH = {
  yearBE: 2569,
  yearCE: 2026,
  monthIndex: 10, // 0-indexed: 10 = November
  monthNameTh: "พฤศจิกายน",
  totalDays: 30,
  startDayOfWeek: 0, // 0 = Sunday (Nov 1, 2026 is Sunday)
  imageSrc: "schedule_nov_2569.jpg",
  csvSrc: "source_schedule.csv"
};

window.STAFF_LIST = [
  { nickname: "เอ็ม", fullName: "จุรีพร ผาบสุวรรณ์", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "เต่า", fullName: "ตะวัน ตาซิว", role: "เจ้าหน้าที่การเงิน", avatar: "👨‍💼" },
  { nickname: "แตง", fullName: "ผกาย พรชัย", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "โปร", fullName: "ไพลิน วงค์ปิ่นแก้ว", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "อัน", fullName: "อัญชลี อินถา", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "ต่าย", fullName: "ธนันนิดา ติทวงค์", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "รุ่ง", fullName: "อรยา ไทยวัตเขตร", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "อุ้ม", fullName: "วรรณิศา นรรัตน์", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "อ้อม", fullName: "กัญญ์ภิรมย์ สังตะชัย", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "ปอ", fullName: "ชลลรินทร์ ปันแก้ว", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "นีน", fullName: "ปริชานัญ สนสง", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "แพร", fullName: "ผกา พรชัย", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "แม็ก", fullName: "ศุภรักษ์ เจริญวงศ์", role: "เจ้าหน้าที่การเงิน", avatar: "👨‍💼" },
  { nickname: "นุ้ย", fullName: "ณัฐทิตา ภิลักษณ์", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" },
  { nickname: "ดารุ", fullName: "ดารุวรรณ ดวงคำ", role: "เจ้าหน้าที่การเงิน", avatar: "👩‍💼" }
];
"@

[System.IO.File]::WriteAllText("C:\Users\Asus\.gemini\antigravity\scratch\crh-finance-duty\data_header.js", $js, $enc)
Write-Host "data_header.js created"