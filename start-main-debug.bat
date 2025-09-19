@echo off
echo ========================================
echo Starting ZK PULSE Main Server (Debug Mode)
echo ========================================
echo.
echo Main app will run on port 8888
echo Make sure your PulseChain node is running on localhost:8545/8546
echo.
echo If the app crashes, you'll see the error below:
echo ========================================
echo.

cd /d "C:\GIGA BRAIN\Pulsechain_Tornado_Cash_zkPULSE"

node frontend/unified-server.js

echo.
echo ========================================
echo Server stopped or crashed!
echo ========================================
echo.
pause