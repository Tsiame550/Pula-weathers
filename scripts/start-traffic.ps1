# Starts PULA's local traffic backend without writing the TomTom key to a file.
# Launch from the PULA project directory using: .\scripts\start-traffic.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
$secret = Read-Host 'TomTom API key (hidden input)' -AsSecureString
$handle = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
    $env:TOMTOM_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($handle)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($handle)
}
if ([string]::IsNullOrWhiteSpace($env:TOMTOM_API_KEY)) {
    Write-Error 'No API key entered.'
    exit 1
}
try {
    Write-Host 'Starting PULA traffic server at http://localhost:3030 (key is not printed)'
    node server/server.js
} finally {
    Remove-Item Env:TOMTOM_API_KEY -ErrorAction SilentlyContinue
}
