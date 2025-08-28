@echo off
echo Setting up local relayer for testing...
echo.

cd relayer

if not exist node_modules (
    echo Installing relayer dependencies...
    call npm install
)

if not exist .env (
    echo.
    echo Creating .env file for relayer...
    echo Please configure the following in relayer\.env:
    echo - RELAYER_PRIVATE_KEY=your_test_private_key
    echo - RELAYER_ADDRESS=your_test_address  
    echo - RPC_URL=wss://ws.pulsechain.com
    echo - RELAYER_PORT=4000
    echo.
    copy .env.example .env
    echo .env file created. Please edit it with your relayer credentials.
    pause
)

echo.
echo Starting relayer server on port 4000...
npm start