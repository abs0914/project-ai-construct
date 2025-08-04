# PowerShell script to deploy live feeds fix to VPS
# Run this script from PowerShell as Administrator

param(
    [string]$VpsHost = "api.aiconstructpro.com",
    [string]$VpsUser = "root",
    [string]$VpsPath = "/opt/siteguard"
)

Write-Host "🚀 Starting deployment of live feeds fix..." -ForegroundColor Blue

# Check if we have the required files
$requiredFiles = @(
    "media-server\server.js",
    "media-server\config.js",
    "security-server\auth-middleware.js",
    "onvif-server\server.js",
    "network-server\server.js"
)

Write-Host "📁 Checking required files..." -ForegroundColor Yellow
foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        Write-Host "❌ Missing file: $file" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Found: $file" -ForegroundColor Green
}

# Test SSH connection
Write-Host "🔐 Testing SSH connection..." -ForegroundColor Yellow
$sshTest = ssh -o ConnectTimeout=10 -o BatchMode=yes "$VpsUser@$VpsHost" "exit" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cannot connect to VPS. Please check your SSH configuration." -ForegroundColor Red
    Write-Host "Make sure you have:" -ForegroundColor Yellow
    Write-Host "  1. SSH client installed (OpenSSH)" -ForegroundColor Yellow
    Write-Host "  2. SSH key configured for $VpsUser@$VpsHost" -ForegroundColor Yellow
    Write-Host "  3. VPS is accessible" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ SSH connection successful" -ForegroundColor Green

# Create backup directory
Write-Host "📦 Creating backup directory on VPS..." -ForegroundColor Yellow
$backupDir = "/opt/siteguard/backups/$(Get-Date -Format 'yyyyMMdd_HHmmss')"
ssh "$VpsUser@$VpsHost" "mkdir -p $backupDir"

# Backup existing files
Write-Host "💾 Backing up existing files..." -ForegroundColor Yellow
ssh "$VpsUser@$VpsHost" @"
cp /opt/siteguard/media-server/server.js $backupDir/media-server.js.bak 2>/dev/null || true
cp /opt/siteguard/media-server/config.js $backupDir/media-config.js.bak 2>/dev/null || true
cp /opt/siteguard/security-server/auth-middleware.js $backupDir/auth-middleware.js.bak 2>/dev/null || true
cp /opt/siteguard/onvif-server/server.js $backupDir/onvif-server.js.bak 2>/dev/null || true
cp /opt/siteguard/network-server/server.js $backupDir/network-server.js.bak 2>/dev/null || true
"@

# Upload files
Write-Host "📤 Uploading fixed files..." -ForegroundColor Blue

Write-Host "  → Uploading media server files..." -ForegroundColor Cyan
scp "media-server\server.js" "$VpsUser@$VpsHost`:$VpsPath/media-server/"
scp "media-server\config.js" "$VpsUser@$VpsHost`:$VpsPath/media-server/"

Write-Host "  → Uploading security server files..." -ForegroundColor Cyan
scp "security-server\auth-middleware.js" "$VpsUser@$VpsHost`:$VpsPath/security-server/"

Write-Host "  → Uploading ONVIF server files..." -ForegroundColor Cyan
scp "onvif-server\server.js" "$VpsUser@$VpsHost`:$VpsPath/onvif-server/"

Write-Host "  → Uploading network server files..." -ForegroundColor Cyan
scp "network-server\server.js" "$VpsUser@$VpsHost`:$VpsPath/network-server/"

Write-Host "✅ All files uploaded successfully!" -ForegroundColor Green

# Update environment configuration
Write-Host "⚙️ Updating environment configuration..." -ForegroundColor Yellow
ssh "$VpsUser@$VpsHost" @"
cd /opt/siteguard

# Update or add environment variables
if [ -f .env ]; then
    # Backup existing .env
    cp .env $backupDir/.env.bak
    
    # Update PUBLIC_URL
    if grep -q "^PUBLIC_URL=" .env; then
        sed -i 's|^PUBLIC_URL=.*|PUBLIC_URL=https://api.aiconstructpro.com|' .env
    else
        echo 'PUBLIC_URL=https://api.aiconstructpro.com' >> .env
    fi
    
    # Update DOMAIN
    if grep -q "^DOMAIN=" .env; then
        sed -i 's|^DOMAIN=.*|DOMAIN=api.aiconstructpro.com|' .env
    else
        echo 'DOMAIN=api.aiconstructpro.com' >> .env
    fi
    
    # Update CORS settings
    sed -i 's|^CORS_ORIGIN=.*|CORS_ORIGIN=https://aiconstructpro.com|' .env
    sed -i 's|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=https://aiconstructpro.com,https://www.aiconstructpro.com,https://preview--project-ai-construct.lovable.app|' .env
    
    echo "✅ Environment file updated"
else
    echo "⚠️ No .env file found, creating one..."
    cat > .env << 'EOF'
PUBLIC_URL=https://api.aiconstructpro.com
DOMAIN=api.aiconstructpro.com
CORS_ORIGIN=https://aiconstructpro.com
ALLOWED_ORIGINS=https://aiconstructpro.com,https://www.aiconstructpro.com,https://preview--project-ai-construct.lovable.app
EOF
    echo "✅ Environment file created"
fi
"@

# Restart services
Write-Host "🔄 Restarting PM2 services..." -ForegroundColor Yellow
ssh "$VpsUser@$VpsHost" @"
cd /opt/siteguard

echo "Restarting all PM2 processes..."
pm2 restart all

echo "Waiting for services to start..."
sleep 5

echo "📊 PM2 Status:"
pm2 status

echo "🏥 Testing health endpoints..."
curl -s http://localhost:3001/health | head -1 || echo "❌ Media server health check failed"
curl -s http://localhost:3002/health | head -1 || echo "❌ ONVIF server health check failed"
curl -s http://localhost:3003/health | head -1 || echo "❌ Network server health check failed"
curl -s http://localhost:3004/health | head -1 || echo "❌ Security server health check failed"
"@

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Test the live feeds in your frontend application" -ForegroundColor White
Write-Host "2. Check browser console for CORS errors (should be gone)" -ForegroundColor White
Write-Host "3. Verify stream URLs use https://api.aiconstructpro.com" -ForegroundColor White
Write-Host ""
Write-Host "If you encounter issues, check PM2 logs:" -ForegroundColor Yellow
Write-Host "  ssh $VpsUser@$VpsHost 'pm2 logs'" -ForegroundColor White
Write-Host ""
Write-Host "Backup location: $backupDir" -ForegroundColor Cyan
