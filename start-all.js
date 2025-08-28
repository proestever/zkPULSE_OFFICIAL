// Combined starter script for Render deployment
// This runs both the frontend and relayer in one service

const { spawn } = require('child_process');
const path = require('path');

console.log('Starting zkPulse services...');

// Start frontend server
const frontend = spawn('node', ['frontend/unified-server.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

// Start relayer server
const relayer = spawn('node', ['relayer/relayer-server-secure.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

// Handle exit
process.on('SIGTERM', () => {
    console.log('Shutting down services...');
    frontend.kill();
    relayer.kill();
    process.exit(0);
});

frontend.on('error', (err) => {
    console.error('Frontend error:', err);
});

relayer.on('error', (err) => {
    console.error('Relayer error:', err);
});

console.log('Both services started successfully!');