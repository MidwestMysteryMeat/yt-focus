# Packages the extension into dist/yt-focus-v<version>.zip for AMO signing.
# Uses ZipArchive directly: Compress-Archive can emit backslash entry paths,
# which AMO rejects.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$version = (Get-Content "$root\manifest.json" -Raw | ConvertFrom-Json).version
$distDir = Join-Path $root 'dist'
New-Item -ItemType Directory -Force $distDir | Out-Null
$zipPath = Join-Path $distDir "yt-focus-v$version.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

$files = @(
    'manifest.json', 'content.js', 'content.css', 'popup.html', 'popup.js',
    'icons/icon48.png', 'icons/icon96.png'
)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
    foreach ($f in $files) {
        $src = Join-Path $root $f
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $src, $f) | Out-Null
    }
} finally {
    $zip.Dispose()
}

Write-Host "Built $zipPath"
