$sourceExe = 'C:\Users\nacho\Documents\antigravity\nifty-bose\desktop-app\publish-single\OffertGames.exe'
$installDir = 'C:\Users\nacho\AppData\Local\Programs\OffertGames'
$desktop = 'C:\Users\nacho\Desktop'

# Update installDir
Copy-Item $sourceExe (Join-Path $installDir 'OffertGames.exe') -Force

# Update Desktop single file
Copy-Item $sourceExe (Join-Path $desktop 'the OffertGamesG.exe') -Force

# Verify that ONLY 'the OffertGamesG.exe' is on the desktop matching Offert
$desktopItems = Get-ChildItem $desktop -Filter "*Offert*"
foreach ($item in $desktopItems) {
    if ($item.Name -ne 'the OffertGamesG.exe') {
        Remove-Item $item.FullName -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Updated the OffertGamesG.exe on Desktop."
