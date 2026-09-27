export const kirogiAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "dollar_",
    "type": "address",
    "internalType": "contract IERC20"
   },
   {
    "name": "owner_",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "ALLOW_TYPEHASH",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "PAY_TYPEHASH",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "SEND_TYPEHASH",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "allowPayee",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "payee",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "allowPayeeWithSig",
  "inputs": [
   {
    "name": "sender",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "pocketId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "payee",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "deadline",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "signature",
    "type": "bytes",
    "internalType": "bytes"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "allowed",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "merchant",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "dollar",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IERC20"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "domainSeparator",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "eip712Domain",
  "inputs": [],
  "outputs": [
   {
    "name": "fields",
    "type": "bytes1",
    "internalType": "bytes1"
   },
   {
    "name": "name",
    "type": "string",
    "internalType": "string"
   },
   {
    "name": "version",
    "type": "string",
    "internalType": "string"
   },
   {
    "name": "chainId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "verifyingContract",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "salt",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "extensions",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "findPocket",
  "inputs": [
   {
    "name": "recipient",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "merchant",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "isPayee",
  "inputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "merchants",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "category",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "active",
    "type": "bool",
    "internalType": "bool"
   },
   {
    "name": "name",
    "type": "string",
    "internalType": "string"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "nonces",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "owner",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pay",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "merchant",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "payWithSig",
  "inputs": [
   {
    "name": "recipient",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "pocketId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "merchant",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "deadline",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "signature",
    "type": "bytes",
    "internalType": "bytes"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "pocket",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct Kirogi.Pocket",
    "components": [
     {
      "name": "sender",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "recipient",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "purpose",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "rule",
      "type": "uint8",
      "internalType": "enum Kirogi.Rule"
     },
     {
      "name": "expiry",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "funded",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "spent",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "closed",
      "type": "bool",
      "internalType": "bool"
     }
    ]
   },
   {
    "name": "payees",
    "type": "address[]",
    "internalType": "address[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pocketCount",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pocketsOfRecipient",
  "inputs": [
   {
    "name": "recipient",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "ids",
    "type": "uint256[]",
    "internalType": "uint256[]"
   },
   {
    "name": "list",
    "type": "tuple[]",
    "internalType": "struct Kirogi.Pocket[]",
    "components": [
     {
      "name": "sender",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "recipient",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "purpose",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "rule",
      "type": "uint8",
      "internalType": "enum Kirogi.Rule"
     },
     {
      "name": "expiry",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "funded",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "spent",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "closed",
      "type": "bool",
      "internalType": "bool"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "pocketsOfSender",
  "inputs": [
   {
    "name": "sender",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "ids",
    "type": "uint256[]",
    "internalType": "uint256[]"
   },
   {
    "name": "list",
    "type": "tuple[]",
    "internalType": "struct Kirogi.Pocket[]",
    "components": [
     {
      "name": "sender",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "recipient",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "purpose",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "rule",
      "type": "uint8",
      "internalType": "enum Kirogi.Rule"
     },
     {
      "name": "expiry",
      "type": "uint64",
      "internalType": "uint64"
     },
     {
      "name": "funded",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "spent",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "closed",
      "type": "bool",
      "internalType": "bool"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "receiptsOfRecipient",
  "inputs": [
   {
    "name": "recipient",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "ids",
    "type": "uint256[]",
    "internalType": "uint256[]"
   },
   {
    "name": "list",
    "type": "tuple[]",
    "internalType": "struct Kirogi.Receipt[]",
    "components": [
     {
      "name": "pocketId",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "merchant",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "amount",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "at",
      "type": "uint64",
      "internalType": "uint64"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "receiptsOfSender",
  "inputs": [
   {
    "name": "sender",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "ids",
    "type": "uint256[]",
    "internalType": "uint256[]"
   },
   {
    "name": "list",
    "type": "tuple[]",
    "internalType": "struct Kirogi.Receipt[]",
    "components": [
     {
      "name": "pocketId",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "merchant",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "amount",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "at",
      "type": "uint64",
      "internalType": "uint64"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "reclaim",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "refund",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "renounceOwnership",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "requestAllow",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "merchant",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "send",
  "inputs": [
   {
    "name": "recipient",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "parts",
    "type": "tuple[]",
    "internalType": "struct Kirogi.Part[]",
    "components": [
     {
      "name": "purpose",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "amount",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "rule",
      "type": "uint8",
      "internalType": "enum Kirogi.Rule"
     },
     {
      "name": "payees",
      "type": "address[]",
      "internalType": "address[]"
     }
    ]
   },
   {
    "name": "lifetime",
    "type": "uint64",
    "internalType": "uint64"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "sendWithSig",
  "inputs": [
   {
    "name": "sender",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "recipient",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "parts",
    "type": "tuple[]",
    "internalType": "struct Kirogi.Part[]",
    "components": [
     {
      "name": "purpose",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "amount",
      "type": "uint128",
      "internalType": "uint128"
     },
     {
      "name": "rule",
      "type": "uint8",
      "internalType": "enum Kirogi.Rule"
     },
     {
      "name": "payees",
      "type": "address[]",
      "internalType": "address[]"
     }
    ]
   },
   {
    "name": "lifetime",
    "type": "uint64",
    "internalType": "uint64"
   },
   {
    "name": "deadline",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "signature",
    "type": "bytes",
    "internalType": "bytes"
   },
   {
    "name": "permit",
    "type": "tuple",
    "internalType": "struct Kirogi.PermitData",
    "components": [
     {
      "name": "value",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "deadline",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "v",
      "type": "uint8",
      "internalType": "uint8"
     },
     {
      "name": "r",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "s",
      "type": "bytes32",
      "internalType": "bytes32"
     }
    ]
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setMerchant",
  "inputs": [
   {
    "name": "merchant",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "category",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "active",
    "type": "bool",
    "internalType": "bool"
   },
   {
    "name": "name",
    "type": "string",
    "internalType": "string"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "transferOwnership",
  "inputs": [
   {
    "name": "newOwner",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "event",
  "name": "AllowRequested",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "merchant",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "recipient",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "EIP712DomainChanged",
  "inputs": [],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "MerchantSet",
  "inputs": [
   {
    "name": "merchant",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "category",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "active",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   },
   {
    "name": "name",
    "type": "string",
    "indexed": false,
    "internalType": "string"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "OwnershipTransferred",
  "inputs": [
   {
    "name": "previousOwner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "newOwner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Paid",
  "inputs": [
   {
    "name": "receiptId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "pocketId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "merchant",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "sender",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "recipient",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "PayeeAllowed",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "payee",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "PocketOpened",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "purpose",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "rule",
    "type": "uint8",
    "indexed": false,
    "internalType": "enum Kirogi.Rule"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "expiry",
    "type": "uint64",
    "indexed": false,
    "internalType": "uint64"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Reclaimed",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "sender",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Sent",
  "inputs": [
   {
    "name": "sender",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "recipient",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "firstPocketId",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "count",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "total",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "BadSignature",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ECDSAInvalidSignature",
  "inputs": []
 },
 {
  "type": "error",
  "name": "ECDSAInvalidSignatureLength",
  "inputs": [
   {
    "name": "length",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "ECDSAInvalidSignatureS",
  "inputs": [
   {
    "name": "s",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ]
 },
 {
  "type": "error",
  "name": "EmptyTransfer",
  "inputs": []
 },
 {
  "type": "error",
  "name": "InsufficientPocket",
  "inputs": [
   {
    "name": "available",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "requested",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "InvalidShortString",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotAllowed",
  "inputs": [
   {
    "name": "pocketId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "merchant",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "purpose",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ]
 },
 {
  "type": "error",
  "name": "NotExpiredYet",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotRecipient",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotSender",
  "inputs": []
 },
 {
  "type": "error",
  "name": "OwnableInvalidOwner",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "OwnableUnauthorizedAccount",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "PocketClosed",
  "inputs": []
 },
 {
  "type": "error",
  "name": "PocketExpired",
  "inputs": []
 },
 {
  "type": "error",
  "name": "SafeERC20FailedOperation",
  "inputs": [
   {
    "name": "token",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "SignatureExpired",
  "inputs": []
 },
 {
  "type": "error",
  "name": "StringTooLong",
  "inputs": [
   {
    "name": "str",
    "type": "string",
    "internalType": "string"
   }
  ]
 },
 {
  "type": "error",
  "name": "UnknownPocket",
  "inputs": []
 }
] as const;
