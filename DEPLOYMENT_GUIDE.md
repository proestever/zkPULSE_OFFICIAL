# ZK Pulse Deployment Guide

## Quick Deployment Options

### Option 1: Deploy to Vercel (Recommended for Frontend)

1. Fork this repository to your GitHub account
2. Go to [Vercel](https://vercel.com)
3. Import your forked repository
4. Set the root directory to `/`
5. Deploy!

### Option 2: Deploy to Netlify

1. Fork this repository
2. Go to [Netlify](https://netlify.com)
3. Connect your GitHub account
4. Select your forked repository
5. Build command: `npm install`
6. Publish directory: `frontend`
7. Deploy!

### Option 3: Deploy to VPS (Full Control)

#### Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Node.js 14+ and npm
- Nginx (optional, for reverse proxy)
- PM2 for process management

#### Steps

1. **Connect to your VPS**
```bash
ssh user@your-server-ip
```

2. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. **Clone the repository**
```bash
git clone https://github.com/yourusername/zkpulse.git
cd zkpulse
```

4. **Install dependencies**
```bash
npm install
```

5. **Install PM2**
```bash
sudo npm install -g pm2
```

6. **Start the application**
```bash
pm2 start frontend/unified-server.js --name zkpulse
pm2 save
pm2 startup
```

7. **Configure Nginx (optional)**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

8. **Enable SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 4: Deploy to Heroku

1. **Install Heroku CLI**
2. **Create a new Heroku app**
```bash
heroku create your-app-name
```

3. **Add buildpacks**
```bash
heroku buildpacks:set heroku/nodejs
```

4. **Deploy**
```bash
git push heroku main
```

### Option 5: Deploy with Docker

1. **Create Dockerfile**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

2. **Build and run**
```bash
docker build -t zkpulse .
docker run -p 3000:3000 zkpulse
```

## Environment Configuration

### Required Environment Variables
```env
PORT=3000
NODE_ENV=production
```

### Optional Configuration
```env
# If using custom RPC
RPC_URL=https://rpc.pulsechain.com

# If implementing rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

## Post-Deployment Checklist

- [ ] Test wallet connection
- [ ] Test deposit with small amount (1 PLS test pool)
- [ ] Test withdrawal functionality
- [ ] Verify all contract addresses are correct
- [ ] Check that documentation link works
- [ ] Test on mobile devices
- [ ] Enable HTTPS/SSL
- [ ] Set up monitoring (optional)
- [ ] Configure backups (optional)

## Monitoring (Optional)

### Using PM2 Monitoring
```bash
pm2 monit
pm2 logs zkpulse
```

### Using External Services
- UptimeRobot for uptime monitoring
- LogDNA or Papertrail for log management
- New Relic or DataDog for performance monitoring

## Updating the Deployment

1. **Pull latest changes**
```bash
git pull origin main
```

2. **Install new dependencies**
```bash
npm install
```

3. **Restart the application**
```bash
pm2 restart zkpulse
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill the process
kill -9 [PID]
```

### PM2 Not Starting
```bash
pm2 delete all
pm2 start frontend/unified-server.js --name zkpulse
```

### Nginx 502 Bad Gateway
- Check if Node.js app is running
- Verify proxy_pass port matches your app port
- Check PM2 logs: `pm2 logs`

## Security Recommendations

1. **Use HTTPS**: Always use SSL certificates in production
2. **Firewall**: Configure UFW or similar
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```
3. **Rate Limiting**: Implement rate limiting for API endpoints
4. **CORS**: Configure CORS appropriately
5. **Headers**: Use security headers (Helmet.js included)

## Performance Optimization

1. **Enable Gzip Compression**
2. **Use CDN for static assets**
3. **Enable browser caching**
4. **Minimize JavaScript bundle**
5. **Use Redis for caching (optional)**

## Backup Strategy

1. **Database**: Not applicable (no database)
2. **Configuration**: Backup `.env` file
3. **Logs**: Configure log rotation
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   ```

## Support

For deployment issues:
1. Check the logs: `pm2 logs`
2. Verify all dependencies are installed
3. Ensure correct Node.js version
4. Check network/firewall settings
5. Open an issue on GitHub if needed

---

**Note**: Always test thoroughly in a staging environment before deploying to production!