#!/bin/bash

echo "========================================"
echo "ZK PULSE - Production Deployment Script"
echo "========================================"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null
then
    echo "PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Install dependencies
echo "Installing dependencies..."
npm ci --only=production

# Create ecosystem file for PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'zkpulse',
    script: './frontend/unified-server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 8888
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 5000,
    autorestart: true,
    watch: false
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Stop existing instance if running
pm2 stop zkpulse 2>/dev/null || true
pm2 delete zkpulse 2>/dev/null || true

# Start application
echo "Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
echo "Setting up auto-start on system boot..."
pm2 startup

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Application is running at: http://localhost:8888"
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status        - Check application status"
echo "  pm2 logs zkpulse  - View application logs"
echo "  pm2 restart zkpulse - Restart application"
echo "  pm2 stop zkpulse  - Stop application"
echo ""
echo "To use custom RPC endpoints, edit .env file and restart:"
echo "  pm2 restart zkpulse"
echo ""