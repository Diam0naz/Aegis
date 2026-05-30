export declare const PROGRAM_ID = "FsG83myaVACEpxdy96ieCpVUAGgxVT5wq3T6nQxqPm9Y";
export declare const IDL: {
    readonly address: "FsG83myaVACEpxdy96ieCpVUAGgxVT5wq3T6nQxqPm9Y";
    readonly metadata: {
        readonly name: "aegis_project";
        readonly version: "0.1.0";
        readonly spec: "0.1.0";
        readonly description: "Created with Anchor";
    };
    readonly instructions: readonly [{
        readonly name: "add_liquidity";
        readonly discriminator: readonly [181, 157, 89, 67, 143, 182, 52, 72];
        readonly accounts: readonly [{
            readonly name: "lp";
            readonly docs: readonly ["LP depositing liquidity"];
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly docs: readonly ["Market this liquidity is for"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "lp_pool";
            readonly docs: readonly ["LP pool PDA — created on first deposit"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [108, 112, 95, 112, 111, 111, 108];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "lp_mint";
            readonly docs: readonly ["LP token mint — program is mint authority"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [108, 112, 95, 109, 105, 110, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "lp_collateral_account";
            readonly docs: readonly ["LP's USDC account — source of deposit"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "lp";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "collateral_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "collateral_vault";
            readonly docs: readonly ["Market's USDC vault — destination of deposit"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "market";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "collateral_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "lp_token_account";
            readonly docs: readonly ["LP's token account for LP receipt tokens"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "lp";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "lp_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "collateral_mint";
            readonly docs: readonly ["The collateral mint (USDC)"];
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "associated_token_program";
            readonly address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [{
            readonly name: "usdc_amount";
            readonly type: "u64";
        }];
    }, {
        readonly name: "check_price_resolution";
        readonly discriminator: readonly [235, 236, 224, 239, 23, 161, 77, 31];
        readonly accounts: readonly [{
            readonly name: "caller";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "price_feed";
            readonly docs: readonly ["Pyth price feed account — must match market.price_feed", "PriceUpdateV2 is Pyth's on-chain account type"];
        }, {
            readonly name: "proposal";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [114, 101, 115, 111, 108, 117, 116, 105, 111, 110];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [{
            readonly name: "bond_amount";
            readonly type: "u64";
        }];
    }, {
        readonly name: "create_market";
        readonly discriminator: readonly [103, 226, 97, 235, 200, 188, 251, 254];
        readonly accounts: readonly [{
            readonly name: "authority";
            readonly docs: readonly ["Market creator — pays for account rent, becomes authority"];
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly docs: readonly ["The Market PDA — derived from authority + question_hash", "This means the same creator cannot open two identical markets"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "authority";
                }, {
                    readonly kind: "arg";
                    readonly path: "question_hash";
                }];
            };
        }, {
            readonly name: "collateral_mint";
            readonly docs: readonly ["The USDC mint (or any SPL token used as collateral)", "InterfaceAccount supports both Token and Token-2022"];
        }, {
            readonly name: "yes_mint";
            readonly docs: readonly ["YES outcome token mint", "init_if_needed + seeds makes this a deterministic PDA mint"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [121, 101, 115, 95, 109, 105, 110, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "no_mint";
            readonly docs: readonly ["NO outcome token mint"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [110, 111, 95, 109, 105, 110, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "collateral_vault";
            readonly docs: readonly ["USDC vault — holds all collateral for this market", "ATA owned by the market PDA — only the program can move funds"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "market";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "collateral_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "creator_fee_vault";
            readonly docs: readonly ["Authority's USDC token account — receives creator fees"];
            readonly writable: true;
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "associated_token_program";
            readonly address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [{
            readonly name: "question_hash";
            readonly type: {
                readonly array: readonly ["u8", 32];
            };
        }, {
            readonly name: "b_param";
            readonly type: "u64";
        }, {
            readonly name: "batch_window_slots";
            readonly type: "u64";
        }, {
            readonly name: "resolution_slot";
            readonly type: "u64";
        }, {
            readonly name: "fee_bps";
            readonly type: "u16";
        }, {
            readonly name: "creator_fee_bps";
            readonly type: "u16";
        }];
    }, {
        readonly name: "finalize_resolution";
        readonly discriminator: readonly [191, 74, 94, 214, 45, 150, 152, 125];
        readonly accounts: readonly [{
            readonly name: "caller";
            readonly docs: readonly ["Anyone can finalize after the challenge window — permissionless"];
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "proposal";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [114, 101, 115, 111, 108, 117, 116, 105, 111, 110];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }];
        readonly args: readonly [];
    }, {
        readonly name: "pause_market";
        readonly discriminator: readonly [216, 238, 4, 164, 65, 11, 162, 91];
        readonly accounts: readonly [{
            readonly name: "authority";
            readonly docs: readonly ["Only the market authority can pause"];
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }];
        readonly args: readonly [];
    }, {
        readonly name: "propose_resolution";
        readonly discriminator: readonly [19, 68, 181, 23, 194, 146, 152, 252];
        readonly accounts: readonly [{
            readonly name: "proposer";
            readonly docs: readonly ["The proposer submitting this resolution — pays rent for the PDA.", "Anyone may propose as long as they post the minimum bond."];
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly docs: readonly ["The market being resolved.", "Verified via PDA seeds — authority + question_hash must match."];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "proposal";
            readonly docs: readonly ["The shared resolution proposal PDA — one per market, created here.", "", "Seeds: [\"resolution\", market]", "", "", "Using `init` means only the *first* valid proposer can open this", "account. Subsequent challengers use a separate challenge instruction.", "Anchor's `init` constraint will automatically reject a second call", "that targets the same PDA address (account already initialised)."];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [114, 101, 115, 111, 108, 117, 116, 105, 111, 110];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [{
            readonly name: "proposed_outcome";
            readonly type: "bool";
        }, {
            readonly name: "bond_amount";
            readonly type: "u64";
        }];
    }, {
        readonly name: "redeem_winnings";
        readonly discriminator: readonly [209, 5, 204, 87, 134, 122, 239, 185];
        readonly accounts: readonly [{
            readonly name: "user";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "winning_mint";
            readonly docs: readonly ["The winning outcome token mint", "Verified against market.winning_outcome in handler"];
            readonly writable: true;
        }, {
            readonly name: "user_winning_account";
            readonly docs: readonly ["User's winning token account — burned here"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "user";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "winning_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "collateral_vault";
            readonly docs: readonly ["Market USDC vault — pays out winners"];
            readonly writable: true;
        }, {
            readonly name: "user_collateral_account";
            readonly docs: readonly ["User's USDC account — receives payout"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "user";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "collateral_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "collateral_mint";
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "associated_token_program";
            readonly address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [];
    }, {
        readonly name: "remove_liquidity";
        readonly discriminator: readonly [80, 85, 209, 72, 24, 206, 177, 108];
        readonly accounts: readonly [{
            readonly name: "lp";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "lp_pool";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [108, 112, 95, 112, 111, 111, 108];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "lp_mint";
            readonly docs: readonly ["LP token mint — program burns from here"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [108, 112, 95, 109, 105, 110, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "lp_token_account";
            readonly docs: readonly ["LP's LP token account — tokens burned from here"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "lp";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "lp_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "lp_collateral_account";
            readonly docs: readonly ["LP's USDC account — receives withdrawal"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "lp";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "collateral_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "collateral_vault";
            readonly docs: readonly ["Market USDC vault — source of withdrawal"];
            readonly writable: true;
        }, {
            readonly name: "collateral_mint";
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "associated_token_program";
            readonly address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [{
            readonly name: "lp_token_amount";
            readonly type: "u64";
        }];
    }, {
        readonly name: "reveal_order";
        readonly discriminator: readonly [25, 244, 42, 219, 17, 156, 211, 74];
        readonly accounts: readonly [{
            readonly name: "user";
            readonly docs: readonly ["The user who submitted the original commit-reveal order"];
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "batch_order";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [111, 114, 100, 101, 114];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }, {
                    readonly kind: "account";
                    readonly path: "user";
                }];
            };
        }];
        readonly args: readonly [{
            readonly name: "outcome";
            readonly type: {
                readonly defined: {
                    readonly name: "Outcome";
                };
            };
        }, {
            readonly name: "amount";
            readonly type: "u64";
        }, {
            readonly name: "nonce";
            readonly type: {
                readonly array: readonly ["u8", 32];
            };
        }];
    }, {
        readonly name: "settle_batch";
        readonly discriminator: readonly [22, 2, 21, 223, 225, 122, 163, 214];
        readonly accounts: readonly [{
            readonly name: "cranker";
            readonly docs: readonly ["Cranker — anyone can call this, no authority check needed"];
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly docs: readonly ["The market being settled"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "lp_pool";
            readonly docs: readonly ["LP pool — fees accrued here"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [108, 112, 95, 112, 111, 111, 108];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "yes_mint";
            readonly docs: readonly ["YES token mint — program mints to filled YES orders"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [121, 101, 115, 95, 109, 105, 110, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "no_mint";
            readonly docs: readonly ["NO token mint — program mints to filled NO orders"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [110, 111, 95, 109, 105, 110, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "collateral_vault";
            readonly docs: readonly ["Market's USDC vault"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "market";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "collateral_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "cranker_collateral_account";
            readonly docs: readonly ["Cranker's USDC account — receives tip for settling the batch"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "cranker";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "collateral_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "creator_fee_account";
            readonly docs: readonly ["Creator's USDC token account — receives creator fee", "Must match the vault registered at market creation"];
            readonly writable: true;
        }, {
            readonly name: "collateral_mint";
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "associated_token_program";
            readonly address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [];
    }, {
        readonly name: "submit_oracle_vote";
        readonly discriminator: readonly [216, 118, 75, 24, 237, 248, 85, 209];
        readonly accounts: readonly [{
            readonly name: "oracle";
            readonly docs: readonly ["Must be a whitelisted oracle for this market"];
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "oracle_config";
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [111, 114, 97, 99, 108, 101, 95, 99, 111, 110, 102, 105, 103];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "oracle_vote";
            readonly docs: readonly ["One vote PDA per oracle — prevents double voting"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [111, 114, 97, 99, 108, 101, 95, 118, 111, 116, 101];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }, {
                    readonly kind: "account";
                    readonly path: "oracle";
                }];
            };
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [{
            readonly name: "outcome";
            readonly type: "bool";
        }, {
            readonly name: "bond_amount";
            readonly type: "u64";
        }];
    }, {
        readonly name: "submit_order";
        readonly discriminator: readonly [230, 150, 200, 53, 92, 208, 109, 108];
        readonly accounts: readonly [{
            readonly name: "user";
            readonly docs: readonly ["User placing the bet"];
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly docs: readonly ["The prediction market"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "batch_order";
            readonly docs: readonly ["BatchOrder PDA — one per user per batch window", "Reused each batch after settle_batch marks it filled"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [111, 114, 100, 101, 114];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }, {
                    readonly kind: "account";
                    readonly path: "user";
                }];
            };
        }, {
            readonly name: "user_collateral_account";
            readonly docs: readonly ["User's USDC account — funds debited here at submit time", "Funds are locked in vault immediately — no cancel after submit"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "user";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "collateral_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "collateral_vault";
            readonly docs: readonly ["Market's USDC vault — receives the bet amount"];
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "account";
                    readonly path: "market";
                }, {
                    readonly kind: "account";
                    readonly path: "token_program";
                }, {
                    readonly kind: "account";
                    readonly path: "collateral_mint";
                }];
                readonly program: {
                    readonly kind: "const";
                    readonly value: readonly [140, 151, 37, 143, 78, 36, 137, 241, 187, 61, 16, 41, 20, 142, 13, 131, 11, 90, 19, 153, 218, 255, 16, 132, 4, 142, 123, 216, 219, 233, 248, 89];
                };
            };
        }, {
            readonly name: "collateral_mint";
            readonly docs: readonly ["USDC mint"];
        }, {
            readonly name: "token_program";
        }, {
            readonly name: "associated_token_program";
            readonly address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [{
            readonly name: "outcome";
            readonly type: {
                readonly defined: {
                    readonly name: "Outcome";
                };
            };
        }, {
            readonly name: "amount";
            readonly type: "u64";
        }, {
            readonly name: "commitment_hash";
            readonly type: {
                readonly option: {
                    readonly array: readonly ["u8", 32];
                };
            };
        }];
    }, {
        readonly name: "tally_oracle_votes";
        readonly discriminator: readonly [13, 120, 38, 240, 90, 232, 189, 111];
        readonly accounts: readonly [{
            readonly name: "caller";
            readonly writable: true;
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }, {
            readonly name: "oracle_config";
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [111, 114, 97, 99, 108, 101, 95, 99, 111, 110, 102, 105, 103];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "proposal";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [114, 101, 115, 111, 108, 117, 116, 105, 111, 110];
                }, {
                    readonly kind: "account";
                    readonly path: "market";
                }];
            };
        }, {
            readonly name: "system_program";
            readonly address: "11111111111111111111111111111111";
        }];
        readonly args: readonly [{
            readonly name: "bond_amount";
            readonly type: "u64";
        }];
    }, {
        readonly name: "unpause_market";
        readonly discriminator: readonly [219, 203, 199, 170, 212, 45, 170, 80];
        readonly accounts: readonly [{
            readonly name: "authority";
            readonly docs: readonly ["Only the market authority can pause"];
            readonly signer: true;
        }, {
            readonly name: "market";
            readonly writable: true;
            readonly pda: {
                readonly seeds: readonly [{
                    readonly kind: "const";
                    readonly value: readonly [109, 97, 114, 107, 101, 116];
                }, {
                    readonly kind: "account";
                    readonly path: "market.authority";
                    readonly account: "Market";
                }, {
                    readonly kind: "account";
                    readonly path: "market.question_hash";
                    readonly account: "Market";
                }];
            };
        }];
        readonly args: readonly [];
    }];
    readonly accounts: readonly [{
        readonly name: "BatchOrder";
        readonly discriminator: readonly [62, 98, 197, 149, 100, 85, 144, 130];
    }, {
        readonly name: "LpPool";
        readonly discriminator: readonly [185, 127, 131, 141, 197, 198, 170, 147];
    }, {
        readonly name: "Market";
        readonly discriminator: readonly [219, 190, 213, 55, 0, 227, 198, 154];
    }, {
        readonly name: "OracleConfig";
        readonly discriminator: readonly [133, 196, 152, 50, 27, 21, 145, 254];
    }, {
        readonly name: "OracleVote";
        readonly discriminator: readonly [11, 96, 183, 172, 9, 209, 48, 242];
    }, {
        readonly name: "PriceUpdateV2";
        readonly discriminator: readonly [34, 241, 35, 99, 157, 126, 244, 205];
    }, {
        readonly name: "ResolutionProposal";
        readonly discriminator: readonly [188, 203, 94, 223, 208, 121, 225, 38];
    }];
    readonly events: readonly [{
        readonly name: "BatchSettled";
        readonly discriminator: readonly [238, 14, 187, 192, 127, 95, 104, 9];
    }, {
        readonly name: "LiquidityAdded";
        readonly discriminator: readonly [154, 26, 221, 108, 238, 64, 217, 161];
    }, {
        readonly name: "LiquidityRemoved";
        readonly discriminator: readonly [225, 105, 216, 39, 124, 116, 169, 189];
    }, {
        readonly name: "MarketCreated";
        readonly discriminator: readonly [88, 184, 130, 231, 226, 84, 6, 58];
    }, {
        readonly name: "MarketPaused";
        readonly discriminator: readonly [174, 108, 119, 17, 118, 97, 185, 4];
    }, {
        readonly name: "MarketUnpaused";
        readonly discriminator: readonly [191, 149, 243, 234, 175, 225, 179, 126];
    }, {
        readonly name: "OracleTallyComplete";
        readonly discriminator: readonly [233, 229, 55, 75, 114, 244, 77, 70];
    }, {
        readonly name: "OracleVoteSubmitted";
        readonly discriminator: readonly [63, 48, 229, 18, 200, 75, 109, 17];
    }, {
        readonly name: "OrderRevealed";
        readonly discriminator: readonly [241, 84, 202, 173, 0, 48, 108, 91];
    }, {
        readonly name: "OrderSubmitted";
        readonly discriminator: readonly [234, 9, 195, 214, 22, 135, 46, 248];
    }, {
        readonly name: "ResolutionFinalized";
        readonly discriminator: readonly [149, 12, 63, 110, 234, 46, 241, 202];
    }, {
        readonly name: "ResolutionProposed";
        readonly discriminator: readonly [209, 21, 193, 193, 218, 234, 131, 108];
    }, {
        readonly name: "WinningsRedeemed";
        readonly discriminator: readonly [165, 63, 125, 179, 230, 236, 63, 99];
    }];
    readonly errors: readonly [{
        readonly code: 6000;
        readonly name: "InvalidBParam";
        readonly msg: "b_param must be between 100 and 10,000";
    }, {
        readonly code: 6001;
        readonly name: "InvalidFeeBps";
        readonly msg: "fee_bps must be between 0 and 1,000 (max 10%)";
    }, {
        readonly code: 6002;
        readonly name: "InvalidBatchWindow";
        readonly msg: "batch_window_slots must be between 1 and 150";
    }, {
        readonly code: 6003;
        readonly name: "InvalidResolutionSlot";
        readonly msg: "resolution_slot must be in the future";
    }, {
        readonly code: 6004;
        readonly name: "MarketNotActive";
        readonly msg: "market is not active";
    }, {
        readonly code: 6005;
        readonly name: "BatchWindowNotClosed";
        readonly msg: "batch window has not closed yet";
    }, {
        readonly code: 6006;
        readonly name: "CannotWithdrawDuringBatch";
        readonly msg: "cannot withdraw liquidity during an active batch";
    }, {
        readonly code: 6007;
        readonly name: "MarketLocked";
        readonly msg: "market is in pre-resolution lockout — no new orders";
    }, {
        readonly code: 6008;
        readonly name: "MarketNotResolved";
        readonly msg: "market is not resolved";
    }, {
        readonly code: 6009;
        readonly name: "MissingWinningOutcome";
        readonly msg: "winning outcome is not set";
    }, {
        readonly code: 6010;
        readonly name: "MarketNotLocked";
        readonly msg: "market must be locked before resolution can be proposed";
    }, {
        readonly code: 6011;
        readonly name: "MarketPaused";
        readonly msg: "market is paused by authority";
    }, {
        readonly code: 6012;
        readonly name: "MarketNotPaused";
        readonly msg: "market is not paused";
    }, {
        readonly code: 6013;
        readonly name: "MarketAlreadyPaused";
        readonly msg: "market is already paused";
    }, {
        readonly code: 6014;
        readonly name: "OrderBelowMinimum";
        readonly msg: "order amount is below the minimum (1 USDC)";
    }, {
        readonly code: 6015;
        readonly name: "OrderExceedsImpactLimit";
        readonly msg: "order would exceed maximum single-order market impact";
    }, {
        readonly code: 6016;
        readonly name: "StaleOrder";
        readonly msg: "order belongs to a different batch window";
    }, {
        readonly code: 6017;
        readonly name: "OrderAlreadyFilled";
        readonly msg: "order has already been filled";
    }, {
        readonly code: 6018;
        readonly name: "OpenOrderExists";
        readonly msg: "an open order already exists for this user";
    }, {
        readonly code: 6019;
        readonly name: "TooManyOrders";
        readonly msg: "too many orders provided for a single batch";
    }, {
        readonly code: 6020;
        readonly name: "InvalidRemainingAccounts";
        readonly msg: "invalid remaining accounts layout";
    }, {
        readonly code: 6021;
        readonly name: "DuplicateOrderAccount";
        readonly msg: "duplicate order account supplied";
    }, {
        readonly code: 6022;
        readonly name: "OrderNotRevealed";
        readonly msg: "order is not yet revealed";
    }, {
        readonly code: 6023;
        readonly name: "OracleBondTooLow";
        readonly msg: "oracle bond amount is below the required minimum";
    }, {
        readonly code: 6024;
        readonly name: "OrderExceedsMaxSize";
        readonly msg: "order exceeds maximum allowed size for this market";
    }, {
        readonly code: 6025;
        readonly name: "NotACommitRevealOrder";
        readonly msg: "order is not a commit-reveal order";
    }, {
        readonly code: 6026;
        readonly name: "OrderAlreadyRevealed";
        readonly msg: "order has already been revealed";
    }, {
        readonly code: 6027;
        readonly name: "InvalidReveal";
        readonly msg: "reveal does not match the original commitment hash";
    }, {
        readonly code: 6028;
        readonly name: "CommitmentHashRequired";
        readonly msg: "high-impact order requires a commitment hash";
    }, {
        readonly code: 6029;
        readonly name: "Overflow";
        readonly msg: "arithmetic overflow";
    }, {
        readonly code: 6030;
        readonly name: "DivisionByZero";
        readonly msg: "division by zero";
    }, {
        readonly code: 6031;
        readonly name: "Unauthorized";
        readonly msg: "signer is not the market authority";
    }, {
        readonly code: 6032;
        readonly name: "InvalidCollateralVault";
        readonly msg: "invalid collateral vault account";
    }, {
        readonly code: 6033;
        readonly name: "InvalidUserTokenAccount";
        readonly msg: "invalid user token account for order settlement";
    }, {
        readonly code: 6034;
        readonly name: "InvalidOutcomeMint";
        readonly msg: "invalid outcome mint for this operation";
    }, {
        readonly code: 6035;
        readonly name: "InvalidCreatorFeeAccount";
        readonly msg: "creator fee account does not match market.creator_fee_vault";
    }, {
        readonly code: 6036;
        readonly name: "InvalidLiquidityAmount";
        readonly msg: "invalid liquidity amount";
    }, {
        readonly code: 6037;
        readonly name: "InvalidRedeemAmount";
        readonly msg: "invalid redeem amount";
    }, {
        readonly code: 6038;
        readonly name: "InsufficientVaultCollateral";
        readonly msg: "insufficient vault collateral";
    }, {
        readonly code: 6039;
        readonly name: "InsufficientLpTokens";
        readonly msg: "insufficient LP tokens to withdraw";
    }, {
        readonly code: 6040;
        readonly name: "NoWinningTokens";
        readonly msg: "no winning tokens to redeem";
    }, {
        readonly code: 6041;
        readonly name: "LpLockupNotExpired";
        readonly msg: "minimum LP lockup period has not passed";
    }, {
        readonly code: 6042;
        readonly name: "ResolutionSlotNotReached";
        readonly msg: "market has not reached the resolution slot yet";
    }, {
        readonly code: 6043;
        readonly name: "AlreadyResolved";
        readonly msg: "market is already resolved";
    }, {
        readonly code: 6044;
        readonly name: "ProposalDisputed";
        readonly msg: "proposal has been disputed and cannot be auto-finalized";
    }, {
        readonly code: 6045;
        readonly name: "StillInChallengeWindow";
        readonly msg: "proposal is still within the challenge window";
    }, {
        readonly code: 6046;
        readonly name: "BondTooLow";
        readonly msg: "bond amount is below the required minimum";
    }, {
        readonly code: 6047;
        readonly name: "InvalidPriceFeed";
        readonly msg: "price feed account does not match market";
    }, {
        readonly code: 6048;
        readonly name: "StalePriceFeed";
        readonly msg: "price feed is stale — data too old";
    }, {
        readonly code: 6049;
        readonly name: "PriceFeedUnreliable";
        readonly msg: "price feed confidence interval too wide — possible manipulation";
    }, {
        readonly code: 6050;
        readonly name: "NotAPriceMarket";
        readonly msg: "this market uses event-based resolution, not price feeds";
    }, {
        readonly code: 6051;
        readonly name: "InsufficientOracleVotes";
        readonly msg: "insufficient oracle votes to trigger resolution";
    }, {
        readonly code: 6052;
        readonly name: "OracleNotWhitelisted";
        readonly msg: "oracle is not whitelisted for this market";
    }];
    readonly types: readonly [{
        readonly name: "BatchOrder";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly docs: readonly ["The market this order belongs to"];
                readonly type: "pubkey";
            }, {
                readonly name: "user";
                readonly docs: readonly ["User who submitted the order"];
                readonly type: "pubkey";
            }, {
                readonly name: "outcome";
                readonly docs: readonly ["Bet direction"];
                readonly type: {
                    readonly defined: {
                        readonly name: "Outcome";
                    };
                };
            }, {
                readonly name: "amount_in";
                readonly docs: readonly ["USDC amount (already transferred to vault at submit time)"];
                readonly type: "u64";
            }, {
                readonly name: "batch_slot_start";
                readonly docs: readonly ["Which batch window this order was submitted in", "Must match market.batch_slot_start at settle time", "Prevents stale order replay attacks"];
                readonly type: "u64";
            }, {
                readonly name: "commitment_hash";
                readonly docs: readonly ["Commit-reveal: hash(outcome + amount + nonce)", "Zero if this is a standard (non-commit-reveal) order"];
                readonly type: {
                    readonly array: readonly ["u8", 32];
                };
            }, {
                readonly name: "is_commit_reveal";
                readonly docs: readonly ["Whether this order used commit-reveal"];
                readonly type: "bool";
            }, {
                readonly name: "is_revealed";
                readonly docs: readonly ["Whether the order has been revealed (for commit-reveal orders)"];
                readonly type: "bool";
            }, {
                readonly name: "is_filled";
                readonly docs: readonly ["Whether the order has been filled by settle_batch"];
                readonly type: "bool";
            }, {
                readonly name: "bump";
                readonly docs: readonly ["Canonical bump"];
                readonly type: "u8";
            }];
        };
    }, {
        readonly name: "BatchSettled";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "clearing_price_bps";
                readonly type: "u64";
            }, {
                readonly name: "net_yes";
                readonly type: "u64";
            }, {
                readonly name: "net_no";
                readonly type: "u64";
            }, {
                readonly name: "matched";
                readonly type: "u64";
            }, {
                readonly name: "crank_tip";
                readonly type: "u64";
            }, {
                readonly name: "total_fees";
                readonly type: "u64";
            }, {
                readonly name: "orders_filled";
                readonly type: "u8";
            }, {
                readonly name: "new_batch_slot_start";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "LiquidityAdded";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "lp";
                readonly type: "pubkey";
            }, {
                readonly name: "usdc_amount";
                readonly type: "u64";
            }, {
                readonly name: "lp_tokens_minted";
                readonly type: "u64";
            }, {
                readonly name: "new_total_liquidity";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "LiquidityRemoved";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "lp";
                readonly type: "pubkey";
            }, {
                readonly name: "lp_tokens_burned";
                readonly type: "u64";
            }, {
                readonly name: "usdc_returned";
                readonly type: "u64";
            }, {
                readonly name: "new_total_liquidity";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "LpPool";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly docs: readonly ["The market this pool belongs to"];
                readonly type: "pubkey";
            }, {
                readonly name: "total_liquidity";
                readonly docs: readonly ["Total USDC currently in the pool"];
                readonly type: "u64";
            }, {
                readonly name: "total_lp_supply";
                readonly docs: readonly ["Total LP tokens in circulation"];
                readonly type: "u64";
            }, {
                readonly name: "lp_mint";
                readonly docs: readonly ["SPL mint for LP receipt tokens"];
                readonly type: "pubkey";
            }, {
                readonly name: "cumulative_fees";
                readonly docs: readonly ["Fees accrued — distributed proportionally on withdrawal"];
                readonly type: "u64";
            }, {
                readonly name: "last_settled_slot";
                readonly docs: readonly ["Slot of last settle_batch — used to enforce withdrawal timing"];
                readonly type: "u64";
            }, {
                readonly name: "bump";
                readonly docs: readonly ["Canonical bump"];
                readonly type: "u8";
            }];
        };
    }, {
        readonly name: "Market";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "authority";
                readonly docs: readonly ["Creator and admin of this market"];
                readonly type: "pubkey";
            }, {
                readonly name: "question_hash";
                readonly docs: readonly ["SHA-256 hash of the question string (stored off-chain / in event logs)", "We store the hash not the string — strings are variable length", "and expensive on-chain. Hash is 32 bytes, always."];
                readonly type: {
                    readonly array: readonly ["u8", 32];
                };
            }, {
                readonly name: "b_param";
                readonly docs: readonly ["Liquidity parameter — controls market depth and LP risk", "Larger b = deeper market, more LP capital needed", "Smaller b = volatile prices, cheaper to bootstrap"];
                readonly type: "u64";
            }, {
                readonly name: "yes_qty";
                readonly docs: readonly ["Current YES shares outstanding (LMSR s1)"];
                readonly type: "u64";
            }, {
                readonly name: "no_qty";
                readonly docs: readonly ["Current NO shares outstanding (LMSR s2)"];
                readonly type: "u64";
            }, {
                readonly name: "batch_slot_start";
                readonly docs: readonly ["Slot at which the current batch window opened"];
                readonly type: "u64";
            }, {
                readonly name: "batch_window_slots";
                readonly docs: readonly ["How many slots per batch window (e.g. 8 slots ≈ 3.2 seconds)"];
                readonly type: "u64";
            }, {
                readonly name: "batch_active";
                readonly docs: readonly ["Whether a batch is currently being settled (blocks LP withdrawals)"];
                readonly type: "bool";
            }, {
                readonly name: "fee_bps";
                readonly docs: readonly ["Total fee in basis points (e.g. 200 = 2%)"];
                readonly type: "u16";
            }, {
                readonly name: "yes_mint";
                readonly docs: readonly ["SPL mint for YES outcome tokens"];
                readonly type: "pubkey";
            }, {
                readonly name: "no_mint";
                readonly docs: readonly ["SPL mint for NO outcome tokens"];
                readonly type: "pubkey";
            }, {
                readonly name: "collateral_vault";
                readonly docs: readonly ["USDC vault holding collateral"];
                readonly type: "pubkey";
            }, {
                readonly name: "resolution_slot";
                readonly docs: readonly ["Slot after which the market locks and resolution begins"];
                readonly type: "u64";
            }, {
                readonly name: "status";
                readonly docs: readonly ["Current lifecycle status"];
                readonly type: {
                    readonly defined: {
                        readonly name: "MarketStatus";
                    };
                };
            }, {
                readonly name: "winning_outcome";
                readonly docs: readonly ["Winning outcome — set when status = Resolved"];
                readonly type: {
                    readonly option: {
                        readonly defined: {
                            readonly name: "Outcome";
                        };
                    };
                };
            }, {
                readonly name: "bump";
                readonly docs: readonly ["Canonical PDA bump — stored so we never recompute it"];
                readonly type: "u8";
            }, {
                readonly name: "total_fees_collected";
                readonly docs: readonly ["Total USDC collected in fees (for LP distribution)"];
                readonly type: "u64";
            }, {
                readonly name: "price_feed";
                readonly docs: readonly ["Pyth price feed account for this market (zero if event market)"];
                readonly type: "pubkey";
            }, {
                readonly name: "strike_price";
                readonly docs: readonly ["Strike price for resolution (in Pyth's price format, scaled)", "e.g. for \"BTC > $100k\": strike = 100_000 * 10^8"];
                readonly type: "i64";
            }, {
                readonly name: "strike_exponent";
                readonly docs: readonly ["Price exponent from Pyth (negative number, e.g. -8)"];
                readonly type: "i32";
            }, {
                readonly name: "price_above_strike_resolves_yes";
                readonly docs: readonly ["Direction: true = resolve YES if price >= strike", "false = resolve YES if price < strike"];
                readonly type: "bool";
            }, {
                readonly name: "creator_fee_vault";
                readonly docs: readonly ["Creator's wallet — receives creator fee share from every batch"];
                readonly type: "pubkey";
            }, {
                readonly name: "creator_fee_bps";
                readonly docs: readonly ["Creator fee in basis points (e.g. 50 = 0.5%)", "Taken from total fee before LP/protocol split"];
                readonly type: "u16";
            }, {
                readonly name: "max_order_bps";
                readonly docs: readonly ["Max order size as a fraction of pool depth (e.g. 1000 = max 10%).", "Zero means uncapped."];
                readonly type: "u16";
            }, {
                readonly name: "crank_tip_bps";
                readonly docs: readonly ["Tip paid to the crank from protocol fees on each settle_batch (e.g. 5 = 0.05%).", "Paid in USDC from the collateral vault."];
                readonly type: "u16";
            }];
        };
    }, {
        readonly name: "MarketCreated";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "authority";
                readonly type: "pubkey";
            }, {
                readonly name: "question_hash";
                readonly type: {
                    readonly array: readonly ["u8", 32];
                };
            }, {
                readonly name: "b_param";
                readonly type: "u64";
            }, {
                readonly name: "resolution_slot";
                readonly type: "u64";
            }, {
                readonly name: "timestamp";
                readonly type: "i64";
            }];
        };
    }, {
        readonly name: "MarketPaused";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "paused_by";
                readonly type: "pubkey";
            }];
        };
    }, {
        readonly name: "MarketStatus";
        readonly type: {
            readonly kind: "enum";
            readonly variants: readonly [{
                readonly name: "Active";
            }, {
                readonly name: "Locked";
            }, {
                readonly name: "Paused";
            }, {
                readonly name: "Resolved";
            }];
        };
    }, {
        readonly name: "MarketUnpaused";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "unpaused_by";
                readonly type: "pubkey";
            }];
        };
    }, {
        readonly name: "OracleConfig";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "oracles";
                readonly type: {
                    readonly array: readonly ["pubkey", 5];
                };
            }, {
                readonly name: "oracle_count";
                readonly type: "u8";
            }, {
                readonly name: "votes_required";
                readonly type: "u8";
            }, {
                readonly name: "min_oracle_bond";
                readonly type: "u64";
            }, {
                readonly name: "quorum_threshold";
                readonly type: "u8";
            }, {
                readonly name: "bump";
                readonly type: "u8";
            }];
        };
    }, {
        readonly name: "OracleTallyComplete";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "yes_votes";
                readonly type: "u8";
            }, {
                readonly name: "no_votes";
                readonly type: "u8";
            }, {
                readonly name: "proposed_outcome";
                readonly type: "bool";
            }, {
                readonly name: "total_slashed";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "OracleVote";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "authority";
                readonly type: "pubkey";
            }, {
                readonly name: "outcome";
                readonly type: "bool";
            }, {
                readonly name: "voted_at";
                readonly type: "u64";
            }, {
                readonly name: "bond_amount";
                readonly type: "u64";
            }, {
                readonly name: "bump";
                readonly type: "u8";
            }];
        };
    }, {
        readonly name: "OracleVoteSubmitted";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "oracle";
                readonly type: "pubkey";
            }, {
                readonly name: "outcome";
                readonly type: "bool";
            }, {
                readonly name: "bond_amount";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "OrderRevealed";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "user";
                readonly type: "pubkey";
            }, {
                readonly name: "outcome";
                readonly type: {
                    readonly defined: {
                        readonly name: "Outcome";
                    };
                };
            }, {
                readonly name: "amount";
                readonly type: "u64";
            }, {
                readonly name: "batch_slot_start";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "OrderSubmitted";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "user";
                readonly type: "pubkey";
            }, {
                readonly name: "outcome";
                readonly type: {
                    readonly defined: {
                        readonly name: "Outcome";
                    };
                };
            }, {
                readonly name: "amount";
                readonly type: "u64";
            }, {
                readonly name: "batch_slot_start";
                readonly type: "u64";
            }, {
                readonly name: "price_before";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "Outcome";
        readonly type: {
            readonly kind: "enum";
            readonly variants: readonly [{
                readonly name: "Yes";
            }, {
                readonly name: "No";
            }];
        };
    }, {
        readonly name: "PriceFeedMessage";
        readonly repr: {
            readonly kind: "c";
        };
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "feed_id";
                readonly docs: readonly ["`FeedId` but avoid the type alias because of compatibility issues with Anchor's `idl-build` feature."];
                readonly type: {
                    readonly array: readonly ["u8", 32];
                };
            }, {
                readonly name: "price";
                readonly type: "i64";
            }, {
                readonly name: "conf";
                readonly type: "u64";
            }, {
                readonly name: "exponent";
                readonly type: "i32";
            }, {
                readonly name: "publish_time";
                readonly docs: readonly ["The timestamp of this price update in seconds"];
                readonly type: "i64";
            }, {
                readonly name: "prev_publish_time";
                readonly docs: readonly ["The timestamp of the previous price update. This field is intended to allow users to", "identify the single unique price update for any moment in time:", "for any time t, the unique update is the one such that prev_publish_time < t <= publish_time.", "", "Note that there may not be such an update while we are migrating to the new message-sending logic,", "as some price updates on pythnet may not be sent to other chains (because the message-sending", "logic may not have triggered). We can solve this problem by making the message-sending mandatory", "(which we can do once publishers have migrated over).", "", "Additionally, this field may be equal to publish_time if the message is sent on a slot where", "where the aggregation was unsuccesful. This problem will go away once all publishers have", "migrated over to a recent version of pyth-agent."];
                readonly type: "i64";
            }, {
                readonly name: "ema_price";
                readonly type: "i64";
            }, {
                readonly name: "ema_conf";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "PriceUpdateV2";
        readonly docs: readonly ["A price update account. This account is used by the Pyth Receiver program to store a verified price update from a Pyth price feed.", "It contains:", "- `write_authority`: The write authority for this account. This authority can close this account to reclaim rent or update the account to contain a different price update.", "- `verification_level`: The [`VerificationLevel`] of this price update. This represents how many Wormhole guardian signatures have been verified for this price update.", "- `price_message`: The actual price update.", "- `posted_slot`: The slot at which this price update was posted."];
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "write_authority";
                readonly type: "pubkey";
            }, {
                readonly name: "verification_level";
                readonly type: {
                    readonly defined: {
                        readonly name: "VerificationLevel";
                    };
                };
            }, {
                readonly name: "price_message";
                readonly type: {
                    readonly defined: {
                        readonly name: "PriceFeedMessage";
                    };
                };
            }, {
                readonly name: "posted_slot";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "ResolutionFinalized";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "winning_outcome";
                readonly type: {
                    readonly defined: {
                        readonly name: "Outcome";
                    };
                };
            }, {
                readonly name: "proposer";
                readonly type: "pubkey";
            }];
        };
    }, {
        readonly name: "ResolutionProposal";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "proposer";
                readonly type: "pubkey";
            }, {
                readonly name: "proposed_outcome";
                readonly type: "bool";
            }, {
                readonly name: "bond_amount";
                readonly type: "u64";
            }, {
                readonly name: "proposed_at_slot";
                readonly type: "u64";
            }, {
                readonly name: "challenge_window";
                readonly type: "u64";
            }, {
                readonly name: "is_disputed";
                readonly type: "bool";
            }, {
                readonly name: "is_finalized";
                readonly type: "bool";
            }, {
                readonly name: "bump";
                readonly type: "u8";
            }];
        };
    }, {
        readonly name: "ResolutionProposed";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "proposer";
                readonly type: "pubkey";
            }, {
                readonly name: "proposed_outcome";
                readonly type: "bool";
            }, {
                readonly name: "bond_amount";
                readonly type: "u64";
            }, {
                readonly name: "proposed_at_slot";
                readonly type: "u64";
            }, {
                readonly name: "challenge_window";
                readonly type: "u64";
            }];
        };
    }, {
        readonly name: "VerificationLevel";
        readonly docs: readonly ["Pyth price updates are bridged to all blockchains via Wormhole.", "Using the price updates on another chain requires verifying the signatures of the Wormhole guardians.", "The usual process is to check the signatures for two thirds of the total number of guardians, but this can be cumbersome on Solana because of the transaction size limits,", "so we also allow for partial verification.", "", "This enum represents how much a price update has been verified:", "- If `Full`, we have verified the signatures for two thirds of the current guardians.", "- If `Partial`, only `num_signatures` guardian signatures have been checked.", "", "# Warning", "Using partially verified price updates is dangerous, as it lowers the threshold of guardians that need to collude to produce a malicious price update."];
        readonly type: {
            readonly kind: "enum";
            readonly variants: readonly [{
                readonly name: "Partial";
                readonly fields: readonly [{
                    readonly name: "num_signatures";
                    readonly type: "u8";
                }];
            }, {
                readonly name: "Full";
            }];
        };
    }, {
        readonly name: "WinningsRedeemed";
        readonly type: {
            readonly kind: "struct";
            readonly fields: readonly [{
                readonly name: "market";
                readonly type: "pubkey";
            }, {
                readonly name: "user";
                readonly type: "pubkey";
            }, {
                readonly name: "tokens_burned";
                readonly type: "u64";
            }, {
                readonly name: "usdc_paid";
                readonly type: "u64";
            }, {
                readonly name: "outcome";
                readonly type: {
                    readonly defined: {
                        readonly name: "Outcome";
                    };
                };
            }];
        };
    }];
    readonly constants: readonly [{
        readonly name: "SEED";
        readonly type: "string";
        readonly value: "\"anchor\"";
    }];
};
