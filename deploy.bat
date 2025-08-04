@echo off
echo 🚀 SiteGuard Live Feeds Fix Deployment
echo =====================================
echo.

REM Check if PowerShell is available
powershell -Command "Write-Host 'PowerShell is available'" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PowerShell is not available. Please install PowerShell.
    pause
    exit /b 1
)

REM Check if SSH is available
ssh -V >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ SSH client is not available. Please install OpenSSH.
    echo You can install it via Windows Features or download from:
    echo https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed
echo.

REM Run the PowerShell deployment script
echo Running deployment script...
powershell -ExecutionPolicy Bypass -File "deploy-windows.ps1"

echo.
echo Deployment script completed.
pause
