import { Program, BN, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
export type AegisProgram = Program<any>;
export declare function getProgram(provider: AnchorProvider): AegisProgram;
export declare function buildCreateMarket(program: AegisProgram, params: {
    authority: PublicKey;
    collateralMint: PublicKey;
    questionHash: Uint8Array;
    bParam: BN;
    batchWindowSlots: BN;
    resolutionSlot: BN;
    feeBps: number;
    creatorFeeBps: number;
    tokenProgram?: PublicKey;
}): Promise<TransactionInstruction>;
export declare function buildAddLiquidity(program: AegisProgram, params: {
    lp: PublicKey;
    market: PublicKey;
    collateralMint: PublicKey;
    usdcAmount: BN;
    tokenProgram?: PublicKey;
}): Promise<TransactionInstruction>;
export declare function buildRemoveLiquidity(program: AegisProgram, params: {
    lp: PublicKey;
    market: PublicKey;
    collateralMint: PublicKey;
    collateralVault: PublicKey;
    lpTokenAmount: BN;
    tokenProgram?: PublicKey;
}): Promise<TransactionInstruction>;
export declare function buildSubmitOrder(program: AegisProgram, params: {
    user: PublicKey;
    market: PublicKey;
    collateralMint: PublicKey;
    outcome: {
        yes: Record<string, never>;
    } | {
        no: Record<string, never>;
    };
    amount: BN;
    commitmentHash?: Uint8Array;
    tokenProgram?: PublicKey;
}): Promise<TransactionInstruction>;
export declare function buildRevealOrder(program: AegisProgram, params: {
    user: PublicKey;
    market: PublicKey;
    outcome: {
        yes: Record<string, never>;
    } | {
        no: Record<string, never>;
    };
    amount: BN;
    nonce: Uint8Array;
}): Promise<TransactionInstruction>;
export declare function buildSettleBatch(program: AegisProgram, params: {
    cranker: PublicKey;
    market: PublicKey;
    collateralMint: PublicKey;
    creatorFeeAccount: PublicKey;
    /** Interleaved: [orderPda, userTokenAccount, orderPda, userTokenAccount, ...] */
    remainingAccounts: {
        pubkey: PublicKey;
        isWritable: boolean;
        isSigner: boolean;
    }[];
    tokenProgram?: PublicKey;
}): Promise<TransactionInstruction>;
export declare function buildProposeResolution(program: AegisProgram, params: {
    proposer: PublicKey;
    market: PublicKey;
    proposedOutcome: boolean;
    bondAmount: BN;
}): Promise<TransactionInstruction>;
export declare function buildFinalizeResolution(program: AegisProgram, params: {
    caller: PublicKey;
    market: PublicKey;
}): Promise<TransactionInstruction>;
export declare function buildCheckPriceResolution(program: AegisProgram, params: {
    caller: PublicKey;
    market: PublicKey;
    priceFeed: PublicKey;
    bondAmount: BN;
}): Promise<TransactionInstruction>;
export declare function buildRedeemWinnings(program: AegisProgram, params: {
    user: PublicKey;
    market: PublicKey;
    winningMint: PublicKey;
    collateralMint: PublicKey;
    collateralVault: PublicKey;
    tokenProgram?: PublicKey;
}): Promise<TransactionInstruction>;
export declare function buildSubmitOracleVote(program: AegisProgram, params: {
    oracle: PublicKey;
    market: PublicKey;
    outcome: boolean;
    bondAmount: BN;
}): Promise<TransactionInstruction>;
export declare function buildTallyOracleVotes(program: AegisProgram, params: {
    caller: PublicKey;
    market: PublicKey;
    bondAmount: BN;
}): Promise<TransactionInstruction>;
export declare function buildPauseMarket(program: AegisProgram, params: {
    authority: PublicKey;
    market: PublicKey;
}): Promise<TransactionInstruction>;
export declare function buildUnpauseMarket(program: AegisProgram, params: {
    authority: PublicKey;
    market: PublicKey;
}): Promise<TransactionInstruction>;
