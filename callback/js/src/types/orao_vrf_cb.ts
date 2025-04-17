/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/orao_vrf_cb.json`.
 */
export type OraoVrfCb = {
  "address": "VRFCBePmGTpZ234BhbzNNzmyg39Rgdd6VgdfhHwKypU",
  "metadata": {
    "name": "oraoVrfCb",
    "version": "0.3.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "configure",
      "discriminator": [
        245,
        7,
        108,
        117,
        95,
        196,
        54,
        217
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "This must be the current configuration authority."
          ],
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
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
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
          "name": "params",
          "type": {
            "defined": {
              "name": "configureParams"
            }
          }
        }
      ]
    },
    {
      "name": "fulfill",
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
          "name": "program"
        },
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "client",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  108,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "program"
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "request",
          "writable": true
        },
        {
          "name": "networkState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "instructionAcc",
          "docs": [
            "Instructions sysvar account.",
            ""
          ]
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "fulfillParams"
            }
          }
        }
      ]
    },
    {
      "name": "fulfillAlt",
      "discriminator": [
        252,
        32,
        164,
        64,
        170,
        220,
        68,
        136
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "program"
        },
        {
          "name": "state",
          "writable": true
        },
        {
          "name": "client",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  108,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "program"
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "request",
          "writable": true
        },
        {
          "name": "networkState",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "instructionAcc",
          "docs": [
            "Instructions sysvar account.",
            ""
          ]
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "fulfillAltParams"
            }
          }
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "This account will be the configuration authority and the treasury address."
          ],
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
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
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
          "name": "params",
          "type": {
            "defined": {
              "name": "initializeParams"
            }
          }
        }
      ]
    },
    {
      "name": "register",
      "discriminator": [
        211,
        124,
        67,
        15,
        211,
        194,
        178,
        240
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "This must be the upgrade authority of the client program being registered."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "program",
          "docs": [
            "The client program being registered.",
            "",
            "program but the one owned by the payer."
          ]
        },
        {
          "name": "programData",
          "docs": [
            "The program data account of the program being registered."
          ]
        },
        {
          "name": "state",
          "docs": [
            "Opaque program's side client state (a PDA). This is the request authority.",
            ""
          ]
        },
        {
          "name": "client",
          "docs": [
            "Client PDA being created."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  108,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "program"
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "networkState",
          "docs": [
            "A PDA holding the oracle state and configuration."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
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
          "name": "params",
          "type": {
            "defined": {
              "name": "registerParams"
            }
          }
        }
      ]
    },
    {
      "name": "request",
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
          "docs": [
            "Whoever sent the transaction to the network.",
            "",
            "This account will only pay tx fess and will not pay rent nor request fee."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "docs": [
            "Client request authority PDA (see [`Client::state`]).",
            "",
            "This account signs the CPI call."
          ],
          "signer": true
        },
        {
          "name": "client",
          "docs": [
            "A client PDA.",
            "",
            "It will pay request rent and fee."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  108,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "client.program",
                "account": "client"
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "networkState",
          "docs": [
            "A PDA holding the oracle state and configuration."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "A treasury address matching the current `network_state`.",
            ""
          ],
          "writable": true
        },
        {
          "name": "request",
          "docs": [
            "Request PDA being created.",
            ""
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "requestParams"
            }
          }
        }
      ]
    },
    {
      "name": "requestAlt",
      "discriminator": [
        193,
        213,
        137,
        32,
        88,
        106,
        157,
        1
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Whoever sent the transaction to the network.",
            "",
            "This account will only pay tx fees and will not pay rent nor request fee."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "state",
          "docs": [
            "Client request authority PDA (see [`Client::state`]).",
            "",
            "This account signs the CPI call."
          ],
          "signer": true
        },
        {
          "name": "client",
          "docs": [
            "A client PDA.",
            "",
            "It will pay request rent and fee."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  108,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "client.program",
                "account": "client"
              },
              {
                "kind": "account",
                "path": "state"
              }
            ]
          }
        },
        {
          "name": "networkState",
          "docs": [
            "A PDA holding the oracle state and configuration."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "docs": [
            "A treasury address matching the current `network_state`.",
            ""
          ],
          "writable": true
        },
        {
          "name": "request",
          "docs": [
            "Request PDA being created.",
            ""
          ],
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "requestAltParams"
            }
          }
        }
      ]
    },
    {
      "name": "setCallback",
      "discriminator": [
        173,
        40,
        156,
        83,
        183,
        154,
        99,
        60
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "This must be the client owner."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "client",
          "docs": [
            "A client PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  108,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "client.program",
                "account": "client"
              },
              {
                "kind": "account",
                "path": "client.state",
                "account": "client"
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
          "name": "params",
          "type": {
            "defined": {
              "name": "setCallbackParams"
            }
          }
        }
      ]
    },
    {
      "name": "transfer",
      "discriminator": [
        163,
        52,
        200,
        231,
        140,
        3,
        69,
        186
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "This must be the client owner."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "client",
          "docs": [
            "A client PDA."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  108,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "client.program",
                "account": "client"
              },
              {
                "kind": "account",
                "path": "client.state",
                "account": "client"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "transferParams"
            }
          }
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "This must be the client owner.",
            "",
            "The withdrawn amount will go to the payer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "client",
          "docs": [
            "A client PDA to withdraw from."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  79,
                  114,
                  97,
                  111,
                  86,
                  114,
                  102,
                  67,
                  98,
                  67,
                  108,
                  105,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "client.program",
                "account": "client"
              },
              {
                "kind": "account",
                "path": "client.state",
                "account": "client"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "withdrawParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "client",
      "discriminator": [
        221,
        237,
        145,
        143,
        170,
        194,
        133,
        115
      ]
    },
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
      "name": "requestAccount",
      "discriminator": [
        108,
        23,
        6,
        158,
        184,
        6,
        152,
        121
      ]
    },
    {
      "name": "requestAltAccount",
      "discriminator": [
        22,
        215,
        127,
        203,
        71,
        221,
        36,
        48
      ]
    }
  ],
  "events": [
    {
      "name": "callbackUpdated",
      "discriminator": [
        73,
        115,
        171,
        177,
        42,
        193,
        178,
        202
      ]
    },
    {
      "name": "calledBack",
      "discriminator": [
        80,
        119,
        132,
        128,
        66,
        146,
        64,
        21
      ]
    },
    {
      "name": "registered",
      "discriminator": [
        11,
        222,
        10,
        72,
        160,
        110,
        165,
        227
      ]
    },
    {
      "name": "requested",
      "discriminator": [
        193,
        152,
        94,
        182,
        138,
        135,
        173,
        205
      ]
    },
    {
      "name": "requestedAlt",
      "discriminator": [
        35,
        45,
        235,
        194,
        198,
        184,
        209,
        54
      ]
    },
    {
      "name": "responded",
      "discriminator": [
        126,
        30,
        4,
        36,
        65,
        90,
        60,
        218
      ]
    },
    {
      "name": "transferred",
      "discriminator": [
        21,
        132,
        239,
        64,
        146,
        239,
        166,
        68
      ]
    },
    {
      "name": "withdrawn",
      "discriminator": [
        20,
        89,
        223,
        198,
        194,
        124,
        219,
        13
      ]
    },
    {
      "name": "orao_vrf_cb::events::fulfilled::Fulfilled",
      "discriminator": [
        210,
        174,
        131,
        213,
        40,
        182,
        83,
        110
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notAuthorized",
      "msg": "Not authorized"
    },
    {
      "code": 6001,
      "name": "unexpectedClientProgram",
      "msg": "Unexpected client program"
    },
    {
      "code": 6002,
      "name": "unexpectedClientProgramData",
      "msg": "Unexpected client program data"
    },
    {
      "code": 6003,
      "name": "unexpectedClientState",
      "msg": "Unexpected client state"
    },
    {
      "code": 6004,
      "name": "tooManyAccounts",
      "msg": "Too many accounts given"
    },
    {
      "code": 6005,
      "name": "wrongOwner",
      "msg": "Unable to validate account ownership"
    },
    {
      "code": 6006,
      "name": "wrongTreasury",
      "msg": "Wrong treasury given"
    },
    {
      "code": 6007,
      "name": "malformedFulfillMessage",
      "msg": "Malformed fulfill message"
    },
    {
      "code": 6008,
      "name": "invalidFulfillMessage",
      "msg": "Signature does not match the seed"
    },
    {
      "code": 6009,
      "name": "fulfilled",
      "msg": "fulfilled"
    },
    {
      "code": 6010,
      "name": "malformedFulfill",
      "msg": "Malformed Fulfill instruction"
    },
    {
      "code": 6011,
      "name": "callbackAccountsHashMismatch",
      "msg": "Callback accounts hash mismatch"
    },
    {
      "code": 6012,
      "name": "lookupIndexOutOfBounds",
      "msg": "Lookup index out of bounds"
    },
    {
      "code": 6013,
      "name": "missingLookupTables",
      "msg": "Missing lookup tables"
    }
  ],
  "types": [
    {
      "name": "callback",
      "docs": [
        "A client callback.",
        "",
        "There are function added for convenience:",
        "",
        "-   [`Callback::from_instruction_data`]",
        "-   [`Callback::with_remaining_account`]",
        "-   [`Callback::with_remaining_accounts`]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "remainingAccounts",
            "docs": [
              "Additional accounts to add to the callback CPI call.",
              "",
              "-   the first one will always be the [`Client`] PDA (signer)",
              "-   the second one will always be the client state PDA of the client program (writable)",
              "-   the third one will always be the [`super::network_state::NetworkState`] PDA",
              "-   the fourth one will always be the corresponding [`super::request::RequestAccount`] PDA",
              "-   subsequent accounts will be remaining accounts given here."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "remainingAccount"
                }
              }
            }
          },
          {
            "name": "data",
            "docs": [
              "Borsh-serialized instruction data."
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "callbackAlt",
      "docs": [
        "A client callback with [Address Lookup Tables][lookup-tables] support.",
        "",
        "This callback type could be handy if callback accounts does not fit into",
        "the Solana transaction.",
        "",
        "There are functions added for convenience:",
        "",
        "-   [`CallbackAlt::from_instruction_data`]",
        "-   [`CallbackAlt::compile_accounts`]",
        "",
        "[lookup-tables]: https://solana.com/ru/developers/guides/advanced/lookup-tables"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountsHash",
            "docs": [
              "This hash is used to validate lookup accounts.",
              "",
              "Asserts the order and values of public keys in the [`CallbackAlt::remaining_accounts`]."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "remainingAccounts",
            "docs": [
              "Additional accounts to add to the callback CPI call.",
              "",
              "-   the first one will always be the [`Client`] PDA (signer)",
              "-   the second one will always be the client state PDA of the client program (writable)",
              "-   the third one will always be the [`super::network_state::NetworkState`] PDA",
              "-   the fourth one will always be the corresponding [`super::request::RequestAccount`] PDA",
              "-   subsequent accounts will be remaining accounts given here —",
              "note that writable remaining accounts must be authorized (see [`RemainingAccount::seeds`])."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "remainingAccountAlt"
                }
              }
            }
          },
          {
            "name": "data",
            "docs": [
              "Borsh-serialized instruction data."
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "callbackUpdated",
      "docs": [
        "Event that signals that a callback was updated."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "defined",
            "docs": [
              "`true` if new callback is `Some(_)`."
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "calledBack",
      "docs": [
        "Event that signals that a callback was called."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "program",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "client",
      "docs": [
        "This PDA represents a state of a registered client."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "owner",
            "docs": [
              "The owner is able to manage the client:",
              "",
              "-   withdraw client funds",
              "-   transfer ownership"
            ],
            "type": "pubkey"
          },
          {
            "name": "program",
            "docs": [
              "An address of a registered program."
            ],
            "type": "pubkey"
          },
          {
            "name": "state",
            "docs": [
              "An arbitrary PDA that belongs to the client program.",
              "",
              "This is the request authority."
            ],
            "type": "pubkey"
          },
          {
            "name": "numRequests",
            "docs": [
              "Number of requests made by the client."
            ],
            "type": "u64"
          },
          {
            "name": "callback",
            "docs": [
              "An optional client-level callback.",
              "",
              "If it is `None`, then no callback will be called upon request fulfill, but you can",
              "override this using the request-level callback (see [`RequestParams::callback`]).",
              "",
              "You can update this value using the [`SetCallback`] instruction.",
              "",
              "[`RequestParams::callback`]: crate::RequestParams::callback",
              "[`SetCallback`]: crate::SetCallback"
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "validatedCallback"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "configureParams",
      "docs": [
        "[`Configure`] instruction parameters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newConfig",
            "docs": [
              "New configuration."
            ],
            "type": {
              "defined": {
                "name": "networkConfiguration"
              }
            }
          }
        ]
      }
    },
    {
      "name": "fulfillAltParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "fulfillParams",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "initializeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "requestFee",
            "docs": [
              "Per-request fee in lamports."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "lookupAccount",
      "docs": [
        "Points to an account in a lookup table."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tableIndex",
            "docs": [
              "An index of a particular lookup table in the list of lookup tables given",
              "to the [`crate::RequestAlt`] instruction."
            ],
            "type": "u8"
          },
          {
            "name": "addressIndex",
            "docs": [
              "An index of a particular address in the specified lookup table."
            ],
            "type": "u8"
          },
          {
            "name": "seeds",
            "docs": [
              "This seeds are used to set account as writable.",
              "",
              "-   `None` here means a read-only account",
              "-   empty vector here means arbitrary writable account — this requires",
              "the account to be given as writable to the corresponding \"request\"",
              "or \"register\" instruction.",
              "-   empty/non-empty vector here means client program PDA — account",
              "becomes writable if derived address matches"
            ],
            "type": {
              "option": {
                "vec": "bytes"
              }
            }
          }
        ]
      }
    },
    {
      "name": "networkConfiguration",
      "docs": [
        "Oracle configuration"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "An authority."
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "Treasury account address."
            ],
            "type": "pubkey"
          },
          {
            "name": "requestFee",
            "docs": [
              "Per-request fee paid by a client."
            ],
            "type": "u64"
          },
          {
            "name": "callbackDeadline",
            "docs": [
              "Callback deadline measured in slots (1 slot is approximately 400ms).",
              "",
              "If callback keeps failing util this deadline reached, then the request",
              "will be fulfilled without calling the callback.",
              "",
              "Note that well-written callback should never fail, so this should never",
              "apply to your client."
            ],
            "type": "u64"
          },
          {
            "name": "fulfillAuthorities",
            "docs": [
              "This parties are authorized to fulfill requests."
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "networkState",
      "docs": [
        "This PDA holds oracle state and configuration."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "Account bump."
            ],
            "type": "u8"
          },
          {
            "name": "config",
            "docs": [
              "Active configuration."
            ],
            "type": {
              "defined": {
                "name": "networkConfiguration"
              }
            }
          },
          {
            "name": "numRequests",
            "docs": [
              "Total number of received requests."
            ],
            "type": "u64"
          },
          {
            "name": "numRegistered",
            "docs": [
              "Total number of registered clients."
            ],
            "type": "u64"
          },
          {
            "name": "numTerminated",
            "docs": [
              "Total number of terminated clients."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "pending",
      "docs": [
        "Pending randomness request."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "responses",
            "docs": [
              "Responses collected so far."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "response"
                }
              }
            }
          },
          {
            "name": "callback",
            "docs": [
              "Callback (if any)."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "validatedCallback"
                }
              }
            }
          },
          {
            "name": "callbackOverride",
            "docs": [
              "If `true` then [`Pending::callback`] is a request-level callback."
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "pendingAlt",
      "docs": [
        "Pending randomness request."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "responses",
            "docs": [
              "Responses collected so far."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "response"
                }
              }
            }
          },
          {
            "name": "callback",
            "docs": [
              "Callback (if any)."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "validatedCallbackAlt"
                }
              }
            }
          },
          {
            "name": "lookupTables",
            "docs": [
              "Lookup Tables given to the callback."
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "registerParams",
      "docs": [
        "[`Register`] instruction parameters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stateSeeds",
            "docs": [
              "Seeds used to generate the [`Register::state`] PDA.",
              "",
              "Note that the last seed must be the PDA bump (see [`Pubkey::create_program_address`])."
            ],
            "type": {
              "vec": "bytes"
            }
          },
          {
            "name": "callback",
            "docs": [
              "An optional client-level callback (see [`Client::callback`])."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "callback"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "registered",
      "docs": [
        "Event that signals that new client was registered."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "program",
            "type": "pubkey"
          },
          {
            "name": "state",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "remainingAccount",
      "docs": [
        "A callback account definition."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "docs": [
              "Account address."
            ],
            "type": "pubkey"
          },
          {
            "name": "seeds",
            "docs": [
              "This seeds are used to set account as writable.",
              "",
              "-   `None` here means a read-only account",
              "-   empty vector here means arbitrary writable account — this requires",
              "the account to be given as writable to the corresponding \"request\"",
              "or \"register\" instruction.",
              "-   empty/non-empty vector here means client program PDA — account",
              "becomes writable if derived address matches"
            ],
            "type": {
              "option": {
                "vec": "bytes"
              }
            }
          }
        ]
      }
    },
    {
      "name": "remainingAccountAlt",
      "docs": [
        "A callback account definition with Address Lookup Tables support."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "plain",
            "fields": [
              {
                "defined": {
                  "name": "remainingAccount"
                }
              }
            ]
          },
          {
            "name": "lookup",
            "fields": [
              {
                "defined": {
                  "name": "lookupAccount"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "requestAccount",
      "docs": [
        "The account holding a randomness request state."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "PDA bump."
            ],
            "type": "u8"
          },
          {
            "name": "slot",
            "docs": [
              "The slot this request was created at."
            ],
            "type": "u64"
          },
          {
            "name": "client",
            "docs": [
              "The client created the request."
            ],
            "type": "pubkey"
          },
          {
            "name": "seed",
            "docs": [
              "Request seed."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "state",
            "docs": [
              "The state of this randomness request."
            ],
            "type": {
              "defined": {
                "name": "requestState"
              }
            }
          }
        ]
      }
    },
    {
      "name": "requestAltAccount",
      "docs": [
        "The account holding a randomness request state."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "PDA bump."
            ],
            "type": "u8"
          },
          {
            "name": "slot",
            "docs": [
              "The slot this request was created at."
            ],
            "type": "u64"
          },
          {
            "name": "client",
            "docs": [
              "The client created the request."
            ],
            "type": "pubkey"
          },
          {
            "name": "seed",
            "docs": [
              "Request seed."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "state",
            "docs": [
              "The state of this randomness request."
            ],
            "type": {
              "defined": {
                "name": "requestAltState"
              }
            }
          }
        ]
      }
    },
    {
      "name": "requestAltParams",
      "docs": [
        "[`RequestAlt`] instruction parameters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "docs": [
              "A random seed necessary to verify the generated randomness."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "callback",
            "docs": [
              "An optional request-level callback.",
              "",
              "This overrides the client-level callback (see [`Client::callback`])."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "callbackAlt"
                }
              }
            }
          },
          {
            "name": "numLookupTables",
            "docs": [
              "Number of lookup tables expected in the list of remaining accounts",
              "of the [`RequestAlt`] instruction (see the \"Account Order Convention\"",
              "section in the main crate docs)."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "requestAltState",
      "docs": [
        "Randomness request state."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending",
            "fields": [
              {
                "defined": {
                  "name": "pendingAlt"
                }
              }
            ]
          },
          {
            "name": "fulfilled",
            "fields": [
              {
                "defined": {
                  "name": "orao_vrf_cb::state::request::Fulfilled"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "requestParams",
      "docs": [
        "[`Request`] instruction parameters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "seed",
            "docs": [
              "A random seed necessary to verify the generated randomness."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "callback",
            "docs": [
              "An optional request-level callback.",
              "",
              "This overrides the client-level callback (see [`Client::callback`])."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "callback"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "requestState",
      "docs": [
        "Randomness request state."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending",
            "fields": [
              {
                "defined": {
                  "name": "pending"
                }
              }
            ]
          },
          {
            "name": "fulfilled",
            "fields": [
              {
                "defined": {
                  "name": "orao_vrf_cb::state::request::Fulfilled"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "requested",
      "docs": [
        "Event that signals a new request."
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
            "name": "callback",
            "docs": [
              "The callback that would be called."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "validatedCallback"
                }
              }
            }
          },
          {
            "name": "callbackOverride",
            "docs": [
              "True if [`Requested::callback`] is a request-level callback."
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "requestedAlt",
      "docs": [
        "Event that signals a new request."
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
            "name": "callback",
            "docs": [
              "The callback that would be called."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "validatedCallbackAlt"
                }
              }
            }
          },
          {
            "name": "lookupTables",
            "docs": [
              "Lookup Tables given to the callback."
            ],
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "responded",
      "docs": [
        "Event that signals a new response."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
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
      "name": "response",
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
      "name": "setCallbackParams",
      "docs": [
        "[`SetCallback`] instruction parameters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newCallback",
            "docs": [
              "New value for the client callback (see [`Client::callback`])."
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "callback"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "transferParams",
      "docs": [
        "[`Transfer`] instruction parameters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newOwner",
            "docs": [
              "An address of a new client owner.",
              "",
              "Fill with caution."
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "transferred",
      "docs": [
        "Event that signals that a client ownership was transferred."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "newOwner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "validatedCallback",
      "docs": [
        "See [`Callback`]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "remainingAccounts",
            "docs": [
              "See [`Callback::remaining_accounts`]."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "validatedRemainingAccount"
                }
              }
            }
          },
          {
            "name": "data",
            "docs": [
              "See [`Callback::data`]."
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "validatedCallbackAlt",
      "docs": [
        "See [`CallbackAlt`]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accountsHash",
            "docs": [
              "This hash is used to validate the lookup accounts."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "remainingAccounts",
            "docs": [
              "See [`CallbackAlt::remaining_accounts`]."
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "validatedRemainingAccountAlt"
                }
              }
            }
          },
          {
            "name": "data",
            "docs": [
              "See [`CallbackAlt::data`]."
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "validatedLookupAccount",
      "docs": [
        "Validated [`LookupAccount`]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tableIndex",
            "type": "u8"
          },
          {
            "name": "addressIndex",
            "type": "u8"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "validatedRemainingAccount",
      "docs": [
        "Validated [`RemainingAccount`]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "validatedRemainingAccountAlt",
      "docs": [
        "Validated [`RemainingAccountAlt`]"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "plain",
            "fields": [
              {
                "defined": {
                  "name": "validatedRemainingAccount"
                }
              }
            ]
          },
          {
            "name": "lookup",
            "fields": [
              {
                "defined": {
                  "name": "validatedLookupAccount"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "withdrawParams",
      "docs": [
        "[`Withdraw`] instruction parameters."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "docs": [
              "An amount to withdraw (in lamports).",
              "",
              "Note that you can't withdraw past the client PDA rent."
            ],
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "withdrawn",
      "docs": [
        "Event that signals that client funds was withdrawn."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "orao_vrf_cb::events::fulfilled::Fulfilled",
      "docs": [
        "Event that signals a request was fulfilled."
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
      "name": "orao_vrf_cb::state::request::Fulfilled",
      "docs": [
        "Fulfilled request representation."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "randomness",
            "docs": [
              "Generated randomness.",
              "",
              "It is validated within the fulfill instruction. Please look into the account history logs",
              "and VRF events to observe the individual components."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "responses",
            "docs": [
              "Individual responses constituting the randomness.",
              "",
              "This going to be `Some` within the callback invocation, and `None` afterwards."
            ],
            "type": {
              "option": {
                "vec": {
                  "defined": {
                    "name": "response"
                  }
                }
              }
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "cbClientAccountSeed",
      "docs": [
        "Base [`crate::state::client::Client`] PDA seed."
      ],
      "type": "bytes",
      "value": "[79, 114, 97, 111, 86, 114, 102, 67, 98, 67, 108, 105, 101, 110, 116]"
    },
    {
      "name": "cbConfigAccountSeed",
      "docs": [
        "Base [`crate::state::network_state::NetworkState`] PDA seed."
      ],
      "type": "bytes",
      "value": "[79, 114, 97, 111, 86, 114, 102, 67, 98, 67, 111, 110, 102, 105, 103]"
    },
    {
      "name": "cbRequestAccountSeed",
      "docs": [
        "Base [`crate::state::request::RequestAccount`] PDA seed."
      ],
      "type": "bytes",
      "value": "[79, 114, 97, 111, 86, 114, 102, 67, 98, 82, 101, 113, 117, 101, 115, 116]"
    },
    {
      "name": "cbRequestAltAccountSeed",
      "docs": [
        "Base [`crate::state::request_alt::RequestAltAccount`] PDA seed."
      ],
      "type": "bytes",
      "value": "[79, 114, 97, 111, 86, 114, 102, 67, 98, 82, 101, 113, 117, 101, 115, 116, 65, 108, 116]"
    },
    {
      "name": "maxFulfillmentAuthorities",
      "docs": [
        "Maximum number of fulfill authorities supported by the program."
      ],
      "type": "u64",
      "value": "10"
    }
  ]
};
