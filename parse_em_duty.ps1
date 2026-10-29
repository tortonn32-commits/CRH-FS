[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$csvLines = [System.IO.File]::ReadAllLines("C:\Users\Asus\.gemini\antigravity\scratch\crh-finance-duty\source_schedule.csv", [System.Text.Encoding]::UTF8)
$headerCols = $csvLines[1].Split(',')
$daysHeader = $csvLines[2].Split(',')

$emDuties = @{}

# Search for "จุรีพร ผาบสุวรรณ์" in all rows
for ($i = 0; $i -lt $csvLines.Length; $i++) {
    $line = $csvLines[$i]
    if ($line -match "จุรีพร ผาบสุวรรณ์") {
        $parts = $line.Split(',')
        $type = $parts[1]
        $shift = $parts[2]
        if ($type -ne "" -and $shift -ne "") {
            for ($col = 3; $col -le 34; $col++) {
                $val = $parts[$col]
                $dateNum = $headerCols[$col]
                $dayName = $daysHeader[$col]
                if ($val -eq "1") {
                    $key = "$dateNum"
                    if (-not $emDuties.ContainsKey($key)) { $emDuties[$key] = @() }
                    $emDuties[$key] += "$type $shift"
                }
            }
        }
    }
    # Check weekend duties
    if ($line -match "^,,(เก็บเงิน|คิดชาร์ท)") {
        $parts = $line.Split(',')
        $wRow = $parts[2]
        for ($col = 3; $col -le 34; $col++) {
            $val = $parts[$col]
            $dateNum = $headerCols[$col]
            if ($val -eq "เอ็ม") {
                $key = "$dateNum"
                if (-not $emDuties.ContainsKey($key)) { $emDuties[$key] = @() }
                $emDuties[$key] += "เวรวันหยุด: $wRow"
            }
        }
    }
}

Write-Host "Total dates with duty for Em: $($emDuties.Count)"
foreach ($d in (1..30)) {
    $key = "$d"
    if ($emDuties.ContainsKey($key)) {
        Write-Host "Day $d : $($emDuties[$key] -join ' | ')"
    }
}