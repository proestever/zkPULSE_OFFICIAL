@echo off
echo ========================================
echo Starting ZK PULSE with Local Relayer
echo ========================================
echo.
echo IMPORTANT: Before running, make sure:
echo 1. Your PulseChain node is running on localhost:8545/8546
echo 2. You've configured relayer\.env with your relayer wallet
echo 3. Your relayer wallet has PLS for gas fees
echo.
echo Starting services...
echo ========================================
echo.

:: Start the relayer in a new window that stays open
echo Starting Relayer Server (port 4000)...
start "ZK PULSE Relayer" cmd /k "cd relayer && node relayer-server.js"

:: Wait a moment for relayer to start
echo Waiting for relayer to initialize...
timeout /t 3 /nobreak > nul

:: Start the main server in the current window
echo Starting Main Server (port 8888)...
echo.
node frontend/unified-server.js