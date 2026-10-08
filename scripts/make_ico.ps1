Add-Type -AssemblyName System.Drawing
 = 'public/logo.png'
 = [System.Drawing.Bitmap]::new()
 = [System.Drawing.Bitmap]::new(128, 128)
 = [System.Drawing.Graphics]::FromImage()
.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
.Clear([System.Drawing.Color]::FromArgb(15, 20, 28))
 = [Math]::Min(120.0 / .Width, 120.0 / .Height)
 = [int](.Width * )
 = [int](.Height * )
.DrawImage(, [int]((128 - ) / 2), [int]((128 - ) / 2), , )
.Dispose()
 = .GetHicon()
 = [System.Drawing.Icon]::FromHandle()
 = [System.IO.FileStream]::new('public/favicon.ico', [System.IO.FileMode]::Create)
.Save()
.Close()
.Dispose()
.Dispose()
.Dispose()
Write-Host 'public/favicon.ico created successfully'
