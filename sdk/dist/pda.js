"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketPda = marketPda;
exports.lpPoolPda = lpPoolPda;
exports.lpMintPda = lpMintPda;
exports.yesMintPda = yesMintPda;
exports.noMintPda = noMintPda;
exports.batchOrderPda = batchOrderPda;
exports.resolutionPda = resolutionPda;
exports.oracleConfigPda = oracleConfigPda;
exports.oracleVotePda = oracleVotePda;
const web3_js_1 = require("@solana/web3.js");
const idl_1 = require("./idl");
const PROGRAM = new web3_js_1.PublicKey(idl_1.PROGRAM_ID);
function marketPda(authority, questionHash) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("market"), authority.toBuffer(), Buffer.from(questionHash)], PROGRAM);
}
function lpPoolPda(market) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("lp_pool"), market.toBuffer()], PROGRAM);
}
function lpMintPda(market) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("lp_mint"), market.toBuffer()], PROGRAM);
}
function yesMintPda(market) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("yes_mint"), market.toBuffer()], PROGRAM);
}
function noMintPda(market) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("no_mint"), market.toBuffer()], PROGRAM);
}
function batchOrderPda(market, user) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("order"), market.toBuffer(), user.toBuffer()], PROGRAM);
}
function resolutionPda(market) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("resolution"), market.toBuffer()], PROGRAM);
}
function oracleConfigPda(market) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("oracle_config"), market.toBuffer()], PROGRAM);
}
function oracleVotePda(market, oracle) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("oracle_vote"), market.toBuffer(), oracle.toBuffer()], PROGRAM);
}
