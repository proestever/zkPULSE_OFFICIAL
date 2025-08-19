// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

library Pairing {
  uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

  struct G1Point {
    uint256 X;
    uint256 Y;
  }

  // Encoding of field elements is: X[0] * z + X[1]
  struct G2Point {
    uint256[2] X;
    uint256[2] Y;
  }

  /*
   * @return The negation of p, i.e. p.plus(p.negate()) should be zero
   */
  function negate(G1Point memory p) internal pure returns (G1Point memory) {
    // The prime q in the base field F_q for G1
    if (p.X == 0 && p.Y == 0) {
      return G1Point(0, 0);
    } else {
      return G1Point(p.X, PRIME_Q - (p.Y % PRIME_Q));
    }
  }

  /*
   * @return r the sum of two points of G1
   */
  function plus(
    G1Point memory p1,
    G1Point memory p2
  ) internal view returns (G1Point memory r) {
    uint256[4] memory input = [
      p1.X, p1.Y,
      p2.X, p2.Y
    ];
    bool success;

    // solium-disable-next-line security/no-inline-assembly
    assembly {
      success := staticcall(sub(gas(), 2000), 6, input, 0xc0, r, 0x60)
      // Use "invalid" to make gas estimation work
      switch success case 0 { invalid() }
    }

    require(success, "pairing-add-failed");
  }

  /*
   * @return r the product of a point on G1 and a scalar, i.e.
   *         p == p.scalarMul(1) and p.plus(p) == p.scalarMul(2) for all
   *         points p.
   */
  function scalarMul(G1Point memory p, uint256 s) internal view returns (G1Point memory r) {
    uint256[3] memory input = [p.X, p.Y, s];
    bool success;
    // solium-disable-next-line security/no-inline-assembly
    assembly {
      success := staticcall(sub(gas(), 2000), 7, input, 0x80, r, 0x60)
      // Use "invalid" to make gas estimation work
      switch success case 0 { invalid() }
    }
    require(success, "pairing-mul-failed");
  }

  /* @return The result of computing the pairing check
   *         e(p1[0], p2[0]) *  .... * e(p1[n], p2[n]) == 1
   *         For example,
   *         pairing([P1(), P1().negate()], [P2(), P2()]) should return true.
   */
  function pairing(
    G1Point memory a1,
    G2Point memory a2,
    G1Point memory b1,
    G2Point memory b2,
    G1Point memory c1,
    G2Point memory c2,
    G1Point memory d1,
    G2Point memory d2
  ) internal view returns (bool) {
    uint256[24] memory input = [
      a1.X, a1.Y, a2.X[0], a2.X[1], a2.Y[0], a2.Y[1],
      b1.X, b1.Y, b2.X[0], b2.X[1], b2.Y[0], b2.Y[1],
      c1.X, c1.Y, c2.X[0], c2.X[1], c2.Y[0], c2.Y[1],
      d1.X, d1.Y, d2.X[0], d2.X[1], d2.Y[0], d2.Y[1]
    ];
    uint256[1] memory out;
    bool success;

    // solium-disable-next-line security/no-inline-assembly
    assembly {
      success := staticcall(sub(gas(), 2000), 8, input, mul(24, 0x20), out, 0x20)
      // Use "invalid" to make gas estimation work
      switch success case 0 { invalid() }
    }

    require(success, "pairing-opcode-failed");
    return out[0] != 0;
  }
}

