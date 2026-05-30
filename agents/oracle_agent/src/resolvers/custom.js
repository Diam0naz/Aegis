"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCustomMarket = resolveCustomMarket;
const jsonpath_plus_1 = require("jsonpath-plus");
async function resolveCustomMarket(endpoint, jsonPath, expectedValue) {
    const res = await fetch(endpoint);
    const data = await res.json();
    // Use JSONPath library for proper path resolution
    const results = (0, jsonpath_plus_1.JSONPath)({ path: jsonPath, json: data });
    const current = results.length > 0 ? results[0] : undefined;
    console.log(`  Custom resolver: path=${jsonPath} value=${current}`);
    // Handle dynamic value comparison (e.g., ">ethereum")
    if (expectedValue.startsWith(">")) {
        const compareToken = expectedValue.slice(1);
        // If compareToken is a known chain name, fetch its TVL for comparison
        if (compareToken === "ethereum") {
            const ethereumResults = (0, jsonpath_plus_1.JSONPath)({ path: "$[?(@.name=='Ethereum')].tvl", json: data });
            const ethereumTvl = ethereumResults.length > 0 ? ethereumResults[0] : 0;
            console.log(`  Comparing Solana TVL (${current}) > Ethereum TVL (${ethereumTvl})`);
            return Number(current) > Number(ethereumTvl);
        }
        // Otherwise treat as numeric comparison
        return Number(current) > Number(compareToken);
    }
    if (expectedValue.startsWith("<")) {
        const compareToken = expectedValue.slice(1);
        // If compareToken is a known chain name, fetch its TVL for comparison
        if (compareToken === "ethereum") {
            const ethereumResults = (0, jsonpath_plus_1.JSONPath)({ path: "$[?(@.name=='Ethereum')].tvl", json: data });
            const ethereumTvl = ethereumResults.length > 0 ? ethereumResults[0] : 0;
            console.log(`  Comparing Solana TVL (${current}) < Ethereum TVL (${ethereumTvl})`);
            return Number(current) < Number(ethereumTvl);
        }
        // Otherwise treat as numeric comparison
        return Number(current) < Number(compareToken);
    }
    return String(current) === expectedValue;
}
