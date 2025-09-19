@echo off
echo ========================================
echo Starting ZK PULSE Relayer Only
echo ========================================
echo.
echo Relayer will run on port 4000
echo Make sure your PulseChain node is running on localhost:8545
echo.
cd relayer
node relayer-server.js