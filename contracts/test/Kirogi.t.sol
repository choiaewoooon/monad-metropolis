// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Kirogi} from "../src/Kirogi.sol";
import {TestUSD} from "../src/TestUSD.sol";

contract KirogiTest is Test {
    Kirogi kirogi;
    TestUSD usd;

    uint256 dadKey = 0xD4D;
    uint256 jiwooKey = 0x71;
    address dad;
    address jiwoo;
    address market = makeAddr("Westwood Market");
    address arcade = makeAddr("Neon Arcade");
    address school = makeAddr("Westwood Academy");
    address landlord = makeAddr("Landlord");
    address relayer = makeAddr("relayer");

    bytes32 constant GROCERIES = "GROCERIES";
    bytes32 constant TUITION = "TUITION";
    bytes32 constant RENT = "RENT";
    bytes32 constant ENTERTAINMENT = "ENTERTAINMENT";

    function setUp() public {
        dad = vm.addr(dadKey);
        jiwoo = vm.addr(jiwooKey);
        usd = new TestUSD();
        kirogi = new Kirogi(usd, address(this));
        kirogi.setMerchant(market, GROCERIES, true, "Westwood Market");
        kirogi.setMerchant(arcade, ENTERTAINMENT, true, "Neon Arcade");
        usd.faucet(dad, 2_000e6);
        vm.prank(dad);
        usd.approve(address(kirogi), type(uint256).max);
    }

    function _parts() internal view returns (Kirogi.Part[] memory parts) {
        parts = new Kirogi.Part[](3);
        address[] memory onlySchool = new address[](1);
        onlySchool[0] = school;
        address[] memory onlyLandlord = new address[](1);
        onlyLandlord[0] = landlord;
        parts[0] = Kirogi.Part(TUITION, 1_200e6, Kirogi.Rule.Payees, onlySchool);
        parts[1] = Kirogi.Part(RENT, 500e6, Kirogi.Rule.Payees, onlyLandlord);
        parts[2] = Kirogi.Part(GROCERIES, 300e6, Kirogi.Rule.Category, new address[](0));
    }

    function _send() internal returns (uint256 first) {
        vm.prank(dad);
        first = kirogi.send(jiwoo, _parts(), 30 days);
    }

    function test_send_splitsIntoPockets() public {
        uint256 first = _send();
        assertEq(first, 0);
        assertEq(usd.balanceOf(address(kirogi)), 2_000e6);
        (uint256[] memory ids, Kirogi.Pocket[] memory list) = kirogi.pocketsOfRecipient(jiwoo);
        assertEq(ids.length, 3);
        assertEq(list[2].purpose, GROCERIES);
        assertEq(list[2].funded, 300e6);
    }

    function test_pay_groceryMerchant() public {
        _send();
        vm.prank(jiwoo);
        kirogi.pay(2, market, 86.4e6);
        assertEq(usd.balanceOf(market), 86.4e6);
        (, Kirogi.Receipt[] memory receipts) = kirogi.receiptsOfSender(dad);
        assertEq(receipts.length, 1);
        assertEq(receipts[0].merchant, market);
    }

    function test_refuse_merchantOutsidePurpose() public {
        _send();
        vm.prank(jiwoo);
        vm.expectRevert(abi.encodeWithSelector(Kirogi.NotAllowed.selector, 2, arcade, GROCERIES));
        kirogi.pay(2, arcade, 60e6);
        assertEq(usd.balanceOf(arcade), 0);
    }

    function test_refuse_tuitionPocketAtMarket() public {
        _send();
        vm.prank(jiwoo);
        vm.expectRevert(abi.encodeWithSelector(Kirogi.NotAllowed.selector, 0, market, TUITION));
        kirogi.pay(0, market, 10e6);
    }

    function test_pay_namedPayees() public {
        _send();
        vm.startPrank(jiwoo);
        kirogi.pay(0, school, 1_200e6);
        kirogi.pay(1, landlord, 500e6);
        vm.stopPrank();
        assertEq(usd.balanceOf(school), 1_200e6);
        assertEq(usd.balanceOf(landlord), 500e6);
    }

    function test_refuse_overspend() public {
        _send();
        vm.prank(jiwoo);
        vm.expectRevert(abi.encodeWithSelector(Kirogi.InsufficientPocket.selector, 300e6, 301e6));
        kirogi.pay(2, market, 301e6);
    }

    function test_onlyRecipientCanPay() public {
        _send();
        vm.prank(dad);
        vm.expectRevert(Kirogi.NotRecipient.selector);
        kirogi.pay(2, market, 1e6);
    }

    function test_askThenAllow() public {
        _send();
        vm.prank(jiwoo);
        kirogi.requestAllow(2, arcade);
        vm.prank(jiwoo);
        vm.expectRevert(Kirogi.NotSender.selector);
        kirogi.allowPayee(2, arcade);
        vm.prank(dad);
        kirogi.allowPayee(2, arcade);
        vm.prank(jiwoo);
        kirogi.pay(2, arcade, 60e6);
        assertEq(usd.balanceOf(arcade), 60e6);
    }

    function test_reclaimAfterExpiry() public {
        _send();
        vm.prank(jiwoo);
        kirogi.pay(2, market, 100e6);
        vm.prank(dad);
        vm.expectRevert(Kirogi.NotExpiredYet.selector);
        kirogi.reclaim(2);
        vm.warp(block.timestamp + 30 days + 1);
        vm.prank(jiwoo);
        vm.expectRevert(Kirogi.PocketExpired.selector);
        kirogi.pay(2, market, 1e6);
        uint256 before = usd.balanceOf(dad);
        vm.prank(dad);
        assertEq(kirogi.reclaim(2), 200e6);
        assertEq(usd.balanceOf(dad) - before, 200e6);
    }

    function test_findPocket_picksByMerchant() public {
        _send();
        assertEq(kirogi.findPocket(jiwoo, market, 50e6), 2);
        assertEq(kirogi.findPocket(jiwoo, school, 50e6), 0);
        assertEq(kirogi.findPocket(jiwoo, arcade, 50e6), type(uint256).max);
    }

    function _signPay(uint256 key, address recipient, uint256 pocketId, address merchant, uint256 amount, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(
            abi.encode(kirogi.PAY_TYPEHASH(), recipient, pocketId, merchant, amount, kirogi.nonces(recipient), deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", kirogi.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_payWithSig_relayerSubmits() public {
        _send();
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signPay(jiwooKey, jiwoo, 2, market, 86.4e6, deadline);
        vm.prank(relayer);
        kirogi.payWithSig(jiwoo, 2, market, 86.4e6, deadline, sig);
        assertEq(usd.balanceOf(market), 86.4e6);
        // replay is rejected: the nonce moved
        vm.prank(relayer);
        vm.expectRevert(Kirogi.BadSignature.selector);
        kirogi.payWithSig(jiwoo, 2, market, 86.4e6, deadline, sig);
    }

    function test_payWithSig_wrongSignerRejected() public {
        _send();
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signPay(dadKey, jiwoo, 2, market, 1e6, deadline);
        vm.expectRevert(Kirogi.BadSignature.selector);
        kirogi.payWithSig(jiwoo, 2, market, 1e6, deadline, sig);
    }

    function test_sendWithSig_andPermit() public {
        address mom = makeAddr("mom");
        uint256 newDadKey = 0xBEEF;
        address newDad = vm.addr(newDadKey);
        usd.faucet(newDad, 2_000e6);
        uint256 deadline = block.timestamp + 1 hours;

        // permit instead of an approve transaction
        bytes32 permitHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                newDad,
                address(kirogi),
                2_000e6,
                usd.nonces(newDad),
                deadline
            )
        );
        (uint8 pv, bytes32 pr, bytes32 ps) =
            vm.sign(newDadKey, keccak256(abi.encodePacked("\x19\x01", usd.DOMAIN_SEPARATOR(), permitHash)));

        Kirogi.Part[] memory parts = _parts();
        bytes32 structHash = keccak256(
            abi.encode(
                kirogi.SEND_TYPEHASH(),
                newDad,
                mom,
                keccak256(abi.encode(parts)),
                uint64(30 days),
                kirogi.nonces(newDad),
                deadline
            )
        );
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(newDadKey, keccak256(abi.encodePacked("\x19\x01", kirogi.domainSeparator(), structHash)));

        vm.prank(relayer);
        kirogi.sendWithSig(
            newDad, mom, parts, 30 days, deadline, abi.encodePacked(r, s, v), Kirogi.PermitData(2_000e6, deadline, pv, pr, ps)
        );
        assertEq(usd.balanceOf(address(kirogi)), 2_000e6);
        (uint256[] memory ids,) = kirogi.pocketsOfRecipient(mom);
        assertEq(ids.length, 3);
    }

    function test_allowPayeeWithSig_thenPay() public {
        _send();
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash =
            keccak256(abi.encode(kirogi.ALLOW_TYPEHASH(), dad, uint256(2), arcade, kirogi.nonces(dad), deadline));
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(dadKey, keccak256(abi.encodePacked("\x19\x01", kirogi.domainSeparator(), structHash)));
        vm.prank(relayer);
        kirogi.allowPayeeWithSig(dad, 2, arcade, deadline, abi.encodePacked(r, s, v));
        vm.prank(jiwoo);
        kirogi.pay(2, arcade, 60e6);
        assertEq(usd.balanceOf(arcade), 60e6);
    }
}
