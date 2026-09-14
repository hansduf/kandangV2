Add-Type -AssemblyName System.Drawing

$configs = @(
    @{ Name = "mdpi"; Size = 48 },
    @{ Name = "hdpi"; Size = 72 },
    @{ Name = "xhdpi"; Size = 96 },
    @{ Name = "xxhdpi"; Size = 144 },
    @{ Name = "xxxhdpi"; Size = 192 }
)

foreach ($cfg in $configs) {
    $name = $cfg.Name
    $size = $cfg.Size

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # Background Circle (Deep Emerald #004D36)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#004D36"))
    $g.FillEllipse($bgBrush, 0, 0, $size, $size)

    # Outer Subtle Glow Ring (#10B981)
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#10B981"), [float]($size * 0.04))
    $g.DrawEllipse($ringPen, [float]($size * 0.05), [float]($size * 0.05), [float]($size * 0.9), [float]($size * 0.9))

    # Golden Egg Body
    $eggBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#FBBF24"))
    $ew = [float]($size * 0.50)
    $eh = [float]($size * 0.62)
    $ex = [float](($size - $ew) / 2)
    $ey = [float](($size - $eh) / 2 + ($size * 0.04))
    $g.FillEllipse($eggBrush, $ex, $ey, $ew, $eh)

    # Rooster Crown (Red)
    $crestBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#EF4444"))
    $cw = [float]($size * 0.22)
    $ch = [float]($size * 0.16)
    $cx = [float](($size - $cw) / 2)
    $cy = [float]($ey - ($ch * 0.55))
    $g.FillEllipse($crestBrush, $cx, $cy, $cw, $ch)

    # Smart Tech Line across center of egg (White)
    $penWidth = [float]([Math]::Max(2.0, $size * 0.04))
    $pulsePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penWidth)
    $pulsePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pulsePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $ly = [float]($ey + $eh * 0.52)
    $lx1 = [float]($ex + $ew * 0.18)
    $lx2 = [float]($ex + $ew * 0.82)
    $g.DrawLine($pulsePen, $lx1, $ly, $lx2, $ly)

    # Center Dot
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $dw = [float]($size * 0.09)
    $g.FillEllipse($dotBrush, [float](($size - $dw) / 2), [float]($ly - ($dw / 2)), $dw, $dw)

    $g.Dispose()

    $outDir = "g:\project\kandang\android\app\src\main\res\mipmap-$name"
    $bmp.Save("$outDir\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save("$outDir\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save("$outDir\ic_launcher_foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "Success: Generated icons for $name ($size x $size)"
}
