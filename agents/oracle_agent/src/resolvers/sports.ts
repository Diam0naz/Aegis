export async function resolveSportsMarket(
  league: string,
  teamId: string,
): Promise<boolean> {
  // Using a free sports API — replace with your preferred provider
  // Options: ESPN API, SportsData.io, API-Football, TheRundown
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`,
  );
  const data: any = await res.json();

  for (const event of data.events) {
    const winner = event.competitions[0].competitors.find(
      (c: any) => c.winner === true,
    );
    if (winner?.team?.id === teamId) return true;
  }

  return false;
}
