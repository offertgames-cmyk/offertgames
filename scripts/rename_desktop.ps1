$desktop = 'C:\Users\nacho\Desktop'
$installDir = 'C:\Users\nacho\AppData\Local\Programs\OffertGames'

# 1. Ensure OffertGames.exe is in installDir
$sourceExe = Join-Path $installDir 'OffertGames.exe'
if (-not (Test-Path $sourceExe)) {
    $sourceExe = 'C:\Users\nacho\Documents\antigravity\nifty-bose\desktop-app\publish-single\OffertGames.exe'
}

# 2. Place both OffertGamesG.exe and the OffertGamesG.exe on the desktop
Copy-Item $sourceExe (Join-Path $desktop 'OffertGamesG.exe') -Force
Copy-Item $sourceExe (Join-Path $desktop 'the OffertGamesG.exe') -Force

# 3. If there was a 'the OffertGames.exe', also duplicate it with G just in case
$bigExe = Join-Path $desktop 'the OffertGames.exe'
if (Test-Path $bigExe) {
    Copy-Item $bigExe (Join-Path $desktop 'the OffertGames_electron_backup.exe') -Force -ErrorAction SilentlyContinue
}

# 4. Create Windows shortcuts with the official icon
$ws = New-Object -ComObject WScript.Shell

$s1 = $ws.CreateShortcut((Join-Path $desktop 'OffertGamesG.lnk'))
$s1.TargetPath = (Join-Path $desktop 'OffertGamesG.exe')
$s1.WorkingDirectory = $installDir
$s1.IconLocation = ((Join-Path $installDir 'app.ico') + ',0')
$s1.Description = 'OffertGamesG'
$s1.Save()

$s2 = $ws.CreateShortcut((Join-Path $desktop 'the OffertGamesG.lnk'))
$s2.TargetPath = (Join-Path $desktop 'the OffertGamesG.exe')
$s2.WorkingDirectory = $installDir
$s2.IconLocation = ((Join-Path $installDir 'app.ico') + ',0')
$s2.Description = 'the OffertGamesG'
$s2.Save()

Write-Host "Desktop items updated with 'G' at the end successfully!"
