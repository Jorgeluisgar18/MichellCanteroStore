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

Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "Ejecuta estos comandos uno por uno en la terminal:" -ForegroundColor White
Write-Host ""

Write-Host "# 1. Public Key" -ForegroundColor Cyan
Write-Host 'echo "pub_prod_NirDvZP9LnojM1jXIg240pTBpeCa7hPF" | vercel env add NEXT_PUBLIC_WOMPI_PUBLIC_KEY production' -ForegroundColor White
Write-Host ""

Write-Host "# 2. Private Key" -ForegroundColor Cyan
Write-Host 'echo "prv_prod_baKX1IyXwd7RQQfPFTk2nQ7X4vFw0w5G" | vercel env add WOMPI_PRIVATE_KEY production' -ForegroundColor White
Write-Host ""

Write-Host "# 3. Events Secret" -ForegroundColor Cyan
Write-Host 'echo "prod_events_J399xlBHnN23oZ5koXoQy4IeMoFfGwHy" | vercel env add WOMPI_EVENTS_SECRET production' -ForegroundColor White
Write-Host ""

Write-Host "# 4. Integrity Secret" -ForegroundColor Cyan
Write-Host 'echo "prod_integrity_DHbiRtaWaewpAacn2itZIzCq7HCOuQlg" | vercel env add WOMPI_INTEGRITY_SECRET production' -ForegroundColor White
Write-Host ""

Write-Host "# 5. Cron Secret" -ForegroundColor Cyan
Write-Host "echo `"$cronSecret`" | vercel env add CRON_SECRET production" -ForegroundColor White
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "IMPORTANTE: Guarda este CRON_SECRET" -ForegroundColor Red
Write-Host "$cronSecret" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Después de ejecutar los comandos, verifica con:" -ForegroundColor Yellow
Write-Host "  vercel env ls" -ForegroundColor White
Write-Host ""
