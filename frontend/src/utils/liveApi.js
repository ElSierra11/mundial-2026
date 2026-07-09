// Live scores integration via ESPN public API (no key required)
// Falls back gracefully if API is unavailable

const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
const ESPN_SUMMARY_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary';

// English → Spanish team name mapping for merging ESPN data with ours
const TEAM_NAME_MAP = {
  'mexico': 'México', 'ecuador': 'Ecuador', 'france': 'Francia',
  'sweden': 'Suecia', 'norway': 'Noruega', "ivory coast": 'Costa de Marfil',
  "côte d'ivoire": 'Costa de Marfil', 'brazil': 'Brasil', 'japan': 'Japón',
  'canada': 'Canadá', 'south africa': 'Sudáfrica', 'morocco': 'Marruecos',
  'paraguay': 'Paraguay', 'germany': 'Alemania', 'england': 'Inglaterra',
  'spain': 'España', 'portugal': 'Portugal', 'usa': 'EE. UU.',
  'united states': 'EE. UU.', 'belgium': 'Bélgica', 'switzerland': 'Suiza',
  'algeria': 'Argelia', 'australia': 'Australia', 'egypt': 'Egipto',
  'argentina': 'Argentina', 'cape verde': 'Cabo Verde', 'colombia': 'Colombia',
  'ghana': 'Ghana', 'senegal': 'Senegal', 'netherlands': 'Países Bajos',
  'holland': 'Países Bajos', 'croatia': 'Croacia', 'dr congo': 'R. D. Congo',
  'democratic republic of congo': 'R. D. Congo', 'nigeria': 'Nigeria',
  'costa rica': 'Costa Rica', 'chile': 'Chile', 'uruguay': 'Uruguay',
  'peru': 'Perú',
  'bosnia and herzegovina': 'Bosnia y Herz.',
  'bosnia & herzegovina': 'Bosnia y Herz.',
};

function normalizeTeamName(name) {
  if (!name) return '';
  const lower = name.toLowerCase().trim();
  return TEAM_NAME_MAP[lower] || name;
}

function mapESPNStatus(statusName) {
  if (!statusName) return 'scheduled';
  const s = statusName.toUpperCase();
  if (s.includes('FINAL') || s.includes('FULL_TIME')) return 'finished';
  if (s.includes('PROGRESS') || s.includes('LIVE') || s.includes('HALF')) return 'live';
  return 'scheduled';
}

function mapESPNStage(roundInfo, seasonType) {
  if (!roundInfo) return 'Octavos de Final';
  const r = String(roundInfo).toLowerCase();
  if (r.includes('third') || r.includes('3rd') || r.includes('third place')) return '3er Puesto';
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 'Final';
  if (r.includes('semi')) return 'Semifinal';
  if (r.includes('quarter') || r.includes('qf')) return 'Cuartos de Final';
  if (r.includes('16') || r.includes('round of 16') || r.includes('r16')) return 'Octavos de Final';
  if (r.includes('32') || r.includes('r32')) return 'Ronda de 32';
  return 'Octavos de Final';
}

