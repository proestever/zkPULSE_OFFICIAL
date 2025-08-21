// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "./Tornado.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract ERC20Tornado_PCOCK is Tornado {
    IERC20 public immutable token;
    
    constructor(
        IVerifier _verifier,
        IHasher _hasher,
        uint256 _denomination,
        uint32 _merkleTreeHeight,
        IERC20 _token
    ) Tornado(_verifier, _hasher, _denomination, _merkleTreeHeight) {
        token = _token;
    }
    
    function _processDeposit() internal override {
        require(token.transferFrom(msg.sender, address(this), denomination), "Transfer failed");
    }
    
    function _processWithdraw(
        address payable _recipient,
        address payable _relayer,
        uint256 _fee,
        uint256 _refund
    ) internal override {
        require(msg.value == _refund, "Incorrect refund amount received");
        
        require(token.transfer(_recipient, denomination - _fee), "Transfer to recipient failed");
        
        if (_fee > 0) {
            require(token.transfer(_relayer, _fee), "Transfer to relayer failed");
        }
        
        if (_refund > 0) {
            (bool success, ) = _recipient.call{value: _refund}("");
            require(success, "Refund transfer failed");
        }
    }
}