// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

interface IVerifier {
  function verifyProof(bytes memory _proof, uint256[6] memory _input) external returns (bool);
}