export async function fetchLiveWorldCupScores() {
  try {
    const res = await fetch(ESPN_URL, {
      signal: AbortSignal.timeout(6000),
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!data.events?.length) return null;

    const liveMatches = data.events.map(event => {
      const comp = event.competitions?.[0];
      if (!comp) return null;

      const home = comp.competitors?.find(c => c.homeAway === 'home');
      const away = comp.competitors?.find(c => c.homeAway === 'away');
      const statusName = comp.status?.type?.name || 'STATUS_SCHEDULED';
      const status = mapESPNStatus(statusName);
      const isStarted = status === 'live' || status === 'finished';

      const roundText = comp.type?.text || event.season?.type?.text || '';
      const roundSlug = comp.type?.abbreviation || roundText;

      return {
        espn_id: event.id,
        home_team_en: home?.team?.displayName || home?.team?.name || '',
        away_team_en: away?.team?.displayName || away?.team?.name || '',
        home_team_es: normalizeTeamName(home?.team?.displayName || ''),
        away_team_es: normalizeTeamName(away?.team?.displayName || ''),
        home_score: isStarted ? (parseInt(home?.score) ?? null) : null,
        away_score: isStarted ? (parseInt(away?.score) ?? null) : null,
        status,
        home_flag_url: home?.team?.flag || null,
        away_flag_url: away?.team?.flag || null,
        match_time: comp.startDate || comp.date || event.date,
        stage: mapESPNStage(roundSlug),
        clock: comp.status?.displayClock || '',
        period: comp.status?.period || 0,
      };
    }).filter(Boolean);

    return liveMatches;
  } catch (e) {
    console.warn('[LiveAPI] ESPN fetch failed:', e.message);
    return null;
  }
}

/**
 * Merges live ESPN data into our local matches array.
 * Matches are identified by comparing team names (Spanish).
 */
export function mergeLiveData(localMatches, liveMatches) {
  if (!liveMatches?.length) return localMatches;

  return localMatches.map(local => {
    const homeName = local.home_team?.toLowerCase().trim();
    const awayName = local.away_team?.toLowerCase().trim();
    
    let inverted = false;
    const live = liveMatches.find(l => {
      const lh = l.home_team_es?.toLowerCase().trim();
      const la = l.away_team_es?.toLowerCase().trim();
      const lhEn = l.home_team_en?.toLowerCase().trim();
      const laEn = l.away_team_en?.toLowerCase().trim();

      if ((lh === homeName && la === awayName) || (lhEn === homeName && laEn === awayName)) {
        inverted = false;
        return true;
      }
      if ((lh === awayName && la === homeName) || (lhEn === awayName && laEn === homeName)) {
        inverted = true;
        return true;
      }
      return false;
    });

    if (!live) return local;

    const liveHomeScore = inverted ? live.away_score : live.home_score;
    const liveAwayScore = inverted ? live.home_score : live.away_score;

    return {
      ...local,
      home_score: liveHomeScore ?? local.home_score,
      away_score: liveAwayScore ?? local.away_score,
      status: live.status !== 'scheduled' ? live.status : local.status,
      live_clock: live.clock,
      live_period: live.period,
      espn_id: live.espn_id,
    };
  });
}

/**
 * Fetches detailed match statistics from ESPN for a specific match.
 * Finds the event by matching Spanish team names from the scoreboard,
 * then fetches the event summary to get possession, shots, cards, goals.
 * @param {string} homeTeamEs  - Home team name in Spanish (as stored in DB)
 * @param {string} awayTeamEs  - Away team name in Spanish (as stored in DB)
 * @returns {object|null}      - Match stats object or null on failure
 */
export async function fetchESPNMatchStats(homeTeamEs, awayTeamEs) {
  try {
    // Step 1: Fetch scoreboard to find the ESPN event ID
    const boardRes = await fetch(ESPN_URL, {
      signal: AbortSignal.timeout(6000),
      headers: { 'Accept': 'application/json' },
    });
    if (!boardRes.ok) return null;
    const boardData = await boardRes.json();
    const events = boardData.events || [];

    const homeNorm = homeTeamEs?.toLowerCase().trim();
    const awayNorm = awayTeamEs?.toLowerCase().trim();

    const matchedEvent = events.find(ev => {
      const comp = ev.competitions?.[0];
      if (!comp) return false;
      const home = comp.competitors?.find(c => c.homeAway === 'home');
      const away = comp.competitors?.find(c => c.homeAway === 'away');
      const homeEs = normalizeTeamName(home?.team?.displayName || '').toLowerCase().trim();
      const awayEs = normalizeTeamName(away?.team?.displayName || '').toLowerCase().trim();
      return (homeEs === homeNorm && awayEs === awayNorm) ||
             (homeEs === awayNorm && awayEs === homeNorm);
    });

    if (!matchedEvent) return null;
    const eventId = matchedEvent.id;

    // Step 2: Fetch event summary for full stats
    const summaryRes = await fetch(`${ESPN_SUMMARY_URL}?event=${eventId}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'Accept': 'application/json' },
    });
    if (!summaryRes.ok) return null;
    const summary = await summaryRes.json();

    const comp = summary.header?.competitions?.[0];
    const homeComp = comp?.competitors?.find(c => c.homeAway === 'home');
    const awayComp = comp?.competitors?.find(c => c.homeAway === 'away');

    // Parse team statistics
    const teamStats = summary.boxscore?.teamStats || [];
    const homeStats = teamStats.find(t => t.homeAway === 'home')?.stats || [];
    const awayStats = teamStats.find(t => t.homeAway === 'away')?.stats || [];

    const getStat = (statsArr, name) => {
      const item = statsArr.find(s =>
        s.name?.toLowerCase().includes(name.toLowerCase()) ||
        s.abbreviation?.toLowerCase().includes(name.toLowerCase())
      );
      return item?.displayValue ?? item?.value ?? null;
    };

    // Parse goal scorers from keyPlays or drives
    const keyEvents = summary.keyEvents || summary.plays || [];
    const goals = keyEvents
      .filter(e => e.type?.id === '60' || e.scoringPlay === true || e.text?.toLowerCase().includes('goal'))
      .map(e => ({
        team: e.team?.displayName ? normalizeTeamName(e.team.displayName) : null,
        player: e.participants?.[0]?.athlete?.displayName || e.athleteId1Name || null,
        clock: e.clock?.displayValue || e.period?.number ? `${e.period?.number || ''}' ${e.clock?.displayValue || ''}`.trim() : null,
        type: e.type?.text || 'Gol',
      }))
      .filter(g => g.player || g.team);

    return {
      eventId,
      homeTeam: normalizeTeamName(homeComp?.team?.displayName || homeTeamEs),
      awayTeam: normalizeTeamName(awayComp?.team?.displayName || awayTeamEs),
      // Possession
      homePossession: getStat(homeStats, 'possession') || getStat(homeStats, 'poss'),
      awayPossession: getStat(awayStats, 'possession') || getStat(awayStats, 'poss'),
      // Shots
      homeShotsOn: getStat(homeStats, 'shotsOnTarget') || getStat(homeStats, 'shot'),
      awayShotsOn: getStat(awayStats, 'shotsOnTarget') || getStat(awayStats, 'shot'),
      homeShotsTotal: getStat(homeStats, 'totalShots') || getStat(homeStats, 'shots'),
      awayShotsTotal: getStat(awayStats, 'totalShots') || getStat(awayStats, 'shots'),
      // Fouls & cards
      homeFouls: getStat(homeStats, 'fouls'),
      awayFouls: getStat(awayStats, 'fouls'),
      homeYellows: getStat(homeStats, 'yellowCard') || getStat(homeStats, 'yellow'),
      awayYellows: getStat(awayStats, 'yellowCard') || getStat(awayStats, 'yellow'),
      homeReds: getStat(homeStats, 'redCard') || getStat(homeStats, 'red'),
      awayReds: getStat(awayStats, 'redCard') || getStat(awayStats, 'red'),
      // Corners & offsides
      homeCorners: getStat(homeStats, 'corners'),
      awayCorners: getStat(awayStats, 'corners'),
      homeOffsides: getStat(homeStats, 'offsides'),
      awayOffsides: getStat(awayStats, 'offsides'),
      // Goals
      goals,
    };
  } catch (e) {
    console.warn('[LiveAPI] fetchESPNMatchStats failed:', e.message);
    return null;
  }
}

