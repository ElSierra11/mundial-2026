import React, { useState, useMemo } from 'react';
import { Clock, Lock, Radio, Trophy, MapPin, Sparkles, Check } from 'lucide-react';

// ─── Team Row ──────────────────────────────────────────────────────────────────
function TeamRow({ name, flag, score, winner, tbd, isSimulating, isSimWinner, onClick }) {
  const isClickable = isSimulating && !tbd;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`flex items-center gap-2 px-2.5 py-1.5 transition-all
        ${winner ? 'bg-brand-accent/8' : ''}
        ${isSimWinner ? 'bg-brand-gold/10 border-l-2 border-brand-gold' : ''}
        ${isClickable ? 'cursor-pointer hover:bg-slate-800/40 active:bg-slate-800/60' : ''}
      `}
    >
      {tbd ? (
        <div className="w-5 h-3.5 flex-shrink-0 rounded bg-slate-800 border border-dashed border-slate-700" />
      ) : (
        <img
          src={flag}
          alt={name}
          className="w-5 h-3.5 object-cover rounded flex-shrink-0 border border-slate-800/60"
          onError={e => { e.target.style.visibility = 'hidden'; }}
        />
      )}
      <span className={`text-[11px] font-bold truncate flex-1
        ${tbd ? 'text-slate-750 italic' : isSimWinner ? 'text-brand-gold font-black' : winner ? 'text-brand-accent' : 'text-slate-300'}
      `}>
        {tbd ? '?' : (name || '?')}
      </span>

      {isSimWinner && <Check className="w-3.5 h-3.5 text-brand-gold flex-shrink-0" />}

      {!isSimulating && !tbd && score !== null && score !== undefined && (
        <span className={`text-sm font-black tabular-nums min-w-[16px] text-right ${winner ? 'text-brand-accent' : 'text-slate-500'}`}>
          {score}
        </span>
      )}
    </div>
  );
}


