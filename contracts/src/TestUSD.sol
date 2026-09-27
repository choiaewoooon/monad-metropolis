// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @notice Demo dollar for Monad testnet, where no canonical stablecoin is deployed.
/// On mainnet Kirogi points at AUSD or USDC instead; nothing in Kirogi depends on this contract.
contract TestUSD is ERC20, ERC20Permit {
    uint256 public constant FAUCET_LIMIT = 10_000e6;

    constructor() ERC20("Kirogi Test Dollar", "kUSD") ERC20Permit("Kirogi Test Dollar") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Anyone can mint up to FAUCET_LIMIT per call. Testnet only.
    function faucet(address to, uint256 amount) external {
        require(amount <= FAUCET_LIMIT, "TestUSD: over faucet limit");
        _mint(to, amount);
    }
}
