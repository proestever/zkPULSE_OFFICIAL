@echo off
echo ========================================
echo Starting ZK PULSE with Local PulseChain Node
echo ========================================
echo.
echo Make sure your PulseChain node is running:
echo - RPC on http://localhost:8545
echo - WebSocket on ws://localhost:8546
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node frontend/unified-server.js