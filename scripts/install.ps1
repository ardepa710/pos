# POS — Install script (Windows PowerShell)

Write-Host "=== POS — Instalacion ===" -ForegroundColor Green

# Generate .env if not present
if (-not (Test-Path ".env")) {
    Write-Host "Generando .env desde .env.example..."
    Copy-Item ".env.example" ".env"

    $dbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
    $jwtSecret  = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    $adminPass  = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object { [char]$_ })

    (Get-Content ".env") -replace "pos_password", $dbPassword | Set-Content ".env"
    (Get-Content ".env") -replace "CHANGE_ME_32_CHARS_MINIMUM_RANDOM_STRING", $jwtSecret | Set-Content ".env"
    Add-Content ".env" "ADMIN_INITIAL_PASSWORD=$adminPass"

    Write-Host "Contrasena admin inicial: $adminPass" -ForegroundColor Yellow
}

$businessName = Read-Host "Nombre del negocio"
(Get-Content ".env") -replace "Mi Negocio", $businessName | Set-Content ".env"

Write-Host "Iniciando contenedores..."
docker compose up -d --build

Write-Host "Esperando servicios..."
Start-Sleep -Seconds 15

$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Write-Host "Esperando backend..."
    Start-Sleep -Seconds 3
}

if ($ready) {
    Write-Host "POS listo en http://localhost" -ForegroundColor Green
    Write-Host "Usuario: admin" -ForegroundColor Green
    Write-Host "Ver .env -> ADMIN_INITIAL_PASSWORD para la contrasena" -ForegroundColor Yellow
} else {
    Write-Host "El backend tardo mas de lo esperado. Revisa: docker compose logs backend" -ForegroundColor Red
}
