$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

$statusOutput = & cmd.exe /d /s /c 'npx.cmd supabase status --output json 2>nul'
if ($LASTEXITCODE -ne 0) {
  throw 'No se pudo leer el estado local de Supabase. Inicia el stack con npm run supabase:start.'
}

$statusText = $statusOutput -join "`n"
$jsonMatch = [regex]::Match($statusText, '(?s)\{.*\}')
if (-not $jsonMatch.Success) {
  throw 'La CLI no devolvió el estado de Supabase en formato JSON.'
}
$status = $jsonMatch.Value | ConvertFrom-Json
if (-not $status.API_URL -or -not $status.PUBLISHABLE_KEY) {
  throw 'La CLI no devolvió la URL local y la clave publicable de Supabase.'
}

$apiUri = [Uri]$status.API_URL
$browserUrl = '{0}://localhost:{1}' -f $apiUri.Scheme, $apiUri.Port
$containerUrl = '{0}://host.docker.internal:{1}' -f $apiUri.Scheme, $apiUri.Port
$envContent = @(
  "VITE_SUPABASE_URL=$browserUrl"
  "VITE_SUPABASE_PUBLISHABLE_KEY=$($status.PUBLISHABLE_KEY)"
  "SUPABASE_URL=$containerUrl"
  "SUPABASE_PUBLISHABLE_KEY=$($status.PUBLISHABLE_KEY)"
)
Set-Content -LiteralPath (Join-Path $projectRoot '.env.local') -Value $envContent -Encoding ascii
Write-Output "Configuración local guardada en .env.local. Navegador: $browserUrl; API del contenedor: $containerUrl."
