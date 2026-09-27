// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Kirogi — money sent across a border, spendable only on what it was sent for.
/// @notice A sender splits a transfer into pockets ("Tuition", "Rent", "Groceries"). Each pocket can
/// pay only a merchant registered for that purpose, or payees the sender named. Anything else is
/// refused here, in the contract, not in the app. Unspent money returns to the sender after expiry.
/// Every payment is stored on-chain so the sender's receipt feed never depends on historical logs.
contract Kirogi is EIP712, Ownable {
    using SafeERC20 for IERC20;

    enum Rule {
        Category, // any merchant registered with category == purpose (plus named payees)
        Payees // only the payees the sender named, e.g. one school or one landlord
    }

    struct Merchant {
        bytes32 category;
        bool active;
        string name;
    }

    struct Part {
        bytes32 purpose;
        uint128 amount;
        Rule rule;
        address[] payees;
    }

    struct Pocket {
        address sender;
        address recipient;
        bytes32 purpose;
        Rule rule;
        uint64 expiry;
        uint128 funded;
        uint128 spent;
        bool closed;
    }

    struct Receipt {
        uint256 pocketId;
        address merchant;
        uint128 amount;
        uint64 at;
    }

    struct PermitData {
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    IERC20 public immutable dollar;

    mapping(address => Merchant) public merchants;
    Pocket[] internal _pockets;
    mapping(uint256 => address[]) internal _payees;
    mapping(uint256 => mapping(address => bool)) public isPayee;
    mapping(address => uint256[]) internal _pocketsOfRecipient;
    mapping(address => uint256[]) internal _pocketsOfSender;
    Receipt[] internal _receipts;
    mapping(address => uint256[]) internal _receiptsOfSender;
    mapping(address => uint256[]) internal _receiptsOfRecipient;
    mapping(address => uint256) public nonces;

    bytes32 public constant PAY_TYPEHASH = keccak256(
        "Pay(address recipient,uint256 pocketId,address merchant,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant SEND_TYPEHASH = keccak256(
        "Send(address sender,address recipient,bytes32 partsHash,uint64 lifetime,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant ALLOW_TYPEHASH =
        keccak256("Allow(address sender,uint256 pocketId,address payee,uint256 nonce,uint256 deadline)");

    event MerchantSet(address indexed merchant, bytes32 indexed category, bool active, string name);
    event Sent(address indexed sender, address indexed recipient, uint256 firstPocketId, uint256 count, uint256 total);
    event PocketOpened(uint256 indexed pocketId, bytes32 indexed purpose, Rule rule, uint256 amount, uint64 expiry);
    event Paid(
        uint256 indexed receiptId,
        uint256 indexed pocketId,
        address indexed merchant,
        address sender,
        address recipient,
        uint256 amount
    );
    event AllowRequested(uint256 indexed pocketId, address indexed merchant, address indexed recipient);
    event PayeeAllowed(uint256 indexed pocketId, address indexed payee);
    event Reclaimed(uint256 indexed pocketId, address indexed sender, uint256 amount);

    error EmptyTransfer();
    error UnknownPocket();
    error NotRecipient();
    error NotSender();
    error PocketClosed();
    error PocketExpired();
    error NotExpiredYet();
    error NotAllowed(uint256 pocketId, address merchant, bytes32 purpose);
    error InsufficientPocket(uint256 available, uint256 requested);
    error SignatureExpired();
    error BadSignature();

    constructor(IERC20 dollar_, address owner_) EIP712("Kirogi", "1") Ownable(owner_) {
        dollar = dollar_;
    }

    // ---------------------------------------------------------------- registry

    /// @notice Register or update a merchant. In production this is a vetted (KYB) registry.
    function setMerchant(address merchant, bytes32 category, bool active, string calldata name) external onlyOwner {
        merchants[merchant] = Merchant(category, active, name);
        emit MerchantSet(merchant, category, active, name);
    }

    // ---------------------------------------------------------------- send

    /// @notice Send `parts` to `recipient`. Pulls the total from msg.sender (needs allowance).
    function send(address recipient, Part[] calldata parts, uint64 lifetime) external returns (uint256) {
        return _send(msg.sender, recipient, parts, lifetime);
    }

    /// @notice Gasless send: the sender signs, anyone (the app's relayer) submits.
    /// `permit` is optional (value == 0 skips it) and lets a passkey account fund without an approve tx.
    function sendWithSig(
        address sender,
        address recipient,
        Part[] calldata parts,
        uint64 lifetime,
        uint256 deadline,
        bytes calldata signature,
        PermitData calldata permit
    ) external returns (uint256) {
        if (block.timestamp > deadline) revert SignatureExpired();
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    SEND_TYPEHASH, sender, recipient, keccak256(abi.encode(parts)), lifetime, nonces[sender]++, deadline
                )
            )
        );
        if (ECDSA.recover(digest, signature) != sender) revert BadSignature();
        if (permit.value != 0) {
            // A front-run permit is harmless: the allowance is what matters.
            try IERC20Permit(address(dollar)).permit(
                sender, address(this), permit.value, permit.deadline, permit.v, permit.r, permit.s
            ) {} catch {}
        }
        return _send(sender, recipient, parts, lifetime);
    }

    function _send(address sender, address recipient, Part[] calldata parts, uint64 lifetime)
        internal
        returns (uint256 firstId)
    {
        if (parts.length == 0) revert EmptyTransfer();
        uint64 expiry = uint64(block.timestamp) + lifetime;
        uint256 total;
        firstId = _pockets.length;
        for (uint256 i; i < parts.length; ++i) {
            Part calldata part = parts[i];
            if (part.amount == 0) revert EmptyTransfer();
            uint256 id = _pockets.length;
            _pockets.push(Pocket(sender, recipient, part.purpose, part.rule, expiry, part.amount, 0, false));
            for (uint256 j; j < part.payees.length; ++j) {
                _addPayee(id, part.payees[j]);
            }
            _pocketsOfRecipient[recipient].push(id);
            _pocketsOfSender[sender].push(id);
            total += part.amount;
            emit PocketOpened(id, part.purpose, part.rule, part.amount, expiry);
        }
        dollar.safeTransferFrom(sender, address(this), total);
        emit Sent(sender, recipient, firstId, parts.length, total);
    }

    // ---------------------------------------------------------------- pay

    /// @notice The recipient pays `merchant` from one pocket. Reverts with NotAllowed if the pocket's rule
    /// does not cover this merchant — that revert *is* the product.
    function pay(uint256 pocketId, address merchant, uint256 amount) external returns (uint256) {
        return _pay(msg.sender, pocketId, merchant, amount);
    }

    /// @notice Gasless pay: the recipient signs, the relayer submits.
    function payWithSig(
        address recipient,
        uint256 pocketId,
        address merchant,
        uint256 amount,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256) {
        if (block.timestamp > deadline) revert SignatureExpired();
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(PAY_TYPEHASH, recipient, pocketId, merchant, amount, nonces[recipient]++, deadline))
        );
        if (ECDSA.recover(digest, signature) != recipient) revert BadSignature();
        return _pay(recipient, pocketId, merchant, amount);
    }

    function _pay(address recipient, uint256 pocketId, address merchant, uint256 amount)
        internal
        returns (uint256 receiptId)
    {
        if (pocketId >= _pockets.length) revert UnknownPocket();
        Pocket storage p = _pockets[pocketId];
        if (p.recipient != recipient) revert NotRecipient();
        if (p.closed) revert PocketClosed();
        if (block.timestamp > p.expiry) revert PocketExpired();
        if (!allowed(pocketId, merchant)) revert NotAllowed(pocketId, merchant, p.purpose);
        uint256 available = p.funded - p.spent;
        if (amount == 0 || amount > available) revert InsufficientPocket(available, amount);

        p.spent += uint128(amount);
        receiptId = _receipts.length;
        _receipts.push(Receipt(pocketId, merchant, uint128(amount), uint64(block.timestamp)));
        _receiptsOfSender[p.sender].push(receiptId);
        _receiptsOfRecipient[recipient].push(receiptId);

        dollar.safeTransfer(merchant, amount);
        emit Paid(receiptId, pocketId, merchant, p.sender, recipient, amount);
    }

    /// @notice Whether `pocketId` may pay `merchant`.
    function allowed(uint256 pocketId, address merchant) public view returns (bool) {
        if (isPayee[pocketId][merchant]) return true;
        Pocket storage p = _pockets[pocketId];
        if (p.rule != Rule.Category) return false;
        Merchant storage m = merchants[merchant];
        return m.active && m.category == p.purpose;
    }

    // ---------------------------------------------------------------- permissions & lifecycle

    /// @notice The recipient asks the sender to allow a merchant ("Ask Dad to allow it").
    function requestAllow(uint256 pocketId, address merchant) external {
        if (pocketId >= _pockets.length) revert UnknownPocket();
        if (_pockets[pocketId].recipient != msg.sender) revert NotRecipient();
        emit AllowRequested(pocketId, merchant, msg.sender);
    }

    /// @notice The sender allows one more payee for a pocket.
    function allowPayee(uint256 pocketId, address payee) external {
        if (pocketId >= _pockets.length) revert UnknownPocket();
        if (_pockets[pocketId].sender != msg.sender) revert NotSender();
        _addPayee(pocketId, payee);
    }

    /// @notice Gasless allow: the sender signs, the relayer submits.
    function allowPayeeWithSig(address sender, uint256 pocketId, address payee, uint256 deadline, bytes calldata signature)
        external
    {
        if (block.timestamp > deadline) revert SignatureExpired();
        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(ALLOW_TYPEHASH, sender, pocketId, payee, nonces[sender]++, deadline))
        );
        if (ECDSA.recover(digest, signature) != sender) revert BadSignature();
        if (pocketId >= _pockets.length) revert UnknownPocket();
        if (_pockets[pocketId].sender != sender) revert NotSender();
        _addPayee(pocketId, payee);
    }

    /// @notice After expiry, the sender takes back whatever was not spent.
    function reclaim(uint256 pocketId) external returns (uint256 refund) {
        if (pocketId >= _pockets.length) revert UnknownPocket();
        Pocket storage p = _pockets[pocketId];
        if (p.sender != msg.sender) revert NotSender();
        if (p.closed) revert PocketClosed();
        if (block.timestamp <= p.expiry) revert NotExpiredYet();
        p.closed = true;
        refund = p.funded - p.spent;
        if (refund > 0) dollar.safeTransfer(p.sender, refund);
        emit Reclaimed(pocketId, p.sender, refund);
    }

    function _addPayee(uint256 pocketId, address payee) internal {
        if (isPayee[pocketId][payee]) return;
        isPayee[pocketId][payee] = true;
        _payees[pocketId].push(payee);
        emit PayeeAllowed(pocketId, payee);
    }

    // ---------------------------------------------------------------- views

    function pocketCount() external view returns (uint256) {
        return _pockets.length;
    }

    function pocket(uint256 pocketId) external view returns (Pocket memory, address[] memory payees) {
        return (_pockets[pocketId], _payees[pocketId]);
    }

    function pocketsOfRecipient(address recipient) external view returns (uint256[] memory ids, Pocket[] memory list) {
        return _collectPockets(_pocketsOfRecipient[recipient]);
    }

    function pocketsOfSender(address sender) external view returns (uint256[] memory ids, Pocket[] memory list) {
        return _collectPockets(_pocketsOfSender[sender]);
    }

    function receiptsOfSender(address sender) external view returns (uint256[] memory ids, Receipt[] memory list) {
        return _collectReceipts(_receiptsOfSender[sender]);
    }

    function receiptsOfRecipient(address recipient)
        external
        view
        returns (uint256[] memory ids, Receipt[] memory list)
    {
        return _collectReceipts(_receiptsOfRecipient[recipient]);
    }

    /// @notice The first open pocket of `recipient` that can pay `merchant` at least `amount`,
    /// or type(uint256).max. Lets the app pick the pocket from the shop's QR alone.
    function findPocket(address recipient, address merchant, uint256 amount) external view returns (uint256) {
        uint256[] storage ids = _pocketsOfRecipient[recipient];
        for (uint256 i; i < ids.length; ++i) {
            Pocket storage p = _pockets[ids[i]];
            if (p.closed || block.timestamp > p.expiry) continue;
            if (p.funded - p.spent < amount) continue;
            if (allowed(ids[i], merchant)) return ids[i];
        }
        return type(uint256).max;
    }

    function _collectPockets(uint256[] storage ids) internal view returns (uint256[] memory, Pocket[] memory list) {
        list = new Pocket[](ids.length);
        for (uint256 i; i < ids.length; ++i) {
            list[i] = _pockets[ids[i]];
        }
        return (ids, list);
    }

    function _collectReceipts(uint256[] storage ids)
        internal
        view
        returns (uint256[] memory, Receipt[] memory list)
    {
        list = new Receipt[](ids.length);
        for (uint256 i; i < ids.length; ++i) {
            list[i] = _receipts[ids[i]];
        }
        return (ids, list);
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
