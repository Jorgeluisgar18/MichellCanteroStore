#!/bin/bash
# Script de deployment rápido
# Uso: ./scripts/deploy.sh "mensaje del commit"

set -e

COMMIT_MESSAGE=${1:-"chore: actualización automática"}

echo "🚀 Iniciando deployment..."
echo ""

# Verificar que estamos en la rama main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Estás en la rama $CURRENT_BRANCH, no en main"
    read -p "¿Continuar de todos modos? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Verificar estado de Git
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No hay cambios para commitear"
    exit 0
fi

# Agregar todos los cambios
echo "📦 Agregando cambios..."
git add .

# Commit
echo "💾 Creando commit..."
git commit -m "$COMMIT_MESSAGE"

# Push
echo "📤 Subiendo a GitHub (esto activará el deployment en Vercel)..."
git push origin "$CURRENT_BRANCH"

echo ""
echo "✅ Cambios subidos exitosamente!"
echo "🔗 Revisa el deployment en: https://vercel.com/dashboard"
echo ""
echo "⏳ El deployment tomará 2-5 minutos..."

