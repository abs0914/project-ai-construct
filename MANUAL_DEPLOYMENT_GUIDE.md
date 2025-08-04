# Manual Deployment Guide

If the automated scripts don't work, follow these manual steps to deploy the live feeds fix.

## Prerequisites

1. **SSH Client**: Ensure you have SSH installed (OpenSSH for Windows)
2. **SCP/SFTP**: For file transfer (usually comes with SSH)
3. **VPS Access**: SSH key or password access to `root@api.aiconstructpro.com`

## Step 1: Upload Files Manually

### Option A: Using SCP (Command Line)

Open Command Prompt or PowerShell and run these commands:

```bash
# Upload media server files
scp media-server\server.js root@api.aiconstructpro.com:/opt/siteguard/media-server/
scp media-server\config.js root@api.aiconstructpro.com:/opt/siteguard/media-server/

# Upload security server files
scp security-server\auth-middleware.js root@api.aiconstructpro.com:/opt/siteguard/security-server/

# Upload ONVIF server files
scp onvif-server\server.js root@api.aiconstructpro.com:/opt/siteguard/onvif-server/

# Upload network server files
scp network-server\server.js root@api.aiconstructpro.com:/opt/siteguard/network-server/
```

### Option B: Using WinSCP (GUI)

1. Download and install [WinSCP](https://winscp.net/)
2. Connect to your VPS:
   - Host: `api.aiconstructpro.com`
   - Username: `root`
   - Use your SSH key or password
3. Navigate to `/opt/siteguard/` on the remote side
4. Upload the files to their respective directories:
   - `media-server/server.js` → `/opt/siteguard/media-server/`
   - `media-server/config.js` → `/opt/siteguard/media-server/`
   - `security-server/auth-middleware.js` → `/opt/siteguard/security-server/`
   - `onvif-server/server.js` → `/opt/siteguard/onvif-server/`
   - `network-server/server.js` → `/opt/siteguard/network-server/`

### Option C: Using FileZilla (SFTP)

1. Download and install [FileZilla](https://filezilla-project.org/)
2. Connect using SFTP:
   - Host: `sftp://api.aiconstructpro.com`
   - Username: `root`
   - Port: `22`
   - Use your SSH key or password
3. Upload files as described in Option B

## Step 2: SSH into VPS and Configure

```bash
# Connect to VPS
ssh root@api.aiconstructpro.com

# Navigate to SiteGuard directory
cd /opt/siteguard

# Create backup directory
mkdir -p backups/$(date +%Y%m%d_%H%M%S)

# Update environment file
nano .env
```

Add or update these lines in the `.env` file:
```
PUBLIC_URL=https://api.aiconstructpro.com
DOMAIN=api.aiconstructpro.com
CORS_ORIGIN=https://aiconstructpro.com
ALLOWED_ORIGINS=https://aiconstructpro.com,https://www.aiconstructpro.com,https://preview--project-ai-construct.lovable.app
```

Save and exit (Ctrl+X, then Y, then Enter in nano).

## Step 3: Restart Services

```bash
# Restart all PM2 processes
pm2 restart all

# Check status
pm2 status

# Check logs for any errors
pm2 logs --lines 20
```

## Step 4: Verify Deployment

### Check Service Health
```bash
# Test local health endpoints
curl http://localhost:3001/health  # Media server
curl http://localhost:3002/health  # ONVIF server
curl http://localhost:3003/health  # Network server
curl http://localhost:3004/health  # Security server
```

### Check External Access
```bash
# Test external health endpoint
curl https://api.aiconstructpro.com/api/health
```

## Step 5: Test Live Feeds

1. Open your frontend application at `https://aiconstructpro.com`
2. Navigate to the live feeds section
3. Check browser console (F12) for any CORS errors
4. Try to start a live feed

### Expected Results:
- ✅ No CORS errors in browser console
- ✅ Stream URLs show `https://api.aiconstructpro.com` instead of `localhost`
- ✅ HLS streams are accessible
- ✅ Live feeds display properly

## Troubleshooting

### If CORS errors persist:
```bash
# Check PM2 logs
pm2 logs

# Restart specific service
pm2 restart media-server
pm2 restart security-server
```

### If stream URLs still show localhost:
```bash
# Check environment variables
cat /opt/siteguard/.env

# Verify the media server is using new code
pm2 logs media-server
```

### If services won't start:
```bash
# Check PM2 status
pm2 status

# Check system logs
journalctl -u pm2-root --lines 50

# Manually start a service for debugging
cd /opt/siteguard/media-server
node server.js
```

### If files didn't upload correctly:
```bash
# Check file permissions
ls -la /opt/siteguard/media-server/
ls -la /opt/siteguard/security-server/

# Fix permissions if needed
chown -R root:root /opt/siteguard/
chmod +x /opt/siteguard/*/server.js
```

## Rollback Instructions

If something goes wrong, you can rollback:

```bash
# Find your backup directory
ls -la /opt/siteguard/backups/

# Restore from backup (replace YYYYMMDD_HHMMSS with your backup timestamp)
cd /opt/siteguard
cp backups/YYYYMMDD_HHMMSS/*.bak ./

# Restart services
pm2 restart all
```

## Success Indicators

✅ **PM2 Status**: All services show "online"
✅ **Health Checks**: All endpoints return 200 OK
✅ **CORS**: No CORS errors in browser console
✅ **Stream URLs**: Use public domain instead of localhost
✅ **Live Feeds**: Display properly in frontend

## Need Help?

If you encounter issues:
1. Check the PM2 logs: `pm2 logs`
2. Verify file uploads completed successfully
3. Ensure environment variables are set correctly
4. Test each service individually

The deployment should resolve all the live feeds issues! 🚀
