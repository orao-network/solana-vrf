/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/orao_vrf.json`.
 */
export type OraoVrf = {
  "address": "VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y",
  "metadata": {
    "name": "oraoVrf",
    "version": "0.6.1",
    "spec": "0.1.0",
    "description": "ORAO VRF contract"
  },
  "instructions": [
    {
      "name": "fulfill",
      "docs": [
        "(**deprecated: see [`crate::FulfillV2`]**) Fulfills a randomness request",
        "(for required accounts see [`crate::Fulfill`])."
      ],
      "discriminator": [
        143,
        2,
        52,
        206,
        174,
        164,
        247,
        72
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "instructionAcc"
        },
        {
          "name": "networkState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  117,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "request",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "fulfillV2",
      "docs": [
        "Fulfills a randomness request (for required accounts see [`crate::FulfillV2`])."
      ],
      "discriminator": [
        164,
        227,
        237,
        84,
        112,
        111,
        147,
        196
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "instructionAcc"
        },
        {
          "name": "networkState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  117,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "request",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "request"
              }
            ]
          }
        },
        {
          "name": "client",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initNetwork",
      "docs": [
        "Performs VRF initialization (for required accounts see [`crate::InitNetwork`]).",
        "",
        "*  fee – request fee (in lamports)",
        "*  config_authority – VRF config update authority",
        "*  fulfillment_authorities – randomness fulfillment authorities",
        "*  token_fee_config – token fee configuration",
        "",
        "Treasury is given via instruction accounts."
      ],
      "discriminator": [
        104,
        231,
        73,
        121,
        240,
        0,
        5,
        148
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "networkState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  117,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "treasury"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "fee",
          "type": "u64"
        },
        {
          "name": "configAuthority",
          "type": "pubkey"
        },
        {
          "name": "fulfillmentAuthorities",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "tokenFeeConfig",
          "type": {
            "option": {
              "defined": {
                "name": "oraoTokenFeeConfig"
              }
            }
          }
        }
      ]
    },
    {
      "name": "request",
      "docs": [
        "(**deprecated: see [`crate::Request`]**) Performs a randomness request",
        "(for required accounts see [`crate::Request`]).",
        "",
        "*  seed – unique request seed"
      ],
      "discriminator": [
        46,
        101,
        67,
        11,
        76,
        137,
        12,
        173
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "networkState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  117,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "request",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "seed"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "seed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "requestV2",
      "docs": [
        "Performs a randomness request (for required accounts see [`crate::RequestV2`]).",
        "",
        "*  seed – unique request seed"
      ],
      "discriminator": [
        38,
        151,
        209,
        6,
        195,
        102,
        28,
        217
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "networkState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  117,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true
        },
        {
          "name": "request",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  114,
                  97,
                  110,
                  100,
                  111,
                  109,
                  110,
                  101,
                  115,
                  115,
                  45,
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "seed"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "seed",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "updateNetwork",
      "docs": [
        "Performs VRF configuration update (for required accounts see [`crate::UpdateNetwork`]).",
        "",
        "*  fee – request fee (in lamports)",
        "*  config_authority – VRF config update authority",
        "*  fulfillment_authorities – randomness fulfillment authorities",
        "*  token_fee_config – token fee configuration",
        "",
        "Treasury is given via instruction accounts."
      ],
      "discriminator": [
        39,
        115,
        188,
        77,
        162,
        232,
        216,
        161
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "networkState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  111,
                  45,
                  118,
                  114,
                  102,
                  45,
                  110,
                  101,
                  116,
                  119,
                  111,
                  114,
                  107,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  117,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "treasury"
        }
      ],
      "args": [
        {
          "name": "fee",
          "type": "u64"
        },
        {
          "name": "configAuthority",
          "type": "pubkey"
        },
        {
          "name": "fulfillmentAuthorities",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "tokenFeeConfig",
          "type": {
            "option": {
              "defined": {
                "name": "oraoTokenFeeConfig"
              }
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "networkState",
      "discriminator": [
        212,
        237,
        148,
        56,
        97,
        245,
        51,
        169
      ]
    },
    {
      "name": "randomness",
      "discriminator": [
        188,
        96,
        216,
        248,
        93,
        94,
        49,
        112
      ]
    },
    {
      "name": "randomnessV2",
      "discriminator": [
        139,
        239,
        184,
        215,
        227,
        86,
        191,
        226
      ]
    }
  ],
  "events": [
    {
      "name": "fulfill",
      "discriminator": [
        131,
        245,
        200,
        252,
        0,
        46,
        144,
        45
      ]
    },
    {
      "name": "request",
      "discriminator": [
        55,
        144,
        56,
        60,
        240,
        98,
        131,
        61
      ]
    },
    {
      "name": "response",
      "discriminator": [
        44,
        10,
        78,
        252,
        168,
        82,
        206,
        223
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "zeroSeed",
      "msg": "Randomness seed cannot be zero"
    },
    {
      "code": 6001,
      "name": "seedAlreadyInUse",
      "msg": "Another account is using the provided seed, so randomness can be predicted"
    },
    {
      "code": 6002,
      "name": "insufficientFunds",
      "msg": "The called account doesn't have enough funds to cover the randomness request"
    },
    {
      "code": 6003,
      "name": "randomnessVerificationFailed",
      "msg": "Failed to verify randomness against the public key"
    },
    {
      "code": 6004,
      "name": "serializationError",
      "msg": "Serialization error"
    },
    {
      "code": 6005,
      "name": "unauthorizedFulfillmentAuthority",
      "msg": "Unauthorized fulfillment authority"
    },
    {
      "code": 6006,
      "name": "invalidFulfillMessage",
      "msg": "Signature does not match the seed"
    },
    {
      "code": 6007,
      "name": "missingEd25519SigVerifyInstruction",
      "msg": "Missing Ed25519SigVerify instruction"
    },
    {
      "code": 6008,
      "name": "randomnessCombinationFailed",
      "msg": "Failed to validate combined randomness"
    },
    {
      "code": 6009,
      "name": "unknownTreasuryGiven",
      "msg": "unknownTreasuryGiven"
    }
  ],
  "types": [
    {
      "name": "fulfill",
      "docs": [
        "Event that signals a fulfilled randomness request."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "docs": [
              "Randomness request seed."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "randomness",
            "docs": [
              "Generated randomness."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "fulfilledRequest",
      "docs": [
        "Fulfilled request representation."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "seed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "randomness",
            "docs": [
              "Generated randomness.",
              "",
              "Please look into the account history logs to observe the individual components."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "networkConfiguration",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "requestFee",
            "type": "u64"
          },
          {
            "name": "fulfillmentAuthorities",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "tokenFeeConfig",
            "type": {
              "option": {
                "defined": {
                  "name": "oraoTokenFeeConfig"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "networkState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "config",
            "type": {
              "defined": {
                "name": "networkConfiguration"
              }
            }
          },
          {
            "name": "numReceived",
            "docs": [
              "Total number of received requests."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "oraoTokenFeeConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "docs": [
              "ORAO token mint address."
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "ORAO token treasury account."
            ],
            "type": "pubkey"
          },
          {
            "name": "fee",
            "docs": [
              "Fee in ORAO SPL token smallest units."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "pendingRequest",
      "docs": [
        "Pending request representation."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "seed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "responses",
            "docs": [
              "Responses collected so far."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "randomnessResponse"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "randomness",
      "docs": [
        "This account is now obsolete and exists as a legacy to observe the old requests."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "randomness",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "responses",
            "type": {
              "vec": {
                "defined": {
                  "name": "randomnessResponse"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "randomnessResponse",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "randomness",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    },
    {
      "name": "randomnessV2",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "request",
            "type": {
              "defined": {
                "name": "requestAccount"
              }
            }
          }
        ]
      }
    },
    {
      "name": "request",
      "docs": [
        "Event that signals a new randomness request."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "docs": [
              "Randomness request seed."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "client",
            "docs": [
              "Client address."
            ],
            "type": "pubkey"
          },
          {
            "name": "paidWithSpl",
            "docs": [
              "True if request is paid with SPL token."
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "requestAccount",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending",
            "fields": [
              {
                "defined": {
                  "name": "pendingRequest"
                }
              }
            ]
          },
          {
            "name": "fulfilled",
            "fields": [
              {
                "defined": {
                  "name": "fulfilledRequest"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "response",
      "docs": [
        "Event that signals that a request was fulfilled by a single authority."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "docs": [
              "Randomness request seed."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "authority",
            "docs": [
              "An authority that fulfilled the request."
            ],
            "type": "pubkey"
          },
          {
            "name": "randomness",
            "docs": [
              "An authority's randomness (for the final generated randomness see [`Fulfilled::randomness`])."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ]
};
