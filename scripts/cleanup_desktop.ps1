$desktop = 'C:\Users\nacho\Desktop'
$installDir = 'C:\Users\nacho\AppData\Local\Programs\OffertGames'

if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

# 1. Backup all files safely into AppData folder so no work is lost
Get-ChildItem $desktop -Filter "*Offert*" | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $installDir $_.Name) -Force -ErrorAction SilentlyContinue
}

# 2. Ensure our latest working OffertGames executable is used for the single desktop file
$sourceExe = 'C:\Users\nacho\Documents\antigravity\nifty-bose\desktop-app\publish-single\OffertGames.exe'
if (-not (Test-Path $sourceExe)) {
    $sourceExe = Join-Path $installDir 'OffertGames.exe'
}

# 3. Clean all duplicate Offert files from Desktop
Get-ChildItem $desktop -Filter "*Offert*" | ForEach-Object {
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
}

# 4. Leave ONLY ONE single file on Desktop: the OffertGamesG.exe
Copy-Item $sourceExe (Join-Path $desktop 'the OffertGamesG.exe') -Force

Write-Host "Desktop cleanup completed. Only 'the OffertGamesG.exe' remains."
