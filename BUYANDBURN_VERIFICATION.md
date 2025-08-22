# zkPULSE_BuyandBurn Contract Verification

## Contract Address
`0x41C06617196Cb2eF92E7311a55DAf4d3B70EBaEF`

## Network
PulseChain (Chain ID: 369)

## Contract Purpose
Automatically buys token `0x8De9077B619DcBdA28edda4b8dC16538a59EFb49` with any PLS sent to it and immediately burns the tokens by sending them to `0x0000000000000000000000000000000000000369`

## Compiler Settings
- **Compiler Version:** v0.7.6+commit.7338295f
- **EVM Version:** Istanbul
- **Optimization Enabled:** Yes
- **Optimization Runs:** 200

## Constructor Arguments
None (no constructor parameters)

## Key Features
- **Completely Immutable** - No owner, no admin functions
- **Automatic Execution** - Triggers on receiving PLS
- **Minimum Amount** - 0.01 PLS to prevent dust
- **Direct Burn** - Tokens sent directly to burn address
- **Fail-Safe** - Returns PLS if swap fails

## Source Code
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPulseXRouter {
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts);
    
    function WPLS() external pure returns (address);
}

/**
 * @title zkPULSE_BuyandBurn
 * @dev Immutable contract that automatically buys a token and burns it whenever PLS is received
 * @notice This contract has no owner, no admin functions, and cannot be modified
 */
contract zkPULSE_BuyandBurn {
    // Constants - these can never be changed
    address public constant TARGET_TOKEN = 0x8De9077B619DcBdA28edda4b8dC16538a59EFb49;
    address public constant BURN_ADDRESS = 0x0000000000000000000000000000000000000369;
    
    // PulseX Router V2 address on PulseChain
    IPulseXRouter public constant PULSEX_ROUTER = IPulseXRouter(0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02);
    
    // Minimum amount to trigger a swap (to avoid dust amounts)
    uint256 public constant MIN_SWAP_AMOUNT = 0.01 ether; // 0.01 PLS minimum
    
    // Events
    event TokensBoughtAndBurned(
        uint256 plsAmount,
        uint256 tokensReceived,
        uint256 timestamp
    );
    
    event SwapFailed(
        uint256 plsAmount,
        string reason
    );
    
    /**
     * @dev Constructor - does nothing, contract is ready immediately
     */
    constructor() {
        // No initialization needed - everything is immutable
    }
    
    /**
     * @dev Receive function - triggered when PLS is sent to this contract
     * Automatically buys the target token and sends to burn address
     */
    receive() external payable {
        if (msg.value >= MIN_SWAP_AMOUNT) {
            _buyAndBurn(msg.value);
        }
    }
    
    /**
     * @dev Fallback function - same as receive
     */
    fallback() external payable {
        if (msg.value >= MIN_SWAP_AMOUNT) {
            _buyAndBurn(msg.value);
        }
    }
    
    /**
     * @dev Internal function to buy tokens and burn them
     * @param plsAmount Amount of PLS to swap
     */
    function _buyAndBurn(uint256 plsAmount) internal {
        // Setup the swap path: PLS -> WPLS -> TARGET_TOKEN
        address[] memory path = new address[](2);
        path[0] = PULSEX_ROUTER.WPLS();
        path[1] = TARGET_TOKEN;
        
        try PULSEX_ROUTER.swapExactETHForTokens{value: plsAmount}(
            0, // Accept any amount of tokens (no slippage protection for simplicity)
            path,
            BURN_ADDRESS, // Send tokens directly to burn address
            block.timestamp + 300 // 5 minute deadline
        ) returns (uint[] memory amounts) {
            emit TokensBoughtAndBurned(
                plsAmount,
                amounts[1], // Amount of tokens received
                block.timestamp
            );
        } catch Error(string memory reason) {
            emit SwapFailed(plsAmount, reason);
            // If swap fails, try to return PLS to sender
            // If sender is a contract that can't receive, PLS stays in this contract
            (bool refundSuccess, ) = msg.sender.call{value: plsAmount}("");
            if (!refundSuccess) {
                // PLS stays in contract, will be used in next transaction
            }
        } catch {
            emit SwapFailed(plsAmount, "Unknown error");
            // Try to refund
            (bool refundSuccess, ) = msg.sender.call{value: plsAmount}("");
            if (!refundSuccess) {
                // PLS stays in contract
            }
        }
    }
    
    /**
     * @dev Manual trigger function - anyone can call this to execute pending swaps
     * Useful if PLS accumulated from failed swaps
     */
    function executePendingBuyAndBurn() external {
        uint256 balance = address(this).balance;
        if (balance >= MIN_SWAP_AMOUNT) {
            _buyAndBurn(balance);
        }
    }
    
    /**
     * @dev View function to check contract's PLS balance
     */
    function pendingPLS() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev View function to get swap path
     */
    function getSwapPath() external view returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = PULSEX_ROUTER.WPLS();
        path[1] = TARGET_TOKEN;
        return path;
    }
    
    /**
     * @dev Emergency token recovery - ONLY for tokens accidentally sent to this contract
     * Cannot recover the TARGET_TOKEN (to prevent circumventing the burn)
     * @param token Address of token to recover
     * @param to Address to send recovered tokens to
     */
    function recoverToken(address token, address to) external {
        require(token != TARGET_TOKEN, "Cannot recover target token");
        require(token != address(0), "Invalid token address");
        require(to != address(0), "Invalid recipient");
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(to, balance);
        }
    }
}
```

## How It Works

1. **Send PLS** to `0x41C06617196Cb2eF92E7311a55DAf4d3B70EBaEF`
2. **Automatic Swap** - Contract swaps PLS for token `0x8De9077B619DcBdA28edda4b8dC16538a59EFb49` on PulseX
3. **Instant Burn** - Tokens sent directly to burn address `0x0000000000000000000000000000000000000369`

## Verification Steps

1. Go to: https://otter.pulsechain.com/address/0x41C06617196Cb2eF92E7311a55DAf4d3B70EBaEF
2. Click "Contract" tab → "Verify and Publish"
3. Select Compiler: v0.7.6+commit.7338295f
4. Optimization: Yes, Runs: 200
5. Paste the source code above
6. No constructor arguments needed

## Important Notes

- **Minimum Amount:** 0.01 PLS (smaller amounts are ignored)
- **No Admin Functions:** Completely immutable and trustless
- **Fail-Safe:** If swap fails, PLS is refunded to sender
- **Anyone Can Trigger:** `executePendingBuyAndBurn()` can be called by anyone to process accumulated PLS