// ─── Individual Match Card ─────────────────────────────────────────────────────
function BracketCard({ match, pred, isSimulating, simWinner, onSelectWinner }) {
  if (!match) {
    return (
      <div className="w-44 h-28 flex items-center justify-center rounded-xl border border-dashed border-slate-800/30 bg-slate-950/20 px-3 py-2.5 opacity-25 text-center text-[10px] text-slate-700 italic">
        Por definir
      </div>
    );
  }

  const isLive    = match.status === 'live';
  const isDone    = match.status === 'finished';
  const homeTBD   = !match.home_team || match.home_team === 'TBD';
  const awayTBD   = !match.away_team || match.away_team === 'TBD';
  const homeWins  = isDone && match.home_score > match.away_score;
  const awayWins  = isDone && match.away_score > match.home_score;

  return (
    <div className={`w-44 h-28 flex flex-col justify-between rounded-xl border overflow-hidden shadow-lg transition-all
      ${isSimulating ? simWinner ? 'border-brand-gold/60 shadow-brand-gold/5' : 'border-slate-800/80 hover:border-brand-gold/30' : ''}
      ${!isSimulating && isLive ? 'border-red-500/60 shadow-red-900/20 ring-1 ring-red-500/20' : ''}
      ${!isSimulating && isDone ? 'border-slate-800/80' : ''}
      ${!isSimulating && !isLive && !isDone ? 'border-slate-800/60 hover:border-slate-700/80' : ''}
      bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-sm
    `}>
      {/* Live badge / Simulator header */}
      {isSimulating ? (
        <div className="flex items-center justify-between px-2.5 py-1 bg-slate-950/80 border-b border-slate-900/50">
          <span className="text-[7.5px] text-brand-gold font-extrabold uppercase tracking-widest">
            Simulador
          </span>
          <span className="text-[7px] text-slate-550">Haz clic para avanzar</span>
        </div>
      ) : isLive ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-950/60 border-b border-red-900/40">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[8px] text-red-400 font-black uppercase tracking-widest">
            En Vivo {match.live_clock ? `· ${match.live_clock}` : ''}
          </span>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col justify-center">
        <TeamRow
          name={match.home_team}
          flag={match.home_flag_url}
          score={match.home_score}
          winner={homeWins}
          tbd={homeTBD}
          isSimulating={isSimulating}
          isSimWinner={isSimulating && simWinner === 'home'}
          onClick={() => onSelectWinner && onSelectWinner(match.id, 'home')}
        />
        <div className="h-px bg-slate-800/50 mx-2.5" />
        <TeamRow
          name={match.away_team}
          flag={match.away_flag_url}
          score={match.away_score}
          winner={awayWins}
          tbd={awayTBD}
          isSimulating={isSimulating}
          isSimWinner={isSimulating && simWinner === 'away'}
          onClick={() => onSelectWinner && onSelectWinner(match.id, 'away')}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800/50 px-2.5 py-1 bg-slate-950/50 flex items-center gap-1 min-h-[22px]">
        {isSimulating ? (
          <span className="text-[8px] text-slate-500 font-medium">
            {simWinner ? '¡Ganador elegido!' : 'Sin definir'}
          </span>
        ) : pred ? (
          <>
            <Lock className="w-2.5 h-2.5 text-brand-purple/60 flex-shrink-0" />
            <span className="text-[9px] text-brand-purple/80 font-semibold">
              {pred.home_prediction} - {pred.away_prediction}
              {pred.points_earned !== null && pred.points_earned !== undefined && (
                <span className="ml-1 text-brand-accent">· {pred.points_earned}pts</span>
              )}
            </span>
          </>
        ) : !isDone && !homeTBD ? (
          <>
            <Clock className="w-2.5 h-2.5 text-slate-700 flex-shrink-0" />
            <span className="text-[9px] text-slate-600">
              {new Date(match.match_time).toLocaleDateString('es-CO', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                timeZone: 'America/Bogota'
              })}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}


// ─── Connector Lines ───────────────────────────────────────────────────────────
function Connectors({ count, side = 'right' }) {
  const pairs = Math.floor(count / 2);
  const borderR = side === 'right' ? 'border-r' : 'border-l';
  const roundTR = side === 'right' ? 'rounded-tr-lg' : 'rounded-tl-lg';
  const roundBR = side === 'right' ? 'rounded-br-lg' : 'rounded-bl-lg';

  return (
    <div className="flex flex-col justify-around" style={{ width: 16, alignSelf: 'stretch' }}>
      {Array.from({ length: pairs }).map((_, i) => (
        <React.Fragment key={i}>
          <div className={`flex-1 ${borderR} border-t border-slate-700/30 ${roundTR}`} />
          <div className={`flex-1 ${borderR} border-b border-slate-700/30 ${roundBR}`} />
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Round Column ──────────────────────────────────────────────────────────────
function RoundColumn({ title, matches, predictions, highlight, isSimulating, simWinners, onSelectWinner }) {
  return (
    <div className="flex flex-col" style={{ minWidth: 176 }}>
      <div className={`text-center text-[9px] font-black uppercase tracking-widest mb-3 pb-2 border-b ${highlight ? 'text-yellow-500 border-yellow-600/30' : 'text-slate-500 border-slate-800/50'}`}>
        {title}
      </div>
      <div className="flex flex-col flex-1 justify-around gap-2">
        {matches.map((m, i) => (
          <div key={m?.id ?? i} className="flex justify-center">
            <BracketCard
              match={m}
              pred={m ? predictions?.find(p => p.match_id === m.id) : null}
              isSimulating={isSimulating}
              simWinner={m ? simWinners[m.id] : null}
              onSelectWinner={onSelectWinner}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── Helper ────────────────────────────────────────────────────────────────────
const pad = (arr, n) => {
  const a = [...arr];
  while (a.length < n) a.push(null);
  return a;
};

// Clean string comparison to prevent accent or space mismatches
const norm = str => {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

export default function BracketView({ matches, predictions, lastSync }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simWinners, setSimWinners] = useState({}); // { matchId: 'home' | 'away' }

  // Official FIFA 2026 Bracket Order from top to bottom
  const r32Layout = [
    ["alemania", "paraguay"],
    ["francia", "suecia"],
    ["canada", "sudafrica"],
    ["paisesbajos", "marruecos"],
    ["portugal", "croacia"],
    ["espana", "austria"],
    ["eeuu", "bosniayherz"],
    ["belgica", "senegal"],
    ["brasil", "japon"],
    ["noruega", "costademarfil"],
    ["mexico", "ecuador"],
    ["inglaterra", "rdcongo"],
    ["argentina", "caboverde"],
    ["australia", "egipto"],
    ["suiza", "argelia"],
    ["colombia", "ghana"]
  ];

  const octavosLayout = [
    ["paraguay", "francia"],
    ["canada", "marruecos"],
    ["portugal", "espana"],
    ["eeuu", "belgica"],
    ["brasil", "noruega"],
    ["mexico", "inglaterra"],
    ["argentinacaboverde", "australiaegipto"],
    ["suiza", "colombiaghana"]
  ];

  // ─── Bracket Traversal and Simulation Logic ───
  const effectiveMatches = useMemo(() => {
    // Start with a map of matches by ID
    const matchMap = {};
    matches.forEach(m => {
      matchMap[m.id] = { ...m };
    });

    const getWinnerTeam = (mid) => {
      const m = matchMap[mid];
      if (!m) return null;
      if (m.status === 'finished') {
        return m.home_score > m.away_score 
          ? { name: m.home_team, flag: m.home_flag_url } 
          : { name: m.away_team, flag: m.away_flag_url };
      }
      if (isSimulating) {
        const choice = simWinners[mid];
        if (choice === 'home' && m.home_team && m.home_team !== 'TBD') {
          return { name: m.home_team, flag: m.home_flag_url };
        }
        if (choice === 'away' && m.away_team && m.away_team !== 'TBD') {
          return { name: m.away_team, flag: m.away_flag_url };
        }
      }
      return null;
    };

    const getLoserTeam = (mid) => {
      const m = matchMap[mid];
      if (!m) return null;
      if (m.status === 'finished') {
        return m.home_score > m.away_score 
          ? { name: m.away_team, flag: m.away_flag_url } 
          : { name: m.home_team, flag: m.home_flag_url };
      }
      if (isSimulating) {
        const choice = simWinners[mid];
        if (choice === 'home' && m.away_team && m.away_team !== 'TBD') {
          return { name: m.away_team, flag: m.away_flag_url };
        }
        if (choice === 'away' && m.home_team && m.home_team !== 'TBD') {
          return { name: m.home_team, flag: m.home_flag_url };
        }
      }
      return null;
    };

    // Octavos (17 to 24)
    const octavosMapping = {
      17: [1, 2],
      18: [3, 4],
      19: [5, 6],
      20: [7, 8],
      21: [12, 11],
      22: [9, 10],
      23: [15, 14],
      24: [13, 16]
    };

    Object.entries(octavosMapping).forEach(([oid, [hId, aId]]) => {
      const octMatch = matchMap[oid];
      if (octMatch) {
        const homeW = getWinnerTeam(hId);
        const awayW = getWinnerTeam(aId);
        if (homeW) {
          octMatch.home_team = homeW.name;
          octMatch.home_flag_url = homeW.flag;
        }
        if (awayW) {
          octMatch.away_team = awayW.name;
          octMatch.away_flag_url = awayW.flag;
        }
      }
    });

    // Cuartos (25 to 28)
    const cuartosMapping = {
      25: [17, 18],
      26: [19, 20],
      27: [21, 22],
      28: [23, 24]
    };

    Object.entries(cuartosMapping).forEach(([cid, [hId, aId]]) => {
      const cuMatch = matchMap[cid];
      if (cuMatch) {
        const homeW = getWinnerTeam(hId);
        const awayW = getWinnerTeam(aId);
        if (homeW) {
          cuMatch.home_team = homeW.name;
          cuMatch.home_flag_url = homeW.flag;
        }
        if (awayW) {
          cuMatch.away_team = awayW.name;
          cuMatch.away_flag_url = awayW.flag;
        }
      }
    });

    // Semis (29 and 30)
    const semisMapping = {
      29: [25, 26],
      30: [27, 28]
    };

    Object.entries(semisMapping).forEach(([sid, [hId, aId]]) => {
      const seMatch = matchMap[sid];
      if (seMatch) {
        const homeW = getWinnerTeam(hId);
        const awayW = getWinnerTeam(aId);
        if (homeW) {
          seMatch.home_team = homeW.name;
          seMatch.home_flag_url = homeW.flag;
        }
        if (awayW) {
          seMatch.away_team = awayW.name;
          seMatch.away_flag_url = awayW.flag;
        }
      }
    });

    // Final (32) and 3er Puesto (31)
    const finalMatch = matchMap[32];
    if (finalMatch) {
      const homeW = getWinnerTeam(29);
      const awayW = getWinnerTeam(30);
      if (homeW) {
        finalMatch.home_team = homeW.name;
        finalMatch.home_flag_url = homeW.flag;
      }
      if (awayW) {
        finalMatch.away_team = awayW.name;
        finalMatch.away_flag_url = awayW.flag;
      }
    }

    const thirdMatch = matchMap[31];
    if (thirdMatch) {
      const homeL = getLoserTeam(29);
      const awayL = getLoserTeam(30);
      if (homeL) {
        thirdMatch.home_team = homeL.name;
        thirdMatch.home_flag_url = homeL.flag;
      }
      if (awayL) {
        thirdMatch.away_team = awayL.name;
        thirdMatch.away_flag_url = awayL.flag;
      }
    }

    return Object.values(matchMap);
  }, [matches, isSimulating, simWinners]);

  const handleSelectWinner = (matchId, side) => {
    if (!isSimulating) return;
    setSimWinners(prev => ({
      ...prev,
      [matchId]: side
    }));
  };

  const r32Matches = effectiveMatches.filter(m => m.stage === 'Ronda de 32');
  const sortedR32 = r32Layout.map(pair => {
    return r32Matches.find(m => {
      const h = norm(m.home_team);
      const a = norm(m.away_team);
      return (h === pair[0] && a === pair[1]) || (h === pair[1] && a === pair[0]);
    }) || null;
  });

  const octavosMatches = effectiveMatches.filter(m => m.stage === 'Octavos de Final');
  const sortedOctavos = octavosLayout.map(pair => {
    return octavosMatches.find(m => {
      const h = norm(m.home_team);
      const a = norm(m.away_team);
      return (h.includes(pair[0]) && a.includes(pair[1])) || 
             (h.includes(pair[1]) && a.includes(pair[0])) ||
             (pair[0].includes(h) && pair[1].includes(a)) ||
             (pair[1].includes(h) && pair[0].includes(a));
    }) || null;
  });

  const r32      = pad(sortedR32, 16);
  const octavos  = pad(sortedOctavos, 8);
  const cuartos  = pad(effectiveMatches.filter(m => m.stage === 'Cuartos de Final').sort((a,b) => a.id - b.id), 4);
  const semis    = pad(effectiveMatches.filter(m => m.stage === 'Semifinal').sort((a,b) => a.id - b.id), 2);
  const tercero  = effectiveMatches.filter(m => m.stage === '3er Puesto');
  const finalArr = effectiveMatches.filter(m => m.stage === 'Final');
  const finalPad = finalArr.length > 0 ? finalArr : [null];


  const hasLive = matches.some(m => m.status === 'live');

  return (
    <div className="w-full">
      {/* Live indicator */}
      {lastSync && (
        <div className="flex items-center justify-center gap-2 mb-4 text-[10px] text-slate-600">
          {hasLive ? (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 font-bold">Partidos en vivo detectados</span>
            </>
          ) : (
            <>
              <Radio className="w-3 h-3 text-slate-700" />
              <span>Sincronizado con datos en vivo · {lastSync}</span>
            </>
          )}
        </div>
      )}

      {/* Simulator Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 p-4 bg-slate-900/40 rounded-2xl border border-slate-800/80 gap-3">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-gold" />
            Simulador de Llave
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Elige ganadores haciendo clic en cada equipo para simular la copa hasta la final</p>
        </div>
        <div className="flex items-center gap-2">
          {isSimulating && Object.keys(simWinners).length > 0 && (
            <button
              onClick={() => setSimWinners({})}
              className="px-2.5 py-1.5 rounded-lg border border-slate-850 hover:border-slate-800 bg-slate-950 text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-all"
            >
              Reiniciar
            </button>
          )}
          <button
            onClick={() => {
              setIsSimulating(!isSimulating);
              setSimWinners({});
            }}
            className={`py-1.5 px-4 rounded-xl text-xs font-extrabold transition-all ${
              isSimulating
                ? 'bg-brand-gold text-brand-dark shadow-md shadow-brand-gold/15'
                : 'bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            {isSimulating ? 'Desactivar Simulador' : 'Activar Simulador'}
          </button>
        </div>
      </div>

      {/* Bracket scroll container */}
      <div className="overflow-x-auto pb-6 -mx-4 px-4">
        <div className="flex gap-0 items-stretch min-w-max mx-auto" style={{ width: 'fit-content', gap: 0 }}>

          {/* ── Column 1: Round of 32 ── */}
          <RoundColumn title="Ronda de 32" matches={r32} predictions={predictions} isSimulating={isSimulating} simWinners={simWinners} onSelectWinner={handleSelectWinner} />
          <Connectors count={16} side="right" />

          {/* ── Column 2: Round of 16 ── */}
          <RoundColumn title="Octavos de Final" matches={octavos} predictions={predictions} isSimulating={isSimulating} simWinners={simWinners} onSelectWinner={handleSelectWinner} />
          <Connectors count={8} side="right" />

          {/* ── Column 3: Quarterfinals ── */}
          <RoundColumn title="Cuartos de Final" matches={cuartos} predictions={predictions} isSimulating={isSimulating} simWinners={simWinners} onSelectWinner={handleSelectWinner} />
          <Connectors count={4} side="right" />

          {/* ── Column 4: Semifinals ── */}
          <RoundColumn title="Semifinal" matches={semis} predictions={predictions} isSimulating={isSimulating} simWinners={simWinners} onSelectWinner={handleSelectWinner} />
          <Connectors count={2} side="right" />

          {/* ── Column 5: Center (Final + 3er Puesto) ── */}
          <div className="flex flex-col gap-6 justify-center" style={{ minWidth: 176 }}>
            <div>
              <div className="text-center text-[9px] font-black uppercase tracking-widest mb-3 pb-2 border-b border-brand-gold/40 text-brand-gold flex items-center justify-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>Gran Final</span>
              </div>
              <div className="flex justify-center">
                <BracketCard
                  match={finalPad[0]}
                  pred={finalPad[0] ? predictions?.find(p => p.match_id === finalPad[0].id) : null}
                  isSimulating={isSimulating}
                  simWinner={finalPad[0] ? simWinners[finalPad[0].id] : null}
                  onSelectWinner={handleSelectWinner}
                />
              </div>
            </div>

            {tercero.length > 0 && (
              <div>
                <div className="text-center text-[9px] font-black uppercase tracking-widest mb-3 pb-2 border-b border-slate-800/50 text-slate-650">
                  3er Puesto
                </div>
                <div className="flex justify-center">
                  <BracketCard
                    match={tercero[0]}
                    pred={predictions?.find(p => p.match_id === tercero[0]?.id)}
                    isSimulating={isSimulating}
                    simWinner={tercero[0] ? simWinners[tercero[0].id] : null}
                    onSelectWinner={handleSelectWinner}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      <p className="text-center text-[10px] text-slate-600 mt-2 flex items-center justify-center gap-1.5">
        <MapPin className="w-3 h-3" />
        <span>Final · 19 Jul 2026 · MetLife Stadium, New Jersey</span>
      </p>
    </div>
  );
}
