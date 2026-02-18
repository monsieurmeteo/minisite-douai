# Script PowerShell Interactif pour configurer les secrets Supabase
# Il va récupérer l'URL automatiquement, mais vous demandera la clé secrète

# 1. Lire .env.local pour l'URL
$envContent = Get-Content .env.local
$urlLine = $envContent | Select-String "VITE_SUPABASE_URL="
$url = $urlLine.ToString().Split('=')[1].Trim()

Write-Host "`n=== CONFIGURATION DU ROBOT CLOUD ===" -ForegroundColor Cyan
Write-Host "✅ URL du projet trouvée : $url" -ForegroundColor Green

# 2. Demander la clé Service Role à l'utilisateur
Write-Host "`n🔐 J'ai besoin de la clé 'service_role' (celle qui est secrète)." -ForegroundColor Yellow
Write-Host "   Allez dans Supabase > Settings > API > Project API keys > service_role"
$key = Read-Host "👉 Collez la clé 'service_role' (commence par eyJ...) et faites Entrée"

if ([string]::IsNullOrWhiteSpace($key)) {
    Write-Host "❌ Aucune clé fournie. Abandon." -ForegroundColor Red
    exit
}

# 3. Envoyer
Write-Host "`n🚀 Envoi..." -ForegroundColor Cyan
# On utilise le bon nom de variable (SERVICE_ROLE_KEY)
$cmd = "npx supabase secrets set SUPABASE_URL=$url SERVICE_ROLE_KEY=$key"

Invoke-Expression $cmd

Write-Host "`n✅ Terminé ! Le robot Cloud est armé." -ForegroundColor Green
Write-Host "   Dernière étape : Déployer le code si ce n'est pas fait :"
Write-Host "   npx supabase functions deploy collect-6mn --no-verify-jwt"
