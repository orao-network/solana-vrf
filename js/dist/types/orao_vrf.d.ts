export type OraoVrf = {
    version: "0.4.0";
    name: "orao_vrf";
    instructions: [
        {
            name: "initNetwork";
            docs: [
                "Performs VRF initialization (for required accounts see [`crate::InitNetwork`]).",
                "",
                "*  fee – request fee (in lamports)",
                "*  config_authority – VRF config update authority",
                "*  fulfillment_authorities – randomness fulfillment authorities",
                "*  token_fee_config – token fee configuration",
                "",
                "Treasury is given via instruction accounts."
            ];
            accounts: [
                {
                    name: "payer";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "networkState";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "treasury";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "systemProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [
                {
                    name: "fee";
                    type: "u64";
                },
                {
                    name: "configAuthority";
                    type: "publicKey";
                },
                {
                    name: "fulfillmentAuthorities";
                    type: {
                        vec: "publicKey";
                    };
                },
                {
                    name: "tokenFeeConfig";
                    type: {
                        option: {
                            defined: "OraoTokenFeeConfig";
                        };
                    };
                }
            ];
        },
        {
            name: "updateNetwork";
            docs: [
                "Performs VRF configuration update (for required accounts see [`crate::UpdateNetwork`]).",
                "",
                "*  fee – request fee (in lamports)",
                "*  config_authority – VRF config update authority",
                "*  fulfillment_authorities – randomness fulfillment authorities",
                "*  token_fee_config – token fee configuration",
                "",
                "Treasury is given via instruction accounts."
            ];
            accounts: [
                {
                    name: "authority";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "networkState";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "treasury";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [
                {
                    name: "fee";
                    type: "u64";
                },
                {
                    name: "configAuthority";
                    type: "publicKey";
                },
                {
                    name: "fulfillmentAuthorities";
                    type: {
                        vec: "publicKey";
                    };
                },
                {
                    name: "tokenFeeConfig";
                    type: {
                        option: {
                            defined: "OraoTokenFeeConfig";
                        };
                    };
                }
            ];
        },
        {
            name: "request";
            docs: [
                "(**deprecated: see [`crate::Request`]**) Performs a randomness request",
                "(for required accounts see [`crate::Request`]).",
                "",
                "*  seed – unique request seed"
            ];
            accounts: [
                {
                    name: "payer";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "networkState";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "treasury";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "request";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "systemProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [
                {
                    name: "seed";
                    type: {
                        array: ["u8", 32];
                    };
                }
            ];
        },
        {
            name: "fulfill";
            docs: [
                "(**deprecated: see [`crate::FulfillV2`]**) Fulfills a randomness request",
                "(for required accounts see [`crate::Fulfill`])."
            ];
            accounts: [
                {
                    name: "payer";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "instructionAcc";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "networkState";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "request";
                    isMut: true;
                    isSigner: false;
                }
            ];
            args: [];
        },
        {
            name: "requestV2";
            docs: [
                "Performs a randomness request (for required accounts see [`crate::RequestV2`]).",
                "",
                "*  seed – unique request seed"
            ];
            accounts: [
                {
                    name: "payer";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "networkState";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "treasury";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "request";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "systemProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [
                {
                    name: "seed";
                    type: {
                        array: ["u8", 32];
                    };
                }
            ];
        },
        {
            name: "fulfillV2";
            docs: [
                "Fulfills a randomness request (for required accounts see [`crate::FulfillV2`])."
            ];
            accounts: [
                {
                    name: "payer";
                    isMut: true;
                    isSigner: true;
                },
                {
                    name: "instructionAcc";
                    isMut: false;
                    isSigner: false;
                },
                {
                    name: "networkState";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "request";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "client";
                    isMut: true;
                    isSigner: false;
                },
                {
                    name: "systemProgram";
                    isMut: false;
                    isSigner: false;
                }
            ];
            args: [];
        }
    ];
    accounts: [
        {
            name: "networkState";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "config";
                        type: {
                            defined: "NetworkConfiguration";
                        };
                    },
                    {
                        name: "numReceived";
                        docs: ["Total number of received requests."];
                        type: "u64";
                    }
                ];
            };
        },
        {
            name: "randomness";
            docs: [
                "This account is now obsolete and exists as a legacy to observe the old requests."
            ];
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "seed";
                        type: {
                            array: ["u8", 32];
                        };
                    },
                    {
                        name: "randomness";
                        type: {
                            array: ["u8", 64];
                        };
                    },
                    {
                        name: "responses";
                        type: {
                            vec: {
                                defined: "RandomnessResponse";
                            };
                        };
                    }
                ];
            };
        },
        {
            name: "randomnessV2";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "request";
                        type: {
                            defined: "Request";
                        };
                    }
                ];
            };
        }
    ];
    types: [
        {
            name: "NetworkConfiguration";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "authority";
                        type: "publicKey";
                    },
                    {
                        name: "treasury";
                        type: "publicKey";
                    },
                    {
                        name: "requestFee";
                        type: "u64";
                    },
                    {
                        name: "fulfillmentAuthorities";
                        type: {
                            vec: "publicKey";
                        };
                    },
                    {
                        name: "tokenFeeConfig";
                        type: {
                            option: {
                                defined: "OraoTokenFeeConfig";
                            };
                        };
                    }
                ];
            };
        },
        {
            name: "OraoTokenFeeConfig";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "mint";
                        docs: ["ORAO token mint address."];
                        type: "publicKey";
                    },
                    {
                        name: "treasury";
                        docs: ["ORAO token treasury account."];
                        type: "publicKey";
                    },
                    {
                        name: "fee";
                        docs: ["Fee in ORAO SPL token smallest units."];
                        type: "u64";
                    }
                ];
            };
        },
        {
            name: "RandomnessResponse";
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "pubkey";
                        type: "publicKey";
                    },
                    {
                        name: "randomness";
                        type: {
                            array: ["u8", 64];
                        };
                    }
                ];
            };
        },
        {
            name: "FulfilledRequest";
            docs: ["Fulfilled request representation."];
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "client";
                        type: "publicKey";
                    },
                    {
                        name: "seed";
                        type: {
                            array: ["u8", 32];
                        };
                    },
                    {
                        name: "randomness";
                        docs: [
                            "Generated randomness.",
                            "",
                            "Please look into the account history logs to observe the individual components."
                        ];
                        type: {
                            array: ["u8", 64];
                        };
                    }
                ];
            };
        },
        {
            name: "PendingRequest";
            docs: ["Pending request representation."];
            type: {
                kind: "struct";
                fields: [
                    {
                        name: "client";
                        type: "publicKey";
                    },
                    {
                        name: "seed";
                        type: {
                            array: ["u8", 32];
                        };
                    },
                    {
                        name: "responses";
                        docs: ["Responses collected so far."];
                        type: {
                            vec: {
                                defined: "RandomnessResponse";
                            };
                        };
                    }
                ];
            };
        },
        {
            name: "Request";
            type: {
                kind: "enum";
                variants: [
                    {
                        name: "Pending";
                        fields: [
                            {
                                defined: "PendingRequest";
                            }
                        ];
                    },
                    {
                        name: "Fulfilled";
                        fields: [
                            {
                                defined: "FulfilledRequest";
                            }
                        ];
                    }
                ];
            };
        }
    ];
    events: [
        {
            name: "Fulfill";
            fields: [
                {
                    name: "seed";
                    type: {
                        array: ["u8", 32];
                    };
                    index: false;
                },
                {
                    name: "randomness";
                    type: {
                        array: ["u8", 64];
                    };
                    index: false;
                }
            ];
        },
        {
            name: "Request";
            fields: [
                {
                    name: "seed";
                    type: {
                        array: ["u8", 32];
                    };
                    index: false;
                },
                {
                    name: "client";
                    type: "publicKey";
                    index: false;
                },
                {
                    name: "paidWithSpl";
                    type: "bool";
                    index: false;
                }
            ];
        },
        {
            name: "Response";
            fields: [
                {
                    name: "seed";
                    type: {
                        array: ["u8", 32];
                    };
                    index: false;
                },
                {
                    name: "authority";
                    type: "publicKey";
                    index: false;
                },
                {
                    name: "randomness";
                    type: {
                        array: ["u8", 64];
                    };
                    index: false;
                }
            ];
        }
    ];
    errors: [
        {
            code: 6000;
            name: "ZeroSeed";
            msg: "Randomness seed cannot be zero";
        },
        {
            code: 6001;
            name: "SeedAlreadyInUse";
            msg: "Another account is using the provided seed, so randomness can be predicted";
        },
        {
            code: 6002;
            name: "InsufficientFunds";
            msg: "The called account doesn't have enough funds to cover the randomness request";
        },
        {
            code: 6003;
            name: "RandomnessVerificationFailed";
            msg: "Failed to verify randomness against the public key";
        },
        {
            code: 6004;
            name: "SerializationError";
            msg: "Serialization error";
        },
        {
            code: 6005;
            name: "UnauthorizedFulfillmentAuthority";
            msg: "Unauthorized fulfillment authority";
        },
        {
            code: 6006;
            name: "InvalidFulfillMessage";
            msg: "Signature does not match the seed";
        },
        {
            code: 6007;
            name: "MissingEd25519SigVerifyInstruction";
            msg: "Missing Ed25519SigVerify instruction";
        },
        {
            code: 6008;
            name: "RandomnessCombinationFailed";
            msg: "Failed to validate combined randomness";
        },
        {
            code: 6009;
            name: "UnknownTreasuryGiven";
            msg: "UnknownTreasuryGiven";
        }
    ];
};
export declare const IDL: OraoVrf;