contract Verifier {
  using Pairing for *;

  uint256 constant SNARK_SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
  uint256 constant PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

  struct VerifyingKey {
    Pairing.G1Point alfa1;
    Pairing.G2Point beta2;
    Pairing.G2Point gamma2;
    Pairing.G2Point delta2;
    Pairing.G1Point[7] IC;
  }

  struct Proof {
    Pairing.G1Point A;
    Pairing.G2Point B;
    Pairing.G1Point C;
  }

  function verifyingKey() internal pure returns (VerifyingKey memory vk) {
    vk.alfa1 = Pairing.G1Point(uint256(0x035e193de1f88f3c053e7bb9b4880c8ad40de88b973f332c088802a0fa37b2ac), uint256(0x12ee9a2b722f3c57bf6e96e90a8c63c8e1c566a5e13b956e00bb23e893017e18));
    vk.beta2 = Pairing.G2Point([uint256(0x2ecb094e18154c4e95da96de951dc1c08f24c88a8cbf45e1bc32a02695bc5a3b), uint256(0x24a965a866a3f09c9f60dc3bb5c16e22c4ef088ec3a95e7ac3b0bce7f10e1c63)], [uint256(0x0fe66c9a1c0e7bc43c65fae086bb87c6f1c05b13e8f45177f7e64fcbbe09edb5), uint256(0x26e8c7e93e526bb968f44f582dbd1fb28f6ce0e949fdf8db9a8c0c8cf30c4e85)]);
    vk.gamma2 = Pairing.G2Point([uint256(0x2ad95f44f48bb13b96302f63e4b5abf582e968fa65e3c1f6c973a907c17e62f6), uint256(0x0bb27b9ad83f37b02b88fb0b89e982c3c16e7cc65c5cd00b32a8e3ce3f83f0e5)], [uint256(0x0fb1bbde8e0ad95077fbb3e44b7abc3f088d731c2d1f6fa8e41c4a6a3c0c8e36), uint256(0x03e96fe973961ec087e32f609e83b5e899bb090a867cdad1c0b956e87c1e7a31)]);
    vk.delta2 = Pairing.G2Point([uint256(0x0c5e01e92ebd088c92b8581c6becc37e2f66087a659ddb2ab859f7bafb0dfce0), uint256(0x2e592f15fe2e27fcec693e0dd0e93c1c951677e5f8e73c436bbff728c63e2e97)], [uint256(0x273b093a4e091e1e8bc15a14e42b5bb1c951c49b47b19bb9bb87e01c956c8513), uint256(0x04f628c8c1f8a5a9cb977f959b0dd821b9c8c4f54fb017c4e87df6c672f31c8e)]);
    vk.IC[0] = Pairing.G1Point(uint256(0x04e15bc95f6c19fa66709e2c3c7f47fc8c9b32c96e37f93e36ab59c88c86c821), uint256(0x195e24f1b27b988a69e957bc60bb1e816f8e3c017bc1c916e40fc674aa2db11f));
    vk.IC[1] = Pairing.G1Point(uint256(0x0f5dd78e5e039e37b73e44a4e4c8f8d3f5e926e0b4c017e38c97ad04e71e4853), uint256(0x0c87e955e3f659a62d973a0f95f896e1c45f1d98f19ae93b965dd9a0ab4e9f4f));
    vk.IC[2] = Pairing.G1Point(uint256(0x1798e039e1dcbe19e12db4c088e80fa087e1f32c40b1ae0df1b86e67419f5dcb), uint256(0x06f27014dcdc87ee20cf5ff1a0e7fa29a214e0a24f30e7c0b88f456c456ad8ee));
    vk.IC[3] = Pairing.G1Point(uint256(0x14ab973af887c956971d09bc9c3c5aabc079f6bb0eb8b825c88e8bb77e11e2e8), uint256(0x1498f2c70c016f97b19f4c396e616a7dd3f67d94ac2fa32e4c965e2bc37e2d2f));
    vk.IC[4] = Pairing.G1Point(uint256(0x264c4b639f951fb7bb5e079f3c4f8f37e96f965e8e899f9b604f8a1f19e2f9f0), uint256(0x1d4e956e0c17acc1e0e66c03e2bc086c438bb62dd4e079c59afbf95a3c6fb0f7));
    vk.IC[5] = Pairing.G1Point(uint256(0x1f3c1c69fc67c4bef948e890c088fc5ab64f00b982a6c087e00a891e096c4586), uint256(0x2f56f0e4a969e84e8c577bb00947ea8fb37bc88bb3cfbf8f1bb2eb5c37f2a00f));
    vk.IC[6] = Pairing.G1Point(uint256(0x2e6c0b9c3e59de1e7cfda6b58fb2810f4f2e56cbec4dc3ad1b2a73ad49f06a4e), uint256(0x00b96c5b8a86b33e87e0a8e01a97ddce36f64a19c5a7e973c4e037dd93f7c65f));
  }

  /*
   * @returns Whether the proof is valid given the hardcoded verifying key
   *          above and the public inputs
   */
  function verifyProof(
    bytes memory proof,
    uint256[6] memory input
  ) public view returns (bool) {
    uint256[8] memory p = abi.decode(proof, (uint256[8]));

    // Make sure that each element in the proof is less than the prime q
    for (uint8 i = 0; i < p.length; i++) {
      require(p[i] < PRIME_Q, "verifier-proof-element-gte-prime-q");
    }

    Proof memory _proof;
    _proof.A = Pairing.G1Point(p[0], p[1]);
    _proof.B = Pairing.G2Point([p[2], p[3]], [p[4], p[5]]);
    _proof.C = Pairing.G1Point(p[6], p[7]);

    VerifyingKey memory vk = verifyingKey();

    // Compute the linear combination vk_x
    Pairing.G1Point memory vk_x = Pairing.G1Point(0, 0);
    vk_x = Pairing.plus(vk_x, vk.IC[0]);

    // Make sure that every input is less than the snark scalar field
    for (uint256 i = 0; i < input.length; i++) {
      require(input[i] < SNARK_SCALAR_FIELD, "verifier-input-gte-snark-scalar-field");
      vk_x = Pairing.plus(vk_x, Pairing.scalarMul(vk.IC[i + 1], input[i]));
    }

    return Pairing.pairing(
      Pairing.negate(_proof.A),
      _proof.B,
      vk.alfa1,
      vk.beta2,
      vk_x,
      vk.gamma2,
      _proof.C,
      vk.delta2
    );
  }
}