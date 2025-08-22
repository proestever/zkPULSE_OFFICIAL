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