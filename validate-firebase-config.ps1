# Script para validar configuração Firebase (Windows PowerShell)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Firebase Configuration Validator" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se FIREBASE_SERVICE_ACCOUNT_JSON está definido
$serviceAccountJson = [System.Environment]::GetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_JSON", "User")

if ([string]::IsNullOrEmpty($serviceAccountJson)) {
    Write-Host "❌ FIREBASE_SERVICE_ACCOUNT_JSON não está definido!" -ForegroundColor Red
    Write-Host "   Configure em .env.local ou nas variáveis de ambiente do seu servidor" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ FIREBASE_SERVICE_ACCOUNT_JSON encontrado" -ForegroundColor Green
Write-Host ""

# Extrair project_id
try {
    $serviceAccountObj = $serviceAccountJson | ConvertFrom-Json
    $serverProjectId = $serviceAccountObj.project_id
} catch {
    Write-Host "❌ Erro ao fazer parse do JSON de FIREBASE_SERVICE_ACCOUNT_JSON" -ForegroundColor Red
    Write-Host "   Verifique se o JSON é válido" -ForegroundColor Yellow
    exit 1
}

if ([string]::IsNullOrEmpty($serverProjectId)) {
    Write-Host "❌ Não foi possível encontrar 'project_id' no JSON" -ForegroundColor Red
    exit 1
}

Write-Host "Server project_id: $serverProjectId" -ForegroundColor Yellow
Write-Host ""

# Verificar em config.ts
$configFile = Get-Content "src/firebase/config.ts" -Raw
$clientProjectMatch = [regex]::Match($configFile, 'projectId["\s]*:["\s]*"([^"]+)"')

if (-not $clientProjectMatch.Success) {
    Write-Host "❌ Não foi possível encontrar projectId em src/firebase/config.ts" -ForegroundColor Red
    exit 1
}

$clientProjectId = $clientProjectMatch.Groups[1].Value

Write-Host "Client projectId: $clientProjectId" -ForegroundColor Yellow
Write-Host ""

# Comparar
if ($serverProjectId -eq $clientProjectId) {
    Write-Host "✅ Project IDs COINCIDEM! Configuração está correta." -ForegroundColor Green
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
} else {
    Write-Host "❌ Project IDs NÃO COINCIDEM!" -ForegroundColor Red
    Write-Host "   Você precisa atualizar a configuração para que correspondam." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Yellow
    Write-Host "1. Atualizar FIREBASE_SERVICE_ACCOUNT_JSON com project_id: $clientProjectId" -ForegroundColor Cyan
    Write-Host "2. Ou atualizar src/firebase/config.ts com projectId: $serverProjectId" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    exit 1
}
