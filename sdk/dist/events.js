"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEvents = parseEvents;
exports.fetchTransactionEvents = fetchTransactionEvents;
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const idl_1 = require("./idl");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const coder = new anchor_1.BorshCoder(idl_1.IDL);
const parser = new anchor_1.EventParser(new web3_js_1.PublicKey(idl_1.PROGRAM_ID), coder);
/** Parse all Aegis events from a transaction's log messages. */
function parseEvents(logs) {
    const events = [];
    for (const event of parser.parseLogs(logs)) {
        events.push(event);
    }
    return events;
}
/** Fetch a confirmed transaction and return its parsed Aegis events. */
async function fetchTransactionEvents(connection, signature) {
    const tx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta?.logMessages)
        return [];
    return parseEvents(tx.meta.logMessages);
}
