"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchMarket = fetchMarket;
exports.fetchMarketBySeeds = fetchMarketBySeeds;
exports.fetchAllMarkets = fetchAllMarkets;
exports.fetchLpPool = fetchLpPool;
exports.fetchBatchOrder = fetchBatchOrder;
exports.fetchBatchOrderByAddress = fetchBatchOrderByAddress;
exports.fetchOpenOrdersForMarket = fetchOpenOrdersForMarket;
exports.fetchResolutionProposal = fetchResolutionProposal;
exports.fetchOracleConfig = fetchOracleConfig;
exports.fetchOracleVote = fetchOracleVote;
const pda_1 = require("./pda");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const acct = (program) => program.account;
async function fetchMarket(program, address) {
    return acct(program).market.fetch(address);
}
async function fetchMarketBySeeds(program, authority, questionHash) {
    const [pda] = (0, pda_1.marketPda)(authority, questionHash);
    return acct(program).market.fetch(pda);
}
async function fetchAllMarkets(program) {
    return acct(program).market.all();
}
async function fetchLpPool(program, market) {
    const [pda] = (0, pda_1.lpPoolPda)(market);
    return acct(program).lpPool.fetch(pda);
}
async function fetchBatchOrder(program, market, user) {
    const [pda] = (0, pda_1.batchOrderPda)(market, user);
    return acct(program).batchOrder.fetch(pda);
}
async function fetchBatchOrderByAddress(program, address) {
    return acct(program).batchOrder.fetch(address);
}
async function fetchOpenOrdersForMarket(program, market) {
    return acct(program).batchOrder.all([
        { memcmp: { offset: 8, bytes: market.toBase58() } },
    ]);
}
async function fetchResolutionProposal(program, market) {
    const [pda] = (0, pda_1.resolutionPda)(market);
    return acct(program).resolutionProposal.fetch(pda);
}
async function fetchOracleConfig(program, market) {
    const [pda] = (0, pda_1.oracleConfigPda)(market);
    return acct(program).oracleConfig.fetch(pda);
}
async function fetchOracleVote(program, market, oracle) {
    const [pda] = (0, pda_1.oracleVotePda)(market, oracle);
    return acct(program).oracleVote.fetch(pda);
}
