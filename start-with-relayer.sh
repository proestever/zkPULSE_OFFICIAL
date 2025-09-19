#!/bin/bash
echo "========================================"
echo "Starting ZK PULSE with Local Relayer"
echo "========================================"
echo ""
echo "IMPORTANT: Before running, make sure:"
echo "1. Your PulseChain node is running on localhost:8545/8546"
echo "2. You've configured relayer/.env with your relayer wallet"
echo "3. Your relayer wallet has PLS for gas fees"
echo ""
echo "Starting services..."
echo "========================================"
echo ""

# Start the relayer in background
echo "Starting Relayer Server (port 4000)..."
cd relayer && npm start &
RELAYER_PID=$!
cd ..

# Wait for relayer to start
sleep 3

# Start the main server
echo "Starting Main Server (port 8888)..."
node frontend/unified-server.js &
MAIN_PID=$!

echo ""
echo "========================================"
echo "Services are running:"
echo "- Relayer: http://localhost:4000 (PID: $RELAYER_PID)"
echo "- Main App: http://localhost:8888 (PID: $MAIN_PID)"
echo ""
echo "Press Ctrl+C to stop both services"
echo "========================================"

# Wait for interrupt and clean up
trap "kill $RELAYER_PID $MAIN_PID 2>/dev/null; exit" INT
wait