Add-Type -AssemblyName System.Drawing

$src = "public/logo.png"
$bmp = [System.Drawing.Bitmap]::new($src)

$iconBmp = [System.Drawing.Bitmap]::new(128, 128)
$g = [System.Drawing.Graphics]::FromImage($iconBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(15, 20, 28))

$scale = [Math]::Min(120.0 / $bmp.Width, 120.0 / $bmp.Height)
$nw = [int]($bmp.Width * $scale)
$nh = [int]($bmp.Height * $scale)
$x = [int]((128 - $nw) / 2)
$y = [int]((128 - $nh) / 2)

$g.DrawImage($bmp, $x, $y, $nw, $nh)
$g.Dispose()

$h = $iconBmp.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($h)
$fs = [System.IO.FileStream]::new("public/favicon.ico", [System.IO.FileMode]::Create)
$ico.Save($fs)
$fs.Close()

# Also save icon.png
$iconBmp.Save("public/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$ico.Dispose()
$iconBmp.Dispose()
$bmp.Dispose()
Write-Host "Favicon and icon created successfully"
