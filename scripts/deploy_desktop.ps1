$installDir = 'C:\Users\nacho\AppData\Local\Programs\OffertGames'
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

# Copy all published files to installDir
Copy-Item desktop-app\publish-single\* $installDir -Recurse -Force
Copy-Item public\favicon.ico (Join-Path $installDir 'app.ico') -Force

# Copy OffertGames.exe directly to Desktop as requested
$desktop = 'C:\Users\nacho\Desktop'
Copy-Item (Join-Path $installDir 'OffertGames.exe') (Join-Path $desktop 'OffertGames.exe') -Force

# Also create desktop shortcut OffertGames.lnk with icon for Windows shell
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut((Join-Path $desktop 'OffertGames.lnk'))
$shortcut.TargetPath = (Join-Path $installDir 'OffertGames.exe')
$shortcut.WorkingDirectory = $installDir
$shortcut.IconLocation = ((Join-Path $installDir 'app.ico') + ',0')
$shortcut.Description = 'OffertGames - Ofertas de Videojuegos y Comunidad'
$shortcut.Save()

Write-Host "Deployed OffertGames.exe to Desktop successfully!"
