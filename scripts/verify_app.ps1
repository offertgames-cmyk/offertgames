$p = Start-Process "C:\Users\nacho\Desktop\OffertGames.exe" -PassThru
Start-Sleep -Seconds 3
$running = -not $p.HasExited
Write-Host "Process ID: $($p.Id), Running: $running"
if ($running) {
    Stop-Process -Id $p.Id -Force
    Write-Host "OffertGames.exe launched and ran smoothly without error!"
} else {
    Write-Host "Process exited early with exit code: $($p.ExitCode)"
}
