# TornadoRouter Contract Verification

## Contract Address
`0x6b5D237da6Ca8EB7D86722d79fc1EE75DB2821cD`

## Network
PulseChain (Chain ID: 369)

## Compiler Settings
- **Compiler Version:** v0.7.6+commit.7338295f
- **EVM Version:** Istanbul
- **Optimization Enabled:** Yes
- **Optimization Runs:** 200

## Constructor Arguments (ABI Encoded)
```
0x0000000000000000000000009be83826afdf22a88027f8e5b79f428178bd96350000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000400000000000000000000000065d1d748b4d513756ca179049227f6599d80359400000000000000000000000021349f435c703f933ebf2bb2a5ab2d716e00b2050000000000000000000000002443cceef2d2803a97a12f5a9aa7db3bec154b73000000000000000000000000282476b716146eaabcfbdd339e527903defd969b
```

## Constructor Arguments (Decoded)
1. **Fee Recipient:** `0x9Be83826AFDf22a88027f8e5b79f428178bd9635`
2. **Supported Pools Array:**
   - `0x65d1D748b4d513756cA179049227F6599D803594` (1M PLS)
   - `0x21349F435c703F933eBF2bb2A5aB2d716e00b205` (10M PLS)
   - `0x2443ccEef2D2803A97A12f5A9AA7db3BEc154B73` (100M PLS)
   - `0x282476B716146eAAbCfBDd339e527903deFD969b` (1B PLS)

## Source Code (TornadoRouter.sol)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

interface ITornado {
    function deposit(bytes32 _commitment) external payable;
    function denomination() external view returns (uint256);
}

/**
 * @title TornadoRouter
 * @dev Router contract to handle Tornado Cash deposits with a 0.5% service fee
 * @notice This contract allows users to make deposits with fees in a single transaction
 */
contract TornadoRouter {
    uint256 public constant FEE_PERCENT = 5; // 0.5% = 5/1000
    address payable public immutable feeRecipient;
    
    // Mapping of supported Tornado pool addresses
    mapping(address => bool) public supportedPools;
    
    // Events
    event DepositWithFee(
        address indexed tornado,
        address indexed depositor,
        bytes32 commitment,
        uint256 depositAmount,
        uint256 feeAmount
    );
    
    event PoolAdded(address indexed pool);
    event PoolRemoved(address indexed pool);
    
    modifier onlySupportedPool(address _tornado) {
        require(supportedPools[_tornado], "Unsupported tornado pool");
        _;
    }
    
    /**
     * @dev Constructor sets the fee recipient and adds initial supported pools
     * @param _feeRecipient Address to receive the fees
     * @param _pools Array of Tornado pool addresses to support initially
     */
    constructor(address payable _feeRecipient, address[] memory _pools) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        
        // Add initial supported pools
        for (uint i = 0; i < _pools.length; i++) {
            if (_pools[i] != address(0)) {
                supportedPools[_pools[i]] = true;
                emit PoolAdded(_pools[i]);
            }
        }
    }
    
    /**
     * @dev Deposit to Tornado Cash with fee in a single transaction
     * @param _tornado Address of the Tornado pool contract
     * @param _commitment The deposit commitment
     */
    function depositWithFee(address _tornado, bytes32 _commitment) 
        external 
        payable 
        onlySupportedPool(_tornado) 
    {
        // Get the required denomination from the tornado contract
        uint256 denomination = ITornado(_tornado).denomination();
        
        // Calculate fee (0.5% of denomination)
        uint256 feeAmount = (denomination * FEE_PERCENT) / 1000;
        uint256 totalRequired = denomination + feeAmount;
        
        // Verify the correct amount was sent
        require(msg.value == totalRequired, "Incorrect amount sent");
        
        // Send fee to recipient
        (bool feeSuccess, ) = feeRecipient.call{value: feeAmount}("");
        require(feeSuccess, "Fee transfer failed");
        
        // Deposit to Tornado pool
        ITornado(_tornado).deposit{value: denomination}(_commitment);
        
        // Emit event
        emit DepositWithFee(_tornado, msg.sender, _commitment, denomination, feeAmount);
    }
    
    /**
     * @dev Calculate the total amount needed (denomination + fee)
     * @param _tornado Address of the Tornado pool
     * @return total Total amount needed including fee
     * @return depositAmount The denomination amount
     * @return feeAmount The fee amount
     */
    function calculateTotalAmount(address _tornado) 
        external 
        view 
        returns (uint256 total, uint256 depositAmount, uint256 feeAmount) 
    {
        depositAmount = ITornado(_tornado).denomination();
        feeAmount = (depositAmount * FEE_PERCENT) / 1000;
        total = depositAmount + feeAmount;
    }
    
    /**
     * @dev Check if a pool is supported
     * @param _tornado Address of the Tornado pool
     * @return bool Whether the pool is supported
     */
    function isPoolSupported(address _tornado) external view returns (bool) {
        return supportedPools[_tornado];
    }
    
    /**
     * @dev Get fee percentage in basis points (5 = 0.5%)
     */
    function getFeePercent() external pure returns (uint256) {
        return FEE_PERCENT;
    }
    
    /**
     * @dev Fallback function to reject direct ETH transfers
     */
    receive() external payable {
        revert("Direct transfers not accepted");
    }
}
```

## Verification Steps for OtterScan/Sourcify

1. Go to: https://otter.pulsechain.com/address/0x6b5D237da6Ca8EB7D86722d79fc1EE75DB2821cD

2. Click "Contract" tab → "Verify and Publish"

3. Select:
   - Compiler: v0.7.6+commit.7338295f
   - Optimization: Yes
   - Runs: 200

4. Paste the source code above

5. For constructor arguments, use the ABI encoded version provided above

## Key Functions

- **depositWithFee(address _tornado, bytes32 _commitment)** - Main function to deposit with fee
- **calculateTotalAmount(address _tornado)** - Returns total amount needed including fee
- **isPoolSupported(address _tornado)** - Check if a pool is supported
- **getFeePercent()** - Returns 5 (representing 0.5%)

## Fee Structure
- 0.5% fee on all deposits
- Fee recipient: `0x9Be83826AFDf22a88027f8e5b79f428178bd9635`
- Single transaction for both fee and deposit