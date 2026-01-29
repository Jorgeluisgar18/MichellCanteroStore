# Script para configurar variables de entorno en Vercel
# Ejecutar con: .\setup-vercel-env.ps1

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Configuración de Variables Vercel" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Generar CRON_SECRET
$cronSecret = [guid]::NewGuid().ToString()
Write-Host "CRON_SECRET generado: $cronSecret" -ForegroundColor Green
Write-Host ""

# Wompi Production Keys
$wompiKeys = @{
    "NEXT_PUBLIC_WOMPI_PUBLIC_KEY" = "pub_prod_NirDvZP9LnojM1jXIg240pTBpeCa7hPF"
    "WOMPI_PRIVATE_KEY" = "prv_prod_baKX1IyXwd7RQQfPFTk2nQ7X4vFw0w5G"
    "WOMPI_EVENTS_SECRET" = "prod_events_J399xlBHnN23oZ5koXoQy4IeMoFfGwHy"
    "WOMPI_INTEGRITY_SECRET" = "prod_integrity_DHbiRtaWaewpAacn2itZIzCq7HCOuQlg"
    "CRON_SECRET" = $cronSecret
}

Write-Host "Variables a configurar:" -ForegroundColor Yellow
foreach ($key in $wompiKeys.Keys) {
    Write-Host "  - $key" -ForegroundColor White
}
Write-Host ""

$confirm = Read-Host "¿Deseas continuar? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operación cancelada" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Configurando variables..." -ForegroundColor Cyan
Write-Host ""

foreach ($key in $wompiKeys.Keys) {
    $value = $wompiKeys[$key]
    Write-Host "Configurando $key..." -ForegroundColor Yellow
    
    # Usar echo para pasar el valor automáticamente
    $value | vercel env add $key production
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $key configurado" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Error configurando $key" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Configuración completada" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verifica las variables con:" -ForegroundColor Yellow
Write-Host "  vercel env ls" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE: Guarda el CRON_SECRET:" -ForegroundColor Red
Write-Host "  $cronSecret" -ForegroundColor White
Write-Host ""
