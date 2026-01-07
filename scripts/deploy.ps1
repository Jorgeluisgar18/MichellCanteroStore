# Script de deployment rápido para PowerShell
# Uso: .\scripts\deploy.ps1 "mensaje del commit"

param(
    [string]$CommitMessage = "chore: actualización automática"
)

Write-Host "🚀 Iniciando deployment..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la rama main
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "⚠️  Estás en la rama $currentBranch, no en main" -ForegroundColor Yellow
    $continue = Read-Host "¿Continuar de todos modos? (s/n)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# Verificar estado de Git
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "✅ No hay cambios para commitear" -ForegroundColor Green
    exit 0
}

# Agregar todos los cambios
Write-Host "📦 Agregando cambios..." -ForegroundColor Cyan
git add .

# Commit
Write-Host "💾 Creando commit..." -ForegroundColor Cyan
git commit -m $CommitMessage

# Push
Write-Host "📤 Subiendo a GitHub (esto activará el deployment en Vercel)..." -ForegroundColor Cyan
git push origin $currentBranch

Write-Host ""
Write-Host "✅ Cambios subidos exitosamente!" -ForegroundColor Green
Write-Host "🔗 Revisa el deployment en: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏳ El deployment tomará 2-5 minutos..." -ForegroundColor Yellow

