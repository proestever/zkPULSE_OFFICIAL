// Production starter that runs both services
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting zkPULSE Production Services...');

// Start relayer in background
const relayer = spawn('node', [path.join(__dirname, 'relayer', 'relayer-server.js')], {
    env: { ...process.env },
    stdio: 'inherit'
});

relayer.on('error', (err) => {
    console.error('Failed to start relayer:', err);
});

// Give relayer time to start
setTimeout(() => {
    // Start main server
    const main = spawn('node', [path.join(__dirname, 'frontend', 'unified-server.js')], {
        env: { ...process.env },
        stdio: 'inherit'
    });

    main.on('error', (err) => {
        console.error('Failed to start main server:', err);
        process.exit(1);
    });

    // Handle shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        main.kill('SIGTERM');
        relayer.kill('SIGTERM');
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully');
        main.kill('SIGTERM');
        relayer.kill('SIGTERM');
        process.exit(0);
    });

}, 3000);

console.log('zkPULSE services starting...');
console.log('Relayer will run on port 4000 (internal)');
console.log('Main app will run on port', process.env.PORT || 8888);