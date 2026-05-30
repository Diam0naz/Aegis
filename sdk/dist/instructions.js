"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProgram = getProgram;
exports.buildCreateMarket = buildCreateMarket;
exports.buildAddLiquidity = buildAddLiquidity;
exports.buildRemoveLiquidity = buildRemoveLiquidity;
exports.buildSubmitOrder = buildSubmitOrder;
exports.buildRevealOrder = buildRevealOrder;
exports.buildSettleBatch = buildSettleBatch;
exports.buildProposeResolution = buildProposeResolution;
exports.buildFinalizeResolution = buildFinalizeResolution;
exports.buildCheckPriceResolution = buildCheckPriceResolution;
exports.buildRedeemWinnings = buildRedeemWinnings;
exports.buildSubmitOracleVote = buildSubmitOracleVote;
exports.buildTallyOracleVotes = buildTallyOracleVotes;
exports.buildPauseMarket = buildPauseMarket;
exports.buildUnpauseMarket = buildUnpauseMarket;
const anchor_1 = require("@coral-xyz/anchor");
const spl_token_1 = require("@solana/spl-token");
const idl_1 = require("./idl");
const pda_1 = require("./pda");
function getProgram(provider) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new anchor_1.Program(idl_1.IDL, provider);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const m = (p) => p.methods;
// ── create_market ─────────────────────────────────────────────────
async function buildCreateMarket(program, params) {
    const tp = params.tokenProgram ?? spl_token_1.TOKEN_PROGRAM_ID;
    const [market] = (0, pda_1.marketPda)(params.authority, params.questionHash);
    const [yesMint] = (0, pda_1.yesMintPda)(market);
    const [noMint] = (0, pda_1.noMintPda)(market);
    const collateralVault = (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, market, true, tp);
    return m(program)
        .create_market(Array.from(params.questionHash), params.bParam, params.batchWindowSlots, params.resolutionSlot, params.feeBps, params.creatorFeeBps)
        .accounts({
        authority: params.authority,
        market,
        collateralMint: params.collateralMint,
        yesMint,
        noMint,
        collateralVault,
        creatorFeeVault: (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, params.authority, false, tp),
        tokenProgram: tp,
    })
        .instruction();
}
// ── add_liquidity ─────────────────────────────────────────────────
async function buildAddLiquidity(program, params) {
    const tp = params.tokenProgram ?? spl_token_1.TOKEN_PROGRAM_ID;
    const [lpPool] = (0, pda_1.lpPoolPda)(params.market);
    const [lpMint] = (0, pda_1.lpMintPda)(params.market);
    const lpCollateralAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, params.lp, false, tp);
    const collateralVault = (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, params.market, true, tp);
    const lpTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(lpMint, params.lp, false, tp);
    return m(program)
        .add_liquidity(params.usdcAmount)
        .accounts({
        lp: params.lp,
        market: params.market,
        lpPool,
        lpMint,
        lpCollateralAccount,
        collateralVault,
        lpTokenAccount,
        collateralMint: params.collateralMint,
        tokenProgram: tp,
    })
        .instruction();
}
// ── remove_liquidity ──────────────────────────────────────────────
async function buildRemoveLiquidity(program, params) {
    const tp = params.tokenProgram ?? spl_token_1.TOKEN_PROGRAM_ID;
    const [lpPool] = (0, pda_1.lpPoolPda)(params.market);
    const [lpMint] = (0, pda_1.lpMintPda)(params.market);
    const lpTokenAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(lpMint, params.lp, false, tp);
    const lpCollateralAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, params.lp, false, tp);
    return m(program)
        .remove_liquidity(params.lpTokenAmount)
        .accounts({
        lp: params.lp,
        market: params.market,
        lpPool,
        lpMint,
        lpTokenAccount,
        lpCollateralAccount,
        collateralVault: params.collateralVault,
        collateralMint: params.collateralMint,
        tokenProgram: tp,
    })
        .instruction();
}
// ── submit_order ──────────────────────────────────────────────────
async function buildSubmitOrder(program, params) {
    const tp = params.tokenProgram ?? spl_token_1.TOKEN_PROGRAM_ID;
    const [batchOrder] = (0, pda_1.batchOrderPda)(params.market, params.user);
    const userCollateralAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, params.user, false, tp);
    const collateralVault = (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, params.market, true, tp);
    const hash = params.commitmentHash ? Array.from(params.commitmentHash) : null;
    return m(program)
        .submit_order(params.outcome, params.amount, hash)
        .accounts({
        user: params.user,
        market: params.market,
        batchOrder,
        userCollateralAccount,
        collateralVault,
        collateralMint: params.collateralMint,
        tokenProgram: tp,
    })
        .instruction();
}
// ── reveal_order ──────────────────────────────────────────────────
async function buildRevealOrder(program, params) {
    const [batchOrder] = (0, pda_1.batchOrderPda)(params.market, params.user);
    return m(program)
        .reveal_order(params.outcome, params.amount, Array.from(params.nonce))
        .accounts({
        user: params.user,
        market: params.market,
        batchOrder,
    })
        .instruction();
}
// ── settle_batch ──────────────────────────────────────────────────
async function buildSettleBatch(program, params) {
    const tp = params.tokenProgram ?? spl_token_1.TOKEN_PROGRAM_ID;
    const [lpPool] = (0, pda_1.lpPoolPda)(params.market);
    const [yesMint] = (0, pda_1.yesMintPda)(params.market);
    const [noMint] = (0, pda_1.noMintPda)(params.market);
    const collateralVault = (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, params.market, true, tp);
    const crankerCollateralAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, params.cranker, false, tp);
    return m(program)
        .settle_batch()
        .accounts({
        cranker: params.cranker,
        market: params.market,
        lpPool,
        yesMint,
        noMint,
        collateralVault,
        crankerCollateralAccount,
        creatorFeeAccount: params.creatorFeeAccount,
        collateralMint: params.collateralMint,
        tokenProgram: tp,
    })
        .remainingAccounts(params.remainingAccounts)
        .instruction();
}
// ── propose_resolution ────────────────────────────────────────────
async function buildProposeResolution(program, params) {
    const [proposal] = (0, pda_1.resolutionPda)(params.market);
    return m(program)
        .propose_resolution(params.proposedOutcome, params.bondAmount)
        .accounts({
        proposer: params.proposer,
        market: params.market,
        proposal,
    })
        .instruction();
}
// ── finalize_resolution ───────────────────────────────────────────
async function buildFinalizeResolution(program, params) {
    const [proposal] = (0, pda_1.resolutionPda)(params.market);
    return m(program)
        .finalize_resolution()
        .accounts({ caller: params.caller, market: params.market, proposal })
        .instruction();
}
// ── check_price_resolution ────────────────────────────────────────
async function buildCheckPriceResolution(program, params) {
    const [proposal] = (0, pda_1.resolutionPda)(params.market);
    return m(program)
        .check_price_resolution(params.bondAmount)
        .accounts({
        caller: params.caller,
        market: params.market,
        priceFeed: params.priceFeed,
        proposal,
    })
        .instruction();
}
// ── redeem_winnings ───────────────────────────────────────────────
async function buildRedeemWinnings(program, params) {
    const tp = params.tokenProgram ?? spl_token_1.TOKEN_PROGRAM_ID;
    const userWinningAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(params.winningMint, params.user, false, tp);
    const userCollateralAccount = (0, spl_token_1.getAssociatedTokenAddressSync)(params.collateralMint, params.user, false, tp);
    return m(program)
        .redeem_winnings()
        .accounts({
        user: params.user,
        market: params.market,
        winningMint: params.winningMint,
        userWinningAccount,
        collateralVault: params.collateralVault,
        userCollateralAccount,
        collateralMint: params.collateralMint,
        tokenProgram: tp,
    })
        .instruction();
}
// ── submit_oracle_vote ────────────────────────────────────────────
async function buildSubmitOracleVote(program, params) {
    const [oracleConfig] = (0, pda_1.oracleConfigPda)(params.market);
    const [oracleVote] = (0, pda_1.oracleVotePda)(params.market, params.oracle);
    return m(program)
        .submit_oracle_vote(params.outcome, params.bondAmount)
        .accounts({
        oracle: params.oracle,
        market: params.market,
        oracleConfig,
        oracleVote,
    })
        .instruction();
}
// ── tally_oracle_votes ────────────────────────────────────────────
async function buildTallyOracleVotes(program, params) {
    const [oracleConfig] = (0, pda_1.oracleConfigPda)(params.market);
    const [proposal] = (0, pda_1.resolutionPda)(params.market);
    return m(program)
        .tally_oracle_votes(params.bondAmount)
        .accounts({
        caller: params.caller,
        market: params.market,
        oracleConfig,
        proposal,
    })
        .instruction();
}
// ── pause_market ──────────────────────────────────────────────────
async function buildPauseMarket(program, params) {
    return m(program)
        .pause_market()
        .accounts({ authority: params.authority, market: params.market })
        .instruction();
}
// ── unpause_market ────────────────────────────────────────────────
async function buildUnpauseMarket(program, params) {
    return m(program)
        .unpause_market()
        .accounts({ authority: params.authority, market: params.market })
        .instruction();
}
