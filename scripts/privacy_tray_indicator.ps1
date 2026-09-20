# scripts/privacy_tray_indicator.ps1
# BOWCON V4.0 — VISUAL PRIVACY SYSTEM TRAY INDICATOR
# Hiển thị icon trên khay hệ thống (System Tray) độc lập với console:
# - Màu xám/xanh (Application): Khi microphone đang rảnh (IDLE)
# - Màu đỏ (Warning/Hand): Khi microphone đang thu âm thật (RECORDING)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = [System.Drawing.SystemIcons]::Application
$tray.Text = "BOWCON Desktop: Mic Idle (Tắt)"
$tray.Visible = $true

function Update-State([string]$state) {
    if ($state -eq "RECORDING") {
        $tray.Icon = [System.Drawing.SystemIcons]::Warning
        $tray.Text = "[REC] BOWCON: DANG THU AM MIC!"
        $tray.BalloonTipTitle = "BOWCON PRIVACY WARNING"
        $tray.BalloonTipText = "[REC] Microphone dang thu am am thanh that!"
        $tray.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Warning
        $tray.ShowBalloonTip(1500)
    } else {
        $tray.Icon = [System.Drawing.SystemIcons]::Application
        $tray.Text = "BOWCON Desktop: Mic Idle (Ranh)"
    }
}

Update-State "IDLE"

try {
    $reader = [System.Console]::In
    while ($null -ne ($line = $reader.ReadLine())) {
        $cmd = $line.Trim().ToUpper()
        if ($cmd -eq "EXIT") {
            break
        }
        Update-State $cmd
    }
} finally {
    $tray.Visible = $false
    $tray.Dispose()
}
