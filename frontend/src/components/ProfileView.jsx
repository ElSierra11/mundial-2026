import React from 'react';
import { Award, Flame, Zap, User, Star, Percent, ShieldCheck, HelpCircle, History, Trophy, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function ProfileView({ user, predictions, matches }) {
  // Filter predictions that have scores computed (points_earned !== null)
  const gradedPreds = predictions.filter(p => p.points_earned !== null);
  const totalGraded = gradedPreds.length;
  
  const exactCount = gradedPreds.filter(p => p.points_earned === 3).length;
  const outcomeCount = gradedPreds.filter(p => p.points_earned === 1).length;
  const wrongCount = gradedPreds.filter(p => p.points_earned === 0).length;

  const totalPredictions = predictions.length;
  
  // Accuracy percentage
  const accuracy = totalGraded > 0 
    ? Math.round(((exactCount + outcomeCount) / totalGraded) * 100) 
    : 0;

  // Exact prediction percentage
  const exactPct = totalGraded > 0
    ? Math.round((exactCount / totalGraded) * 100)
    : 0;

  // Calculate Streaks
  // First, map predictions to their respective match date to sort chronologically
  const cronPreds = gradedPreds
    .map(p => {
      const match = matches.find(m => m.id === p.match_id);
      return {
        ...p,
        matchTime: match ? new Date(match.match_time) : new Date(0)
      };
    })
    .sort((a, b) => a.matchTime - b.matchTime);

  // Maximum Streak calculation
  let maxStreak = 0;
  let currentStreak = 0;
  
  cronPreds.forEach(p => {
    if (p.points_earned > 0) {
      currentStreak += 1;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  });

  // Current active streak (counting backwards from end)
  let activeStreak = 0;
  for (let i = cronPreds.length - 1; i >= 0; i--) {
    if (cronPreds[i].points_earned > 0) {
      activeStreak += 1;
    } else {
      break;
    }
  }

  // Badges lists
  const achievements = [
    {
      id: 'first_hit',
      name: 'Primer Acierto',
      desc: 'Acertaste tu primer resultado (+1 o +3 Pts)',
      earned: gradedPreds.some(p => p.points_earned > 0),
      icon: <Zap className="w-6 h-6 text-amber-500" />,
      bg: 'bg-amber-500/10 border-amber-500/25'
    },
    {
      id: 'exact_master',
      name: 'Adivino Perfecto',
      desc: 'Acertaste al menos un marcador exacto (+3 Pts)',
      earned: exactCount > 0,
      icon: <Award className="w-6 h-6 text-brand-gold" />,
      bg: 'bg-brand-gold/10 border-brand-gold/25'
    },
    {
      id: 'hot_streak',
      name: 'Racha de Fuego',
      desc: 'Alcanzaste una racha de 3 o más aciertos seguidos',
      earned: maxStreak >= 3,
      icon: <Flame className="w-6 h-6 text-red-500" />,
      bg: 'bg-red-500/10 border-red-500/25'
    },
    {
      id: 'faithful',
      name: 'Fiel Participante',
      desc: 'Realizaste más de 10 predicciones en el mundial',
      earned: totalPredictions >= 10,
      icon: <Star className="w-6 h-6 text-purple-500" />,
      bg: 'bg-purple-500/10 border-purple-500/25'
    },
    {
      id: 'admin_badge',
      name: 'Líder Supremo',
      desc: 'Usuario Administrador de Resultados mundialistas',
      earned: !!user?.is_admin,
      icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
      bg: 'bg-emerald-500/10 border-emerald-500/25'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="glass rounded-3xl p-6 border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="absolute right-0 top-0 w-48 h-48 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-10 bottom-0 w-32 h-32 bg-brand-purple/5 rounded-full blur-2xl pointer-events-none"></div>

        <img
          src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
          alt={user?.display_name}
          className="w-24 h-24 rounded-full border-2 border-brand-gold bg-slate-950 p-1 shadow-lg shadow-brand-gold/10"
        />

        <div className="text-center md:text-left flex-1 space-y-1">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">{user?.display_name}</h2>
          <p className="text-xs text-slate-400 font-semibold">{user?.email}</p>
          <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-2">
            <span className="py-1 px-3 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold rounded-full text-xs font-bold">
              {user?.points || 0} Puntos Totales
            </span>
            {user?.is_admin && (
              <span className="py-1 px-3 bg-brand-purple/15 border border-brand-purple/20 text-brand-purple rounded-full text-xs font-bold">
                Administrador
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-5 rounded-2xl border border-slate-850 text-center space-y-1 hover:border-slate-800 transition-all">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Predicciones Hechas</span>
          <span className="text-3xl font-black text-white">{totalPredictions}</span>
          <span className="text-[9px] text-slate-400 block">Marcadores guardados</span>
        </div>

        <div className="glass p-5 rounded-2xl border border-slate-850 text-center space-y-1 hover:border-slate-800 transition-all">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Efectividad General</span>
          <span className="text-3xl font-black text-brand-gold flex items-center justify-center gap-1">
            {accuracy}
            <Percent className="w-5 h-5 text-brand-gold/75" />
          </span>
          <span className="text-[9px] text-slate-400 block">Predicciones con puntos</span>
        </div>

        <div className="glass p-5 rounded-2xl border border-slate-850 text-center space-y-1 hover:border-slate-800 transition-all">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Racha Actual</span>
          <span className="text-3xl font-black text-red-500 flex items-center justify-center gap-1.5 animate-pulse">
            {activeStreak}
            <Flame className="w-6 h-6 fill-red-650/15" />
          </span>
          <span className="text-[9px] text-slate-400 block">Aciertos consecutivos</span>
        </div>

        <div className="glass p-5 rounded-2xl border border-slate-850 text-center space-y-1 hover:border-slate-800 transition-all">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Racha Histórica</span>
          <span className="text-3xl font-black text-indigo-400 flex items-center justify-center gap-1">
            {maxStreak}
            <Zap className="w-5 h-5 text-indigo-400/80" />
          </span>
          <span className="text-[9px] text-slate-400 block">Racha máxima lograda</span>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detail Breakdown */}
        <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Desglose de Aciertos</h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-brand-gold">Marcador Exacto (+3 pts)</span>
                <span className="text-slate-300">{exactCount} de {totalGraded}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                <div className="bg-brand-gold h-full rounded-full" style={{ width: `${exactPct}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-brand-accent">Resultado / Ganador (+1 pt)</span>
                <span className="text-slate-300">{outcomeCount} de {totalGraded}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                <div className="bg-brand-accent h-full rounded-full" style={{ width: `${totalGraded > 0 ? Math.round((outcomeCount / totalGraded) * 100) : 0}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-500">Errores / Fallados (+0 pts)</span>
                <span className="text-slate-400">{wrongCount} de {totalGraded}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-850">
                <div className="bg-slate-700 h-full rounded-full" style={{ width: `${totalGraded > 0 ? Math.round((wrongCount / totalGraded) * 100) : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Medals & Achievements list */}
        <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Logros y Medallas</h3>
          <div className="grid grid-cols-1 gap-3 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  ach.earned
                    ? `${ach.bg} opacity-100`
                    : 'bg-slate-950/20 border-slate-900/60 opacity-40 select-none'
                }`}
              >
                <div className="flex-shrink-0">
                  {ach.earned ? ach.icon : <HelpCircle className="w-6 h-6 text-slate-650" />}
                </div>
                <div className="flex-1">
                  <span className={`text-xs font-bold block ${ach.earned ? 'text-white' : 'text-slate-500 line-through'}`}>
                    {ach.name}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-none">
                    {ach.desc}
                  </span>
                </div>
                {ach.earned && (
                  <span className="text-[9px] font-black uppercase text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full border border-brand-gold/20 tracking-wider">
                    Desbloqueado
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 📋 Prediction History */}
      {predictions.length > 0 && (
        <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-brand-purple" />
            Historial de Predicciones
          </h3>
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
            {[...predictions]
              .map(p => {
                const match = matches.find(m => m.id === p.match_id);
                return { ...p, match };
              })
              .filter(p => p.match)
              .sort((a, b) => new Date(b.match?.match_time) - new Date(a.match?.match_time))
              .map((p) => {
                const match = p.match;
                const pts = p.points_earned;
                const isExact = pts === 3;
                const isHit = pts === 1;
                const isMiss = pts === 0;
                const isPending = pts === null || pts === undefined;

                const rowStyle = isExact
                  ? 'border-brand-gold/30 bg-brand-gold/5'
                  : isHit
                    ? 'border-brand-accent/25 bg-brand-accent/5'
                    : isMiss
                      ? 'border-slate-800 bg-slate-950/20'
                      : 'border-slate-800/60 bg-slate-950/10';

                const ptsLabel = isExact
                  ? <span className="flex items-center gap-1 text-brand-gold font-black text-xs"><Trophy className="w-3 h-3" />+3</span>
                  : isHit
                    ? <span className="flex items-center gap-1 text-brand-accent font-black text-xs"><CheckCircle2 className="w-3 h-3" />+1</span>
                    : isMiss
                      ? <span className="flex items-center gap-1 text-slate-500 font-black text-xs"><XCircle className="w-3 h-3" />+0</span>
                      : <span className="flex items-center gap-1 text-slate-600 text-xs"><Clock className="w-3 h-3" />—</span>;

                return (
                  <div key={p.id || p.match_id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${rowStyle}`}>
                    {/* Flags */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <img src={match.home_flag_url} alt="" className="w-6 h-4 object-cover rounded-sm border border-slate-800/60" onError={e => e.target.style.display='none'} />
                      <img src={match.away_flag_url} alt="" className="w-6 h-4 object-cover rounded-sm border border-slate-800/60" onError={e => e.target.style.display='none'} />
                    </div>

                    {/* Teams */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-300 truncate">
                        {match.home_team} <span className="text-slate-600">vs</span> {match.away_team}
                      </p>
                      <p className="text-[9px] text-slate-600 font-medium">{match.stage}</p>
                    </div>

                    {/* Real Score */}
                    <div className="text-center flex-shrink-0">
                      <p className="text-[9px] text-slate-600 uppercase font-bold mb-0.5">Real</p>
                      <span className="text-xs font-black text-slate-300 tabular-nums">
                        {match.status === 'finished' ? `${match.home_score} - ${match.away_score}` : '—'}
                      </span>
                    </div>

                    {/* Your Prediction */}
                    <div className="text-center flex-shrink-0">
                      <p className="text-[9px] text-slate-600 uppercase font-bold mb-0.5">Tu Pred.</p>
                      <span className={`text-xs font-black tabular-nums ${isExact ? 'text-brand-gold' : isHit ? 'text-brand-accent' : 'text-slate-400'}`}>
                        {p.home_prediction} - {p.away_prediction}
                      </span>
                    </div>

                    {/* Points */}
                    <div className="flex-shrink-0 min-w-[32px] text-right">
                      {ptsLabel}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
