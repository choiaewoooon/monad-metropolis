// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {Kirogi} from "../src/Kirogi.sol";
import {TestUSD} from "../src/TestUSD.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys Kirogi and registers the demo merchants.
/// On testnet (no canonical stablecoin) it also deploys TestUSD. On mainnet pass DOLLAR=<AUSD address>.
///   forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --private-key $DEPLOYER_KEY
contract Deploy is Script {
    function run() external {
        address owner = msg.sender;
        address dollarAddr = vm.envOr("DOLLAR", address(0));

        // Demo merchants: fixed addresses derived from labels so the app and the script agree.
        address market = vm.addr(uint256(keccak256("kirogi.demo.merchant.westwood-market")));
        address arcade = vm.addr(uint256(keccak256("kirogi.demo.merchant.neon-arcade")));
        address pharmacy = vm.addr(uint256(keccak256("kirogi.demo.merchant.corner-pharmacy")));

        vm.startBroadcast();
        if (dollarAddr == address(0)) {
            dollarAddr = address(new TestUSD());
        }
        Kirogi kirogi = new Kirogi(IERC20(dollarAddr), owner);
        kirogi.setMerchant(market, "GROCERIES", true, "Westwood Market");
        kirogi.setMerchant(pharmacy, "PHARMACY", true, "Corner Pharmacy");
        kirogi.setMerchant(arcade, "ENTERTAINMENT", true, "Neon Arcade");
        vm.stopBroadcast();

        console2.log("DOLLAR", dollarAddr);
        console2.log("KIROGI", address(kirogi));
        console2.log("MARKET", market);
        console2.log("PHARMACY", pharmacy);
        console2.log("ARCADE", arcade);
    }
}
