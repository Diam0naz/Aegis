"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSportsMarket = resolveSportsMarket;
async function resolveSportsMarket(league, teamId) {
    // Using a free sports API — replace with your preferred provider
    // Options: ESPN API, SportsData.io, API-Football, TheRundown
    const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`);
    const data = await res.json();
    for (const event of data.events) {
        const winner = event.competitions[0].competitors.find((c) => c.winner === true);
        if (winner?.team?.id === teamId)
            return true;
    }
    return false;
}
