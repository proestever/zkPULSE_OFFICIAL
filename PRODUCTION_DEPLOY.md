# Production Deployment Guide for zkPULSE

## Pre-Deployment Checklist

1. **Update Domain Settings** in `.env`:
   ```
   CORS_ORIGIN=https://your-actual-domain.com
   CUSTOM_DOMAIN=your-actual-domain.com
   ```

2. **Relayer Wallet**:
   - Ensure relayer wallet has sufficient PLS (minimum 50,000 PLS recommended)
   - Keep private key secure in `relayer/.env`

## Server Setup (Ubuntu/Debian)

### 1. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install nginx for reverse proxy
sudo apt install nginx -y
```

### 2. Clone and Setup Project
```bash
# Clone your repository
cd /opt
git clone [your-repo-url] zkpulse
cd zkpulse

# Install dependencies
npm install
cd relayer && npm install && cd ..

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'zkpulse-main',
      script: './frontend/unified-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8888
      },
      max_memory_restart: '2G',
      error_file: './logs/main-err.log',
      out_file: './logs/main-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'zkpulse-relayer',
      script: './relayer/relayer-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      max_memory_restart: '1G',
      error_file: './logs/relayer-err.log',
      out_file: './logs/relayer-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs
```

### 3. Configure Nginx Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/zkpulse
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Main app
    location / {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8888;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optional: Expose relayer status endpoint
    location /relayer/status {
        proxy_pass http://localhost:4000/status;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### 4. Setup SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### 5. Enable and Start Services
```bash
# Enable nginx site
sudo ln -s /etc/nginx/sites-available/zkpulse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Start PM2 services
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER
```

### 6. Configure Firewall
```bash
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

## CORS and Security Configuration

The relayer communicates internally on localhost:4000, so no external access is needed. The main app handles all public requests.

### Internal Communication Flow:
1. **User → Main App** (port 8888/443 via nginx)
2. **Main App → Relayer** (localhost:4000 internally)
3. **Relayer → Blockchain** (via your public RPC)

## Environment Variables Summary

### Main `.env`:
- `RPC_URL=https://rpc.gigatheminter.com`
- `WSS_URL=wss://rpc.gigatheminter.com/ws`
- `NODE_ENV=production`
- `CORS_ORIGIN=https://your-domain.com`

### Relayer `.env`:
- `RPC_URL=https://rpc.gigatheminter.com`
- `RELAYER_PRIVATE_KEY=0x...` (keep secret!)
- `RELAYER_ADDRESS=0x968DD9f833C58C0ADa629eF8f60180C7fEeF78d3`

## Monitoring

### Check service status:
```bash
pm2 status
pm2 logs zkpulse-main
pm2 logs zkpulse-relayer
```

### Monitor resources:
```bash
pm2 monit
```

### Check nginx logs:
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Updating the Application

```bash
cd /opt/zkpulse
git pull
npm install
cd relayer && npm install && cd ..
pm2 restart all
```

## Backup Recommendations

1. **Backup relayer private key** (relayer/.env) securely offline
2. **Setup automated database backups** if you add any persistence layer
3. **Monitor relayer wallet balance** and set up alerts

## Performance Tips

1. Your RPC endpoints (`rpc.gigatheminter.com`) should handle the load
2. The parallel event fetching is already optimized
3. Consider adding Redis for event caching if needed
4. Monitor CPU/RAM usage and scale server if needed

## Security Notes

- **Never expose port 4000** (relayer) directly to internet
- **Keep relayer private key secure**
- **Use strong SSL certificates**
- **Regularly update dependencies**
- **Monitor for unusual activity**

## Support

For issues:
1. Check PM2 logs: `pm2 logs`
2. Check nginx logs: `/var/log/nginx/`
3. Verify RPC connectivity to `rpc.gigatheminter.com`
4. Ensure relayer wallet has sufficient PLS