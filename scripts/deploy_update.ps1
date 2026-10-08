$dist = 'C:\Users\nacho\Documents\antigravity\nifty-bose\dist'
$desktopAppWww = 'C:\Users\nacho\Documents\antigravity\nifty-bose\desktop-app\wwwroot'
$installDir = 'C:\Users\nacho\AppData\Local\Programs\OffertGames'
$installWww = Join-Path $installDir 'wwwroot'
$desktop = 'C:\Users\nacho\Desktop'

# 1. Update desktop-app/wwwroot
if (Test-Path $desktopAppWww) { Remove-Item $desktopAppWww -Recurse -Force }
Copy-Item $dist $desktopAppWww -Recurse -Force

# 2. Update installDir/wwwroot
if (Test-Path $installWww) { Remove-Item $installWww -Recurse -Force }
Copy-Item $dist $installWww -Recurse -Force

Write-Host "Updated wwwroot in desktop-app and AppData/Programs/OffertGames."
