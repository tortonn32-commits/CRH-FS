[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$csvLines = [System.IO.File]::ReadAllLines("C:\Users\Asus\.gemini\antigravity\scratch\crh-finance-duty\source_schedule.csv", [System.Text.Encoding]::UTF8)

# Parse Header
$headerCols = $csvLines[1].Split(',')
$daysHeader = $csvLines[2].Split(',')

Write-Host "Header length: $($headerCols.Length)"

# Let's map date index -> actual date (November 1 to 30)
# Index 5 is 1 (อาทิต), Index 6 is 2 (จัน) ... Index 34 is 30 (จัน)

$emDuties = @{}

# Process individual shift rows for จุรีพร ผาบสุวรรณ์
for ($i = 4; $i -lt 18; $i++) {
    $parts = $csvLines[$i].Split(',')
    $name = $parts[0]
    $type = $parts[1]
    $shift = $parts[2]
    
    for ($col = 3; $col -le 34; $col++) {
        $val = $parts[$col]
        $dateNum = $headerCols[$col]
        $dayName = $daysHeader[$col]
        
        if ($val -eq "1") {
            $key = "$dateNum-$dayName"
            if (-not $emDuties.ContainsKey($key)) { $emDuties[$key] = @() }
            $emDuties[$key] += "$type $shift"
        }
    }
}

# Process weekend duties (lines 208 to 214)
# ,,เก็บเงิน 19,,นุ้ย,แพร,,,,,,ต่าย,รุ่ง,,,,,,แม็ค,อ้อม,,,,,,โป,ดา,,,,,,แพร,เอ็ม
$weekendRows = @(
    "เก็บเงิน 19",
    "คิดชาร์ท 19",
    "เก็บเงิน 119",
    "เก็บเงิน 999",
    "คิดชาร์ท 999",
    "เก็บเงิน 99  ER"
)

for ($i = 0; $i -lt $csvLines.Length; $i++) {
    $line = $csvLines[$i]
    foreach ($wRow in $weekendRows) {
        if ($line.StartsWith(",,$wRow")) {
            $parts = $line.Split(',')
            for ($col = 3; $col -le 34; $col++) {
                $val = $parts[$col]
                $dateNum = $headerCols[$col]
                $dayName = $daysHeader[$col]
                if ($val -eq "เอ็ม") {
                    $key = "$dateNum-$dayName"
                    if (-not $emDuties.ContainsKey($key)) { $emDuties[$key] = @() }
                    $emDuties[$key] += "เวรวันหยุด: $wRow"
                }
            }
        }
    }
}

Write-Host "`n=== เวรนอกเวลา / เวรวันหยุด ของ จุรีพร (เอ็ม) ==="
foreach ($key in ($emDuties.Keys | Sort-Object { [int]($_ -split '-')[0] })) {
    Write-Host "$key : $($emDuties[$key] -join ' | ')"
}
