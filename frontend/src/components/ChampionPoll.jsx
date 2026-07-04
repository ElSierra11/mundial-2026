import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle2, ChevronDown, ChevronUp, Users } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Teams still in the tournament (Octavos de Final onwards)
const ACTIVE_TEAMS = [
  { name: 'Argentina', flag: 'ar' },
  { name: 'Canadá', flag: 'ca' },
  { name: 'Marruecos', flag: 'ma' },
  { name: 'Paraguay', flag: 'py' },
  { name: 'Francia', flag: 'fr' },
  { name: 'Brasil', flag: 'br' },
  { name: 'Noruega', flag: 'no' },
  { name: 'México', flag: 'mx' },
  { name: 'Inglaterra', flag: 'gb' },
  { name: 'Portugal', flag: 'pt' },
  { name: 'España', flag: 'es' },
  { name: 'EE. UU.', flag: 'us' },
  { name: 'Bélgica', flag: 'be' },
  { name: 'Australia', flag: 'au' },
  { name: 'Suiza', flag: 'ch' },
  { name: 'Colombia', flag: 'co' },
];

function getFlagUrl(code) {
  return `https://flagcdn.com/w80/${code}.png`;
}

async function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error('Error en la solicitud');
  return res.json();
}

export default function ChampionPoll() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [hoveredTeam, setHoveredTeam] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const loadVotes = async () => {
    try {
      const result = await authFetch(`${API_BASE}/api/champion-votes`);
      setData(result);
    } catch (err) {
      console.error('Error loading champion votes:', err);
      // Fail silently for rendering, but help debug
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVotes();
  }, []);

  const handleVote = async (teamName) => {
    setVoting(true);
    try {
      await authFetch(`${API_BASE}/api/champion-vote`, {
        method: 'POST',
        body: JSON.stringify({ team: teamName }),
      });
      await loadVotes();
      setShowPicker(false);
    } catch (err) {
      console.error('Error voting:', err);
      alert('Error al registrar tu voto: ' + err.message);
    } finally {
      setVoting(false);
    }
  };

  const myVote = data?.my_vote;
  const total = data?.total_votes || 0;
  const results = data?.results || [];
  const maxVotes = results[0]?.votes || 1;

  return (
    <div className="glass rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-5 bg-gradient-to-r from-brand-gold/5 to-transparent hover:from-brand-gold/10 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-gold/15 rounded-xl border border-brand-gold/25 text-brand-gold">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-extrabold text-white tracking-tight">¿Quién gana el Mundial?</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              {total > 0 ? `${total} voto${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}` : 'Sé el primero en votar'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {myVote && (
            <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-brand-gold/10 border border-brand-gold/30">
              <img
                src={getFlagUrl(ACTIVE_TEAMS.find(t => t.name === myVote)?.flag || 'un')}
                alt={myVote}
                className="w-4 h-3 rounded-sm object-cover"
              />
              <span className="text-[9px] font-black text-brand-gold uppercase tracking-wider">{myVote}</span>
              <CheckCircle2 className="w-3 h-3 text-brand-gold" />
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Vote Button */}
          <button
            onClick={() => setShowPicker(v => !v)}
            disabled={voting}
            className={`w-full py-3 px-4 rounded-2xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
              myVote
                ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold hover:bg-brand-gold/20'
                : 'bg-brand-gold text-brand-dark hover:bg-amber-400 border-transparent shadow-lg shadow-brand-gold/20'
            }`}
          >
            <Trophy className="w-4 h-4" />
            {myVote ? `Tu voto: ${myVote} — Cambiar` : '🏆 Votar por el campeón'}
          </button>

          {/* Team Picker Grid */}
          {showPicker && (
            <div className="grid grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-900">
              {ACTIVE_TEAMS.map((team) => {
                const isSelected = myVote === team.name;
                return (
                  <button
                    key={team.name}
                    onClick={() => handleVote(team.name)}
                    disabled={voting}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-brand-gold/20 border border-brand-gold/50 ring-1 ring-brand-gold/30'
                        : 'bg-slate-900/60 border border-slate-800 hover:border-brand-gold/30 hover:bg-slate-800/60'
                    }`}
                  >
                    <img
                      src={getFlagUrl(team.flag)}
                      alt={team.name}
                      className="w-8 h-6 rounded object-cover border border-slate-700"
                    />
                    <span className="text-[8px] font-bold text-slate-300 text-center leading-tight line-clamp-1">
                      {team.name}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-brand-gold" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Results Bars */}
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-xs italic">
              Aún no hay votos. ¡Sé el primero!
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-600 pb-1 border-b border-slate-900">
                <span>Equipo</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Votos</span>
              </div>
              {results.map((r, idx) => {
                const isLeader = idx === 0;
                const isMine = r.team === myVote;
                const barWidth = Math.max(4, (r.votes / maxVotes) * 100);
                const teamData = ACTIVE_TEAMS.find(t => t.name === r.team);

                return (
                  <div
                    key={r.team}
                    className={`relative rounded-xl transition-all ${isMine ? 'ring-1 ring-brand-gold/40' : ''}`}
                    onMouseEnter={() => setHoveredTeam(r.team)}
                    onMouseLeave={() => setHoveredTeam(null)}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-950/50 border border-slate-900/80 rounded-xl">
                      {/* Rank Badge */}
                      <span className="text-[11px] font-black w-5 text-center shrink-0">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="text-slate-600">{idx + 1}</span>}
                      </span>

                      {/* Flag */}
                      <img
                        src={getFlagUrl(teamData?.flag || 'un')}
                        alt={r.team}
                        className="w-7 h-5 rounded object-cover border border-slate-800 shrink-0"
                      />

                      {/* Bar + Name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[11px] font-bold truncate ${isMine ? 'text-brand-gold' : 'text-slate-200'}`}>
                            {r.team}
                            {isMine && <span className="ml-1 text-[8px] text-brand-gold/60">✓ tú</span>}
                          </span>
                          <span className={`text-[10px] font-black ml-2 shrink-0 ${isLeader ? 'text-brand-gold' : 'text-slate-500'}`}>
                            {r.pct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isMine ? 'bg-brand-gold' : isLeader ? 'bg-brand-accent' : 'bg-slate-600'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>

                      {/* Vote count */}
                      <span className="text-[11px] font-black text-slate-500 shrink-0 w-5 text-right">
                        {r.votes}
                      </span>
                    </div>

                    {/* Voters tooltip on hover */}
                    {hoveredTeam === r.team && r.voters?.length > 0 && (
                      <div className="absolute right-2 top-full mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl p-2.5 shadow-2xl min-w-[160px]">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-2">
                          Votan por {r.team}:
                        </p>
                        <div className="space-y-1.5">
                          {r.voters.slice(0, 5).map((v, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <img
                                src={v.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${v.display_name}`}
                                alt={v.display_name}
                                className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700"
                              />
                              <span className="text-[9px] text-slate-300 font-medium truncate">{v.display_name}</span>
                            </div>
                          ))}
                          {r.voters.length > 5 && (
                            <p className="text-[8px] text-slate-600 italic">+{r.voters.length - 5} más</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
