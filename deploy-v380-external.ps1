# V380 External Streaming Deployment Script (PowerShell)
# Deploys V380 external streaming configuration to VPS

param(
    [string]$VpsHost = "api.aiconstructpro.com",
    [string]$VpsUser = "siteguard",
    [string]$AppDir = "/opt/siteguard"
)

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

function Write-Info {
    param([string]$Message)
    Write-Host "${Green}[INFO]${Reset} $Message"
}

function Write-Warning {
    param([string]$Message)
    Write-Host "${Yellow}[WARN]${Reset} $Message"
}

function Write-Error {
    param([string]$Message)
    Write-Host "${Red}[ERROR]${Reset} $Message"
}

function Write-Step {
    param([string]$Message)
    Write-Host "${Blue}[STEP]${Reset} $Message"
}

Write-Host "🎥 V380 External Streaming Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "VPS Host: $VpsHost"
Write-Host "VPS User: $VpsUser"
Write-Host "App Directory: $AppDir"
Write-Host ""

Write-Step "1. Checking SSH Connection"

# Test SSH connection
try {
    $sshTest = ssh -o ConnectTimeout=10 -o BatchMode=yes "$VpsUser@$VpsHost" "exit" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Info "✅ SSH connection successful"
    } else {
        throw "SSH connection failed"
    }
} catch {
    Write-Error "❌ SSH connection failed"
    Write-Host "Please ensure:"
    Write-Host "1. SSH key is configured for $VpsUser@$VpsHost"
    Write-Host "2. VPS is accessible"
    Write-Host "3. User has proper permissions"
    exit 1
}

Write-Step "2. Backing Up Current Configuration"

$backupScript = @"
cd $AppDir

# Create backup directory
BACKUP_DIR="backups/v380-backup-`$(date +%Y%m%d-%H%M%S)"
mkdir -p "`$BACKUP_DIR"

# Backup current configurations
if [ -f "media-server/v380-config-manager.js" ]; then
    cp media-server/v380-config-manager.js "`$BACKUP_DIR/"
    echo "✅ Backed up v380-config-manager.js"
fi

if [ -f "src/lib/services/v380-service.ts" ]; then
    cp src/lib/services/v380-service.ts "`$BACKUP_DIR/"
    echo "✅ Backed up v380-service.ts"
fi

if [ -f "media-server/server.js" ]; then
    cp media-server/server.js "`$BACKUP_DIR/"
    echo "✅ Backed up media-server/server.js"
fi

if [ -f "media-server/v380-vpn-router.js" ]; then
    cp media-server/v380-vpn-router.js "`$BACKUP_DIR/"
    echo "✅ Backed up v380-vpn-router.js"
fi

echo "📦 Backup created in: `$BACKUP_DIR"
"@

ssh "$VpsUser@$VpsHost" $backupScript

Write-Step "3. Updating Repository"

$updateScript = @"
cd $AppDir

echo "🔄 Pulling latest changes..."
git fetch origin
git pull origin main

echo "✅ Repository updated"
"@

ssh "$VpsUser@$VpsHost" $updateScript

Write-Step "4. Installing Dependencies"

$depsScript = @"
cd $AppDir

echo "📦 Installing/updating dependencies..."
npm ci --production

echo "✅ Dependencies updated"
"@

ssh "$VpsUser@$VpsHost" $depsScript

Write-Step "5. Setting Up V380 External Configuration"

$setupScript = @"
cd $AppDir

# Make scripts executable
chmod +x configure-v380-external.sh
chmod +x test-v380-external-streaming.sh

echo "✅ Scripts made executable"
"@

ssh "$VpsUser@$VpsHost" $setupScript

Write-Step "6. Running V380 Configuration"

$configScript = @"
cd $AppDir

echo "🎥 Configuring V380 external camera..."
./configure-v380-external.sh

echo "✅ V380 configuration completed"
"@

ssh "$VpsUser@$VpsHost" $configScript

Write-Step "7. Building Application"

$buildScript = @"
cd $AppDir

echo "🔨 Building application..."
npm run build

echo "✅ Application built successfully"
"@

ssh "$VpsUser@$VpsHost" $buildScript

Write-Step "8. Restarting Services"

$restartScript = @"
echo "🔄 Restarting SiteGuard services..."

# Restart media server
pm2 restart siteguard-media-server
echo "✅ Media server restarted"

# Restart network server
pm2 restart siteguard-network-server
echo "✅ Network server restarted"

# Restart other services
pm2 restart siteguard-onvif-server
pm2 restart siteguard-security-server

echo "✅ All services restarted"

# Show service status
echo ""
echo "📊 Service Status:"
pm2 status
"@

ssh "$VpsUser@$VpsHost" $restartScript

Write-Step "9. Testing V380 External Streaming"

$testScript = @"
cd $AppDir

echo "🧪 Running V380 external streaming test..."
./test-v380-external-streaming.sh
"@

ssh "$VpsUser@$VpsHost" $testScript

Write-Step "10. Deployment Summary"

Write-Host ""
Write-Host "📋 Deployment Summary" -ForegroundColor Green
Write-Host "===================="
Write-Host "✅ Repository updated"
Write-Host "✅ V380 external configuration deployed"
Write-Host "✅ Services restarted"
Write-Host "✅ Streaming test completed"
Write-Host ""

Write-Info "🎉 V380 External Streaming Deployment Complete!"
Write-Host ""
Write-Host "🎥 Your V380 camera should now be accessible at:"
Write-Host "   HLS: https://api.aiconstructpro.com/live/camera_85725752/index.m3u8"
Write-Host "   WebRTC: wss://api.aiconstructpro.com/webrtc/camera_85725752"
Write-Host "   RTSP: rtsp://api.aiconstructpro.com:554/camera_85725752"
Write-Host ""
Write-Host "🔧 To monitor services:"
Write-Host "   ssh $VpsUser@$VpsHost"
Write-Host "   pm2 monit"
Write-Host ""
Write-Host "📊 To check logs:"
Write-Host "   pm2 logs siteguard-media-server"
Write-Host ""
Write-Host "=================================================="
