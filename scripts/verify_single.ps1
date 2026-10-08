$p = Start-Process "C:\Users\nacho\Desktop\the OffertGamesG.exe" -PassThru
Start-Sleep -Seconds 2
$running = -not $p.HasExited
Write-Host "the OffertGamesG.exe Running: $running (PID: $($p.Id))"
if ($running) {
    Stop-Process -Id $p.Id -Force
    Write-Host "the OffertGamesG.exe verified and closed successfully."
}
