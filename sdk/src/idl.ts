// Auto-generated from target/idl/aegis_project.json
export const PROGRAM_ID = "FsG83myaVACEpxdy96ieCpVUAGgxVT5wq3T6nQxqPm9Y";
export const IDL = {
  "address": "FsG83myaVACEpxdy96ieCpVUAGgxVT5wq3T6nQxqPm9Y",
  "metadata": {
    "name": "aegis_project",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "add_liquidity",
      "discriminator": [
        181,
        157,
        89,
        67,
        143,
        182,
        52,
        72
      ],
      "accounts": [
        {
          "name": "lp",
          "docs": [
            "LP depositing liquidity"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "Market this liquidity is for"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "lp_pool",
          "docs": [
            "LP pool PDA \u2014 created on first deposit"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "lp_mint",
          "docs": [
            "LP token mint \u2014 program is mint authority"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "lp_collateral_account",
          "docs": [
            "LP's USDC account \u2014 source of deposit"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "lp"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "collateral_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "collateral_vault",
          "docs": [
            "Market's USDC vault \u2014 destination of deposit"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "collateral_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "lp_token_account",
          "docs": [
            "LP's token account for LP receipt tokens"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "lp"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "lp_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "collateral_mint",
          "docs": [
            "The collateral mint (USDC)"
          ]
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "usdc_amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "check_price_resolution",
      "discriminator": [
        235,
        236,
        224,
        239,
        23,
        161,
        77,
        31
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "price_feed",
          "docs": [
            "Pyth price feed account \u2014 must match market.price_feed",
            "PriceUpdateV2 is Pyth's on-chain account type"
          ]
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bond_amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "create_market",
      "discriminator": [
        103,
        226,
        97,
        235,
        200,
        188,
        251,
        254
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Market creator \u2014 pays for account rent, becomes authority"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "The Market PDA \u2014 derived from authority + question_hash",
            "This means the same creator cannot open two identical markets"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "question_hash"
              }
            ]
          }
        },
        {
          "name": "collateral_mint",
          "docs": [
            "The USDC mint (or any SPL token used as collateral)",
            "InterfaceAccount supports both Token and Token-2022"
          ]
        },
        {
          "name": "yes_mint",
          "docs": [
            "YES outcome token mint",
            "init_if_needed + seeds makes this a deterministic PDA mint"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  121,
                  101,
                  115,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "no_mint",
          "docs": [
            "NO outcome token mint"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  111,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "collateral_vault",
          "docs": [
            "USDC vault \u2014 holds all collateral for this market",
            "ATA owned by the market PDA \u2014 only the program can move funds"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "collateral_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "creator_fee_vault",
          "docs": [
            "Authority's USDC token account \u2014 receives creator fees"
          ],
          "writable": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "question_hash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "b_param",
          "type": "u64"
        },
        {
          "name": "batch_window_slots",
          "type": "u64"
        },
        {
          "name": "resolution_slot",
          "type": "u64"
        },
        {
          "name": "fee_bps",
          "type": "u16"
        },
        {
          "name": "creator_fee_bps",
          "type": "u16"
        }
      ]
    },
    {
      "name": "finalize_resolution",
      "discriminator": [
        191,
        74,
        94,
        214,
        45,
        150,
        152,
        125
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone can finalize after the challenge window \u2014 permissionless"
          ],
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "pause_market",
      "discriminator": [
        216,
        238,
        4,
        164,
        65,
        11,
        162,
        91
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Only the market authority can pause"
          ],
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "propose_resolution",
      "discriminator": [
        19,
        68,
        181,
        23,
        194,
        146,
        152,
        252
      ],
      "accounts": [
        {
          "name": "proposer",
          "docs": [
            "The proposer submitting this resolution \u2014 pays rent for the PDA.",
            "Anyone may propose as long as they post the minimum bond."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "The market being resolved.",
            "Verified via PDA seeds \u2014 authority + question_hash must match."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "proposal",
          "docs": [
            "The shared resolution proposal PDA \u2014 one per market, created here.",
            "",
            "Seeds: [\"resolution\", market]",
            "",
            "",
            "Using `init` means only the *first* valid proposer can open this",
            "account. Subsequent challengers use a separate challenge instruction.",
            "Anchor's `init` constraint will automatically reject a second call",
            "that targets the same PDA address (account already initialised)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "proposed_outcome",
          "type": "bool"
        },
        {
          "name": "bond_amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeem_winnings",
      "discriminator": [
        209,
        5,
        204,
        87,
        134,
        122,
        239,
        185
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "winning_mint",
          "docs": [
            "The winning outcome token mint",
            "Verified against market.winning_outcome in handler"
          ],
          "writable": true
        },
        {
          "name": "user_winning_account",
          "docs": [
            "User's winning token account \u2014 burned here"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "winning_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "collateral_vault",
          "docs": [
            "Market USDC vault \u2014 pays out winners"
          ],
          "writable": true
        },
        {
          "name": "user_collateral_account",
          "docs": [
            "User's USDC account \u2014 receives payout"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "collateral_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "collateral_mint"
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "remove_liquidity",
      "discriminator": [
        80,
        85,
        209,
        72,
        24,
        206,
        177,
        108
      ],
      "accounts": [
        {
          "name": "lp",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "lp_pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "lp_mint",
          "docs": [
            "LP token mint \u2014 program burns from here"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "lp_token_account",
          "docs": [
            "LP's LP token account \u2014 tokens burned from here"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "lp"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "lp_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "lp_collateral_account",
          "docs": [
            "LP's USDC account \u2014 receives withdrawal"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "lp"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "collateral_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "collateral_vault",
          "docs": [
            "Market USDC vault \u2014 source of withdrawal"
          ],
          "writable": true
        },
        {
          "name": "collateral_mint"
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "lp_token_amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "reveal_order",
      "discriminator": [
        25,
        244,
        42,
        219,
        17,
        156,
        211,
        74
      ],
      "accounts": [
        {
          "name": "user",
          "docs": [
            "The user who submitted the original commit-reveal order"
          ],
          "signer": true
        },
        {
          "name": "market",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "batch_order",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": {
            "defined": {
              "name": "Outcome"
            }
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "nonce",
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
      "name": "settle_batch",
      "discriminator": [
        22,
        2,
        21,
        223,
        225,
        122,
        163,
        214
      ],
      "accounts": [
        {
          "name": "cranker",
          "docs": [
            "Cranker \u2014 anyone can call this, no authority check needed"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "The market being settled"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "lp_pool",
          "docs": [
            "LP pool \u2014 fees accrued here"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "yes_mint",
          "docs": [
            "YES token mint \u2014 program mints to filled YES orders"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  121,
                  101,
                  115,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "no_mint",
          "docs": [
            "NO token mint \u2014 program mints to filled NO orders"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  110,
                  111,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "collateral_vault",
          "docs": [
            "Market's USDC vault"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "collateral_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "cranker_collateral_account",
          "docs": [
            "Cranker's USDC account \u2014 receives tip for settling the batch"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "cranker"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "collateral_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "creator_fee_account",
          "docs": [
            "Creator's USDC token account \u2014 receives creator fee",
            "Must match the vault registered at market creation"
          ],
          "writable": true
        },
        {
          "name": "collateral_mint"
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "submit_oracle_vote",
      "discriminator": [
        216,
        118,
        75,
        24,
        237,
        248,
        85,
        209
      ],
      "accounts": [
        {
          "name": "oracle",
          "docs": [
            "Must be a whitelisted oracle for this market"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "oracle_config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  99,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "oracle_vote",
          "docs": [
            "One vote PDA per oracle \u2014 prevents double voting"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  99,
                  108,
                  101,
                  95,
                  118,
                  111,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "oracle"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": "bool"
        },
        {
          "name": "bond_amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submit_order",
      "discriminator": [
        230,
        150,
        200,
        53,
        92,
        208,
        109,
        108
      ],
      "accounts": [
        {
          "name": "user",
          "docs": [
            "User placing the bet"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "The prediction market"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "batch_order",
          "docs": [
            "BatchOrder PDA \u2014 one per user per batch window",
            "Reused each batch after settle_batch marks it filled"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "user_collateral_account",
          "docs": [
            "User's USDC account \u2014 funds debited here at submit time",
            "Funds are locked in vault immediately \u2014 no cancel after submit"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "collateral_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "collateral_vault",
          "docs": [
            "Market's USDC vault \u2014 receives the bet amount"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "collateral_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "collateral_mint",
          "docs": [
            "USDC mint"
          ]
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "outcome",
          "type": {
            "defined": {
              "name": "Outcome"
            }
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "commitment_hash",
          "type": {
            "option": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    },
    {
      "name": "tally_oracle_votes",
      "discriminator": [
        13,
        120,
        38,
        240,
        90,
        232,
        189,
        111
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        },
        {
          "name": "oracle_config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  99,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  117,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bond_amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unpause_market",
      "discriminator": [
        219,
        203,
        199,
        170,
        212,
        45,
        170,
        80
      ],
      "accounts": [
        {
          "name": "authority",
          "docs": [
            "Only the market authority can pause"
          ],
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.authority",
                "account": "Market"
              },
              {
                "kind": "account",
                "path": "market.question_hash",
                "account": "Market"
              }
            ]
          }
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "BatchOrder",
      "discriminator": [
        62,
        98,
        197,
        149,
        100,
        85,
        144,
        130
      ]
    },
    {
      "name": "LpPool",
      "discriminator": [
        185,
        127,
        131,
        141,
        197,
        198,
        170,
        147
      ]
    },
    {
      "name": "Market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "OracleConfig",
      "discriminator": [
        133,
        196,
        152,
        50,
        27,
        21,
        145,
        254
      ]
    },
    {
      "name": "OracleVote",
      "discriminator": [
        11,
        96,
        183,
        172,
        9,
        209,
        48,
        242
      ]
    },
    {
      "name": "PriceUpdateV2",
      "discriminator": [
        34,
        241,
        35,
        99,
        157,
        126,
        244,
        205
      ]
    },
    {
      "name": "ResolutionProposal",
      "discriminator": [
        188,
        203,
        94,
        223,
        208,
        121,
        225,
        38
      ]
    }
  ],
  "events": [
    {
      "name": "BatchSettled",
      "discriminator": [
        238,
        14,
        187,
        192,
        127,
        95,
        104,
        9
      ]
    },
    {
      "name": "LiquidityAdded",
      "discriminator": [
        154,
        26,
        221,
        108,
        238,
        64,
        217,
        161
      ]
    },
    {
      "name": "LiquidityRemoved",
      "discriminator": [
        225,
        105,
        216,
        39,
        124,
        116,
        169,
        189
      ]
    },
    {
      "name": "MarketCreated",
      "discriminator": [
        88,
        184,
        130,
        231,
        226,
        84,
        6,
        58
      ]
    },
    {
      "name": "MarketPaused",
      "discriminator": [
        174,
        108,
        119,
        17,
        118,
        97,
        185,
        4
      ]
    },
    {
      "name": "MarketUnpaused",
      "discriminator": [
        191,
        149,
        243,
        234,
        175,
        225,
        179,
        126
      ]
    },
    {
      "name": "OracleTallyComplete",
      "discriminator": [
        233,
        229,
        55,
        75,
        114,
        244,
        77,
        70
      ]
    },
    {
      "name": "OracleVoteSubmitted",
      "discriminator": [
        63,
        48,
        229,
        18,
        200,
        75,
        109,
        17
      ]
    },
    {
      "name": "OrderRevealed",
      "discriminator": [
        241,
        84,
        202,
        173,
        0,
        48,
        108,
        91
      ]
    },
    {
      "name": "OrderSubmitted",
      "discriminator": [
        234,
        9,
        195,
        214,
        22,
        135,
        46,
        248
      ]
    },
    {
      "name": "ResolutionFinalized",
      "discriminator": [
        149,
        12,
        63,
        110,
        234,
        46,
        241,
        202
      ]
    },
    {
      "name": "ResolutionProposed",
      "discriminator": [
        209,
        21,
        193,
        193,
        218,
        234,
        131,
        108
      ]
    },
    {
      "name": "WinningsRedeemed",
      "discriminator": [
        165,
        63,
        125,
        179,
        230,
        236,
        63,
        99
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidBParam",
      "msg": "b_param must be between 100 and 10,000"
    },
    {
      "code": 6001,
      "name": "InvalidFeeBps",
      "msg": "fee_bps must be between 0 and 1,000 (max 10%)"
    },
    {
      "code": 6002,
      "name": "InvalidBatchWindow",
      "msg": "batch_window_slots must be between 1 and 150"
    },
    {
      "code": 6003,
      "name": "InvalidResolutionSlot",
      "msg": "resolution_slot must be in the future"
    },
    {
      "code": 6004,
      "name": "MarketNotActive",
      "msg": "market is not active"
    },
    {
      "code": 6005,
      "name": "BatchWindowNotClosed",
      "msg": "batch window has not closed yet"
    },
    {
      "code": 6006,
      "name": "CannotWithdrawDuringBatch",
      "msg": "cannot withdraw liquidity during an active batch"
    },
    {
      "code": 6007,
      "name": "MarketLocked",
      "msg": "market is in pre-resolution lockout \u2014 no new orders"
    },
    {
      "code": 6008,
      "name": "MarketNotResolved",
      "msg": "market is not resolved"
    },
    {
      "code": 6009,
      "name": "MissingWinningOutcome",
      "msg": "winning outcome is not set"
    },
    {
      "code": 6010,
      "name": "MarketNotLocked",
      "msg": "market must be locked before resolution can be proposed"
    },
    {
      "code": 6011,
      "name": "MarketPaused",
      "msg": "market is paused by authority"
    },
    {
      "code": 6012,
      "name": "MarketNotPaused",
      "msg": "market is not paused"
    },
    {
      "code": 6013,
      "name": "MarketAlreadyPaused",
      "msg": "market is already paused"
    },
    {
      "code": 6014,
      "name": "OrderBelowMinimum",
      "msg": "order amount is below the minimum (1 USDC)"
    },
    {
      "code": 6015,
      "name": "OrderExceedsImpactLimit",
      "msg": "order would exceed maximum single-order market impact"
    },
    {
      "code": 6016,
      "name": "StaleOrder",
      "msg": "order belongs to a different batch window"
    },
    {
      "code": 6017,
      "name": "OrderAlreadyFilled",
      "msg": "order has already been filled"
    },
    {
      "code": 6018,
      "name": "OpenOrderExists",
      "msg": "an open order already exists for this user"
    },
    {
      "code": 6019,
      "name": "TooManyOrders",
      "msg": "too many orders provided for a single batch"
    },
    {
      "code": 6020,
      "name": "InvalidRemainingAccounts",
      "msg": "invalid remaining accounts layout"
    },
    {
      "code": 6021,
      "name": "DuplicateOrderAccount",
      "msg": "duplicate order account supplied"
    },
    {
      "code": 6022,
      "name": "OrderNotRevealed",
      "msg": "order is not yet revealed"
    },
    {
      "code": 6023,
      "name": "OracleBondTooLow",
      "msg": "oracle bond amount is below the required minimum"
    },
    {
      "code": 6024,
      "name": "OrderExceedsMaxSize",
      "msg": "order exceeds maximum allowed size for this market"
    },
    {
      "code": 6025,
      "name": "NotACommitRevealOrder",
      "msg": "order is not a commit-reveal order"
    },
    {
      "code": 6026,
      "name": "OrderAlreadyRevealed",
      "msg": "order has already been revealed"
    },
    {
      "code": 6027,
      "name": "InvalidReveal",
      "msg": "reveal does not match the original commitment hash"
    },
    {
      "code": 6028,
      "name": "CommitmentHashRequired",
      "msg": "high-impact order requires a commitment hash"
    },
    {
      "code": 6029,
      "name": "Overflow",
      "msg": "arithmetic overflow"
    },
    {
      "code": 6030,
      "name": "DivisionByZero",
      "msg": "division by zero"
    },
    {
      "code": 6031,
      "name": "Unauthorized",
      "msg": "signer is not the market authority"
    },
    {
      "code": 6032,
      "name": "InvalidCollateralVault",
      "msg": "invalid collateral vault account"
    },
    {
      "code": 6033,
      "name": "InvalidUserTokenAccount",
      "msg": "invalid user token account for order settlement"
    },
    {
      "code": 6034,
      "name": "InvalidOutcomeMint",
      "msg": "invalid outcome mint for this operation"
    },
    {
      "code": 6035,
      "name": "InvalidCreatorFeeAccount",
      "msg": "creator fee account does not match market.creator_fee_vault"
    },
    {
      "code": 6036,
      "name": "InvalidLiquidityAmount",
      "msg": "invalid liquidity amount"
    },
    {
      "code": 6037,
      "name": "InvalidRedeemAmount",
      "msg": "invalid redeem amount"
    },
    {
      "code": 6038,
      "name": "InsufficientVaultCollateral",
      "msg": "insufficient vault collateral"
    },
    {
      "code": 6039,
      "name": "InsufficientLpTokens",
      "msg": "insufficient LP tokens to withdraw"
    },
    {
      "code": 6040,
      "name": "NoWinningTokens",
      "msg": "no winning tokens to redeem"
    },
    {
      "code": 6041,
      "name": "LpLockupNotExpired",
      "msg": "minimum LP lockup period has not passed"
    },
    {
      "code": 6042,
      "name": "ResolutionSlotNotReached",
      "msg": "market has not reached the resolution slot yet"
    },
    {
      "code": 6043,
      "name": "AlreadyResolved",
      "msg": "market is already resolved"
    },
    {
      "code": 6044,
      "name": "ProposalDisputed",
      "msg": "proposal has been disputed and cannot be auto-finalized"
    },
    {
      "code": 6045,
      "name": "StillInChallengeWindow",
      "msg": "proposal is still within the challenge window"
    },
    {
      "code": 6046,
      "name": "BondTooLow",
      "msg": "bond amount is below the required minimum"
    },
    {
      "code": 6047,
      "name": "InvalidPriceFeed",
      "msg": "price feed account does not match market"
    },
    {
      "code": 6048,
      "name": "StalePriceFeed",
      "msg": "price feed is stale \u2014 data too old"
    },
    {
      "code": 6049,
      "name": "PriceFeedUnreliable",
      "msg": "price feed confidence interval too wide \u2014 possible manipulation"
    },
    {
      "code": 6050,
      "name": "NotAPriceMarket",
      "msg": "this market uses event-based resolution, not price feeds"
    },
    {
      "code": 6051,
      "name": "InsufficientOracleVotes",
      "msg": "insufficient oracle votes to trigger resolution"
    },
    {
      "code": 6052,
      "name": "OracleNotWhitelisted",
      "msg": "oracle is not whitelisted for this market"
    }
  ],
  "types": [
    {
      "name": "BatchOrder",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "The market this order belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "user",
            "docs": [
              "User who submitted the order"
            ],
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "docs": [
              "Bet direction"
            ],
            "type": {
              "defined": {
                "name": "Outcome"
              }
            }
          },
          {
            "name": "amount_in",
            "docs": [
              "USDC amount (already transferred to vault at submit time)"
            ],
            "type": "u64"
          },
          {
            "name": "batch_slot_start",
            "docs": [
              "Which batch window this order was submitted in",
              "Must match market.batch_slot_start at settle time",
              "Prevents stale order replay attacks"
            ],
            "type": "u64"
          },
          {
            "name": "commitment_hash",
            "docs": [
              "Commit-reveal: hash(outcome + amount + nonce)",
              "Zero if this is a standard (non-commit-reveal) order"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "is_commit_reveal",
            "docs": [
              "Whether this order used commit-reveal"
            ],
            "type": "bool"
          },
          {
            "name": "is_revealed",
            "docs": [
              "Whether the order has been revealed (for commit-reveal orders)"
            ],
            "type": "bool"
          },
          {
            "name": "is_filled",
            "docs": [
              "Whether the order has been filled by settle_batch"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "Canonical bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "BatchSettled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "clearing_price_bps",
            "type": "u64"
          },
          {
            "name": "net_yes",
            "type": "u64"
          },
          {
            "name": "net_no",
            "type": "u64"
          },
          {
            "name": "matched",
            "type": "u64"
          },
          {
            "name": "crank_tip",
            "type": "u64"
          },
          {
            "name": "total_fees",
            "type": "u64"
          },
          {
            "name": "orders_filled",
            "type": "u8"
          },
          {
            "name": "new_batch_slot_start",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "LiquidityAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "lp",
            "type": "pubkey"
          },
          {
            "name": "usdc_amount",
            "type": "u64"
          },
          {
            "name": "lp_tokens_minted",
            "type": "u64"
          },
          {
            "name": "new_total_liquidity",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "LiquidityRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "lp",
            "type": "pubkey"
          },
          {
            "name": "lp_tokens_burned",
            "type": "u64"
          },
          {
            "name": "usdc_returned",
            "type": "u64"
          },
          {
            "name": "new_total_liquidity",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "LpPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "docs": [
              "The market this pool belongs to"
            ],
            "type": "pubkey"
          },
          {
            "name": "total_liquidity",
            "docs": [
              "Total USDC currently in the pool"
            ],
            "type": "u64"
          },
          {
            "name": "total_lp_supply",
            "docs": [
              "Total LP tokens in circulation"
            ],
            "type": "u64"
          },
          {
            "name": "lp_mint",
            "docs": [
              "SPL mint for LP receipt tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "cumulative_fees",
            "docs": [
              "Fees accrued \u2014 distributed proportionally on withdrawal"
            ],
            "type": "u64"
          },
          {
            "name": "last_settled_slot",
            "docs": [
              "Slot of last settle_batch \u2014 used to enforce withdrawal timing"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Canonical bump"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "Market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Creator and admin of this market"
            ],
            "type": "pubkey"
          },
          {
            "name": "question_hash",
            "docs": [
              "SHA-256 hash of the question string (stored off-chain / in event logs)",
              "We store the hash not the string \u2014 strings are variable length",
              "and expensive on-chain. Hash is 32 bytes, always."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "b_param",
            "docs": [
              "Liquidity parameter \u2014 controls market depth and LP risk",
              "Larger b = deeper market, more LP capital needed",
              "Smaller b = volatile prices, cheaper to bootstrap"
            ],
            "type": "u64"
          },
          {
            "name": "yes_qty",
            "docs": [
              "Current YES shares outstanding (LMSR s1)"
            ],
            "type": "u64"
          },
          {
            "name": "no_qty",
            "docs": [
              "Current NO shares outstanding (LMSR s2)"
            ],
            "type": "u64"
          },
          {
            "name": "batch_slot_start",
            "docs": [
              "Slot at which the current batch window opened"
            ],
            "type": "u64"
          },
          {
            "name": "batch_window_slots",
            "docs": [
              "How many slots per batch window (e.g. 8 slots \u2248 3.2 seconds)"
            ],
            "type": "u64"
          },
          {
            "name": "batch_active",
            "docs": [
              "Whether a batch is currently being settled (blocks LP withdrawals)"
            ],
            "type": "bool"
          },
          {
            "name": "fee_bps",
            "docs": [
              "Total fee in basis points (e.g. 200 = 2%)"
            ],
            "type": "u16"
          },
          {
            "name": "yes_mint",
            "docs": [
              "SPL mint for YES outcome tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "no_mint",
            "docs": [
              "SPL mint for NO outcome tokens"
            ],
            "type": "pubkey"
          },
          {
            "name": "collateral_vault",
            "docs": [
              "USDC vault holding collateral"
            ],
            "type": "pubkey"
          },
          {
            "name": "resolution_slot",
            "docs": [
              "Slot after which the market locks and resolution begins"
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "docs": [
              "Current lifecycle status"
            ],
            "type": {
              "defined": {
                "name": "MarketStatus"
              }
            }
          },
          {
            "name": "winning_outcome",
            "docs": [
              "Winning outcome \u2014 set when status = Resolved"
            ],
            "type": {
              "option": {
                "defined": {
                  "name": "Outcome"
                }
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "Canonical PDA bump \u2014 stored so we never recompute it"
            ],
            "type": "u8"
          },
          {
            "name": "total_fees_collected",
            "docs": [
              "Total USDC collected in fees (for LP distribution)"
            ],
            "type": "u64"
          },
          {
            "name": "price_feed",
            "docs": [
              "Pyth price feed account for this market (zero if event market)"
            ],
            "type": "pubkey"
          },
          {
            "name": "strike_price",
            "docs": [
              "Strike price for resolution (in Pyth's price format, scaled)",
              "e.g. for \"BTC > $100k\": strike = 100_000 * 10^8"
            ],
            "type": "i64"
          },
          {
            "name": "strike_exponent",
            "docs": [
              "Price exponent from Pyth (negative number, e.g. -8)"
            ],
            "type": "i32"
          },
          {
            "name": "price_above_strike_resolves_yes",
            "docs": [
              "Direction: true = resolve YES if price >= strike",
              "false = resolve YES if price < strike"
            ],
            "type": "bool"
          },
          {
            "name": "creator_fee_vault",
            "docs": [
              "Creator's wallet \u2014 receives creator fee share from every batch"
            ],
            "type": "pubkey"
          },
          {
            "name": "creator_fee_bps",
            "docs": [
              "Creator fee in basis points (e.g. 50 = 0.5%)",
              "Taken from total fee before LP/protocol split"
            ],
            "type": "u16"
          },
          {
            "name": "max_order_bps",
            "docs": [
              "Max order size as a fraction of pool depth (e.g. 1000 = max 10%).",
              "Zero means uncapped."
            ],
            "type": "u16"
          },
          {
            "name": "crank_tip_bps",
            "docs": [
              "Tip paid to the crank from protocol fees on each settle_batch (e.g. 5 = 0.05%).",
              "Paid in USDC from the collateral vault."
            ],
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "MarketCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "question_hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "b_param",
            "type": "u64"
          },
          {
            "name": "resolution_slot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "MarketPaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "paused_by",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "MarketStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Locked"
          },
          {
            "name": "Paused"
          },
          {
            "name": "Resolved"
          }
        ]
      }
    },
    {
      "name": "MarketUnpaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "unpaused_by",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "OracleConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "oracles",
            "type": {
              "array": [
                "pubkey",
                5
              ]
            }
          },
          {
            "name": "oracle_count",
            "type": "u8"
          },
          {
            "name": "votes_required",
            "type": "u8"
          },
          {
            "name": "min_oracle_bond",
            "type": "u64"
          },
          {
            "name": "quorum_threshold",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "OracleTallyComplete",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "yes_votes",
            "type": "u8"
          },
          {
            "name": "no_votes",
            "type": "u8"
          },
          {
            "name": "proposed_outcome",
            "type": "bool"
          },
          {
            "name": "total_slashed",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "OracleVote",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": "bool"
          },
          {
            "name": "voted_at",
            "type": "u64"
          },
          {
            "name": "bond_amount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "OracleVoteSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "oracle",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": "bool"
          },
          {
            "name": "bond_amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "OrderRevealed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "Outcome"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "batch_slot_start",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "OrderSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "Outcome"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "batch_slot_start",
            "type": "u64"
          },
          {
            "name": "price_before",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "Outcome",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Yes"
          },
          {
            "name": "No"
          }
        ]
      }
    },
    {
      "name": "PriceFeedMessage",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feed_id",
            "docs": [
              "`FeedId` but avoid the type alias because of compatibility issues with Anchor's `idl-build` feature."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "price",
            "type": "i64"
          },
          {
            "name": "conf",
            "type": "u64"
          },
          {
            "name": "exponent",
            "type": "i32"
          },
          {
            "name": "publish_time",
            "docs": [
              "The timestamp of this price update in seconds"
            ],
            "type": "i64"
          },
          {
            "name": "prev_publish_time",
            "docs": [
              "The timestamp of the previous price update. This field is intended to allow users to",
              "identify the single unique price update for any moment in time:",
              "for any time t, the unique update is the one such that prev_publish_time < t <= publish_time.",
              "",
              "Note that there may not be such an update while we are migrating to the new message-sending logic,",
              "as some price updates on pythnet may not be sent to other chains (because the message-sending",
              "logic may not have triggered). We can solve this problem by making the message-sending mandatory",
              "(which we can do once publishers have migrated over).",
              "",
              "Additionally, this field may be equal to publish_time if the message is sent on a slot where",
              "where the aggregation was unsuccesful. This problem will go away once all publishers have",
              "migrated over to a recent version of pyth-agent."
            ],
            "type": "i64"
          },
          {
            "name": "ema_price",
            "type": "i64"
          },
          {
            "name": "ema_conf",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "PriceUpdateV2",
      "docs": [
        "A price update account. This account is used by the Pyth Receiver program to store a verified price update from a Pyth price feed.",
        "It contains:",
        "- `write_authority`: The write authority for this account. This authority can close this account to reclaim rent or update the account to contain a different price update.",
        "- `verification_level`: The [`VerificationLevel`] of this price update. This represents how many Wormhole guardian signatures have been verified for this price update.",
        "- `price_message`: The actual price update.",
        "- `posted_slot`: The slot at which this price update was posted."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "write_authority",
            "type": "pubkey"
          },
          {
            "name": "verification_level",
            "type": {
              "defined": {
                "name": "VerificationLevel"
              }
            }
          },
          {
            "name": "price_message",
            "type": {
              "defined": {
                "name": "PriceFeedMessage"
              }
            }
          },
          {
            "name": "posted_slot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "ResolutionFinalized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "winning_outcome",
            "type": {
              "defined": {
                "name": "Outcome"
              }
            }
          },
          {
            "name": "proposer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "ResolutionProposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "proposed_outcome",
            "type": "bool"
          },
          {
            "name": "bond_amount",
            "type": "u64"
          },
          {
            "name": "proposed_at_slot",
            "type": "u64"
          },
          {
            "name": "challenge_window",
            "type": "u64"
          },
          {
            "name": "is_disputed",
            "type": "bool"
          },
          {
            "name": "is_finalized",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "ResolutionProposed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "proposed_outcome",
            "type": "bool"
          },
          {
            "name": "bond_amount",
            "type": "u64"
          },
          {
            "name": "proposed_at_slot",
            "type": "u64"
          },
          {
            "name": "challenge_window",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "VerificationLevel",
      "docs": [
        "Pyth price updates are bridged to all blockchains via Wormhole.",
        "Using the price updates on another chain requires verifying the signatures of the Wormhole guardians.",
        "The usual process is to check the signatures for two thirds of the total number of guardians, but this can be cumbersome on Solana because of the transaction size limits,",
        "so we also allow for partial verification.",
        "",
        "This enum represents how much a price update has been verified:",
        "- If `Full`, we have verified the signatures for two thirds of the current guardians.",
        "- If `Partial`, only `num_signatures` guardian signatures have been checked.",
        "",
        "# Warning",
        "Using partially verified price updates is dangerous, as it lowers the threshold of guardians that need to collude to produce a malicious price update."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Partial",
            "fields": [
              {
                "name": "num_signatures",
                "type": "u8"
              }
            ]
          },
          {
            "name": "Full"
          }
        ]
      }
    },
    {
      "name": "WinningsRedeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "tokens_burned",
            "type": "u64"
          },
          {
            "name": "usdc_paid",
            "type": "u64"
          },
          {
            "name": "outcome",
            "type": {
              "defined": {
                "name": "Outcome"
              }
            }
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "SEED",
      "type": "string",
      "value": "\"anchor\""
    }
  ]
} as const;
