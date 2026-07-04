import React, { useState, useEffect } from 'react';
import { Save, Lock, AlertCircle, CheckCircle2, Trophy, Share2, BarChart2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../utils/api';

const parseISO = (str) => {
  if (!str) return new Date();
  if (!str.includes('Z') && !str.includes('+') && !str.match(/-\d{2}:\d{2}$/)) {
    return new Date(str + 'Z');
  }
  return new Date(str);
};

export default function MatchCard({ match, prediction, onSavePrediction }) {
  const [homePred, setHomePred] = useState('');
  const [awayPred, setAwayPred] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // All users' predictions (visible once match is locked)
  const [matchPredictions, setMatchPredictions] = useState(null);
  const [showPredictions, setShowPredictions] = useState(false);
  const currentUserId = api.getCurrentUser()?.id;

  // Sync state with prediction prop
  useEffect(() => {
    if (prediction) {
      setHomePred(prediction.home_prediction ?? '');
      setAwayPred(prediction.away_prediction ?? '');
    } else {
      setHomePred('');
      setAwayPred('');
    }
  }, [prediction]);

  // Live countdown timer state & logic
  const [timeLeft, setTimeLeft] = useState('');

  // 📊 Community Match Stats State
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const matchStats = await api.getMatchStats(match.id);
        setStats(matchStats);
      } catch (err) {
        console.error("Error fetching match stats:", err);
      }
    };
    fetchStats();

    // Fetch all user predictions if match is locked
    if (match.status !== 'scheduled') {
      const fetchPreds = async () => {
        try {
          const data = await api.getMatchPredictions(match.id);
          setMatchPredictions(data);
        } catch (err) {
          console.error("Error fetching match predictions:", err);
        }
      };
      fetchPreds();
    }
  }, [match.id, match.status, prediction]);


  useEffect(() => {
    if (match.status !== 'scheduled') {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const difference = parseISO(match.match_time) - new Date();
      if (difference <= 0) {
        setTimeLeft('¡Iniciando partido!');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      let formatted = 'Empieza en ';
      if (days > 0) {
        formatted += `${days}d ${hours}h`;
      } else if (hours > 0) {
        formatted += `${hours}h ${minutes}m`;
      } else {
        formatted += `${minutes}m`;
      }
      setTimeLeft(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // update every minute
    return () => clearInterval(interval);
  }, [match.match_time, match.status]);

  const isLocked = match.status !== 'scheduled';
  
  const handleSave = async () => {
    if (homePred === '' || awayPred === '') {
      setError('Ingresa ambos marcadores');
      return;
    }
    setError('');
    setSaving(true);
    setSuccess(false);
    try {
      await onSavePrediction(match.id, parseInt(homePred), parseInt(awayPred));
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = parseISO(dateStr);
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });
  };

  // Determine styles depending on prediction result
  const points = prediction?.points_earned;
  let pointsBadge = null;
  if (match.status === 'finished' && points !== undefined && points !== null) {
    if (points === 3) {
      pointsBadge = (
        <span className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-brand-gold/10 border border-brand-gold/45 text-[10px] font-bold text-brand-gold uppercase tracking-wider animate-pulse">
          <Trophy className="w-3.5 h-3.5" />
          <span>¡Marcador Exacto! +3 Pts</span>
        </span>
      );
    } else if (points === 1) {
      pointsBadge = (
        <span className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-brand-accent/15 border border-brand-accent/30 text-[10px] font-bold text-brand-accent uppercase tracking-wider">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Acertado +1 Pt</span>
        </span>
      );
    } else {
      pointsBadge = (
        <span className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Fallado +0 Pts</span>
        </span>
      );
    }
  }

  return (
    <div className={`glass glass-card-hover rounded-2xl p-5 relative border border-slate-800 ${
      isLocked ? 'opacity-95' : ''
    }`}>
      {/* Top Header Card */}
      <div className="flex justify-between items-center mb-4 text-xs">
        <span className="font-semibold text-brand-gold uppercase tracking-wider">
          {match.stage}
        </span>
        <div className="flex flex-col items-end gap-1">
          <span className="text-slate-400 font-medium">
            {formatDate(match.match_time)}
          </span>
          {timeLeft && (
            <span className="text-[9px] text-brand-gold font-bold px-1.5 py-0.5 rounded bg-brand-gold/10 border border-brand-gold/20 animate-pulse uppercase tracking-wider">
              {timeLeft}
            </span>
          )}
        </div>
      </div>

      {/* Match core representation */}
      <div className="grid grid-cols-7 items-center gap-2 mb-4">
        {/* Home Team */}
        <div className="col-span-2 flex flex-col items-center text-center gap-2">
          <img
            src={match.home_flag_url || 'https://flagcdn.com/w160/un.png'}
            alt={match.home_team}
            className="w-12 h-8 rounded-md object-cover shadow-md border border-slate-800"
          />
          <span className="text-sm font-semibold text-slate-200 line-clamp-1">
            {match.home_team}
          </span>
        </div>

        {/* Prediction / Score Inputs */}
        <div className="col-span-3 flex justify-center items-center gap-2">
          {isLocked ? (
            // Finished or Live mode
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500 font-bold uppercase mb-1">Tú</span>
                <span className="w-8 h-8 flex items-center justify-center bg-slate-900 rounded-lg text-sm font-bold text-slate-400 border border-slate-800">
                  {prediction ? prediction.home_prediction : '-'}
                </span>
              </div>
              
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-600 font-bold uppercase mb-1.5">VS</span>
                <span className="text-xs text-slate-500 font-bold px-1">:</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs text-slate-500 font-bold uppercase mb-1">Tú</span>
                <span className="w-8 h-8 flex items-center justify-center bg-slate-900 rounded-lg text-sm font-bold text-slate-400 border border-slate-800">
                  {prediction ? prediction.away_prediction : '-'}
                </span>
              </div>
            </div>
          ) : (
            // Edit Mode inputs
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="99"
                value={homePred}
                onChange={(e) => {
                  setHomePred(e.target.value);
                  setIsEditing(true);
                }}
                disabled={isLocked}
                className="w-10 h-10 text-center bg-slate-950/80 border border-slate-800 focus:border-brand-accent/50 focus:outline-none rounded-xl text-base font-bold text-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-slate-600 font-bold text-xs">:</span>
              <input
                type="number"
                min="0"
                max="99"
                value={awayPred}
                onChange={(e) => {
                  setAwayPred(e.target.value);
                  setIsEditing(true);
                }}
                disabled={isLocked}
                className="w-10 h-10 text-center bg-slate-950/80 border border-slate-800 focus:border-brand-accent/50 focus:outline-none rounded-xl text-base font-bold text-white transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="col-span-2 flex flex-col items-center text-center gap-2">
          <img
            src={match.away_flag_url || 'https://flagcdn.com/w160/un.png'}
            alt={match.away_team}
            className="w-12 h-8 rounded-md object-cover shadow-md border border-slate-800"
          />
          <span className="text-sm font-semibold text-slate-200 line-clamp-1">
            {match.away_team}
          </span>
        </div>
      </div>

      {/* 📊 Distribución de Predicciones del Grupo */}
      {stats && stats.total_predictions > 0 && (
        <div className="mb-4 space-y-1.5 p-2.5 rounded-xl bg-slate-950/30 border border-slate-900/60">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            <span className="flex items-center gap-1"><BarChart2 className="w-3.5 h-3.5 text-brand-gold" /> Grupo</span>
            <span>{stats.total_predictions} pred. · Prom: {stats.avg_home_prediction} - {stats.avg_away_prediction}</span>
          </div>
          {/* Tri-segment progress bar */}
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex border border-slate-850">
            <div className="bg-brand-accent h-full transition-all duration-300" style={{ width: `${stats.home_win_pct}%` }} title={`Gana ${match.home_team}: ${stats.home_win_pct}%`} />
            <div className="bg-slate-700 h-full transition-all duration-300" style={{ width: `${stats.draw_pct}%` }} title={`Empate: ${stats.draw_pct}%`} />
            <div className="bg-brand-purple h-full transition-all duration-300" style={{ width: `${stats.away_win_pct}%` }} title={`Gana ${match.away_team}: ${stats.away_win_pct}%`} />
          </div>
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
            <span className="text-brand-accent">{stats.home_win_pct}% L</span>
            <span className="text-slate-500">{stats.draw_pct}% E</span>
            <span className="text-brand-purple">{stats.away_win_pct}% V</span>
          </div>
        </div>
      )}


      {/* Real Match Score representation if it has started or ended */}
      {(match.status === 'finished' || match.status === 'live') && (
        <div className="mb-4 py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${match.status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-slate-700'}`}></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {match.status === 'live' ? 'En Vivo' : 'Marcador Real'}
            </span>
          </div>
          <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
            <span>{match.home_score} - {match.away_score}</span>
            {match.home_penalties !== null && match.away_penalties !== null && (
              <span className="text-[10.5px] font-bold text-slate-400 bg-slate-900/60 py-0.5 px-1.5 rounded-md border border-slate-850">
                ({match.home_penalties} - {match.away_penalties} Pen)
              </span>
            )}
          </span>
        </div>
      )}

      {/* Action footer */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-900/50">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          {pointsBadge}
          {isLocked && !pointsBadge && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
              <Lock className="w-3.5 h-3.5" />
              <span>Predicciones cerradas</span>
            </span>
          )}
          {prediction && (
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`¡Mi pronóstico para el Mundial 2026! 🏆 ${match.home_team} ${prediction.home_prediction} - ${prediction.away_prediction} ${match.away_team}. ¿Y tú qué esperas? Compite aquí: ${window.location.origin}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 py-1 px-2 rounded bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-[9px] font-bold text-slate-400 hover:text-slate-200 transition-all rounded-md shadow-sm"
              title="Compartir pronóstico por WhatsApp"
            >
              <Share2 className="w-3 h-3 text-brand-gold" />
              <span>Compartir</span>
            </a>
          )}
          {error && <span className="text-[10px] text-red-400 flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{error}</span>}
          {success && <span className="text-[10px] text-brand-accent flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" />¡Guardado!</span>}
        </div>

        {!isLocked && (isEditing || saving) && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-brand-gold text-brand-dark hover:bg-amber-400 text-xs font-bold transition-all shadow-md shadow-brand-gold/10 animate-pulse"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        )}
      </div>

      {/* 👥 All users' predictions - visible once match is locked */}
      {isLocked && matchPredictions && matchPredictions.is_locked && matchPredictions.predictions.length > 0 && (
        <div className="mt-3 border-t border-slate-900/50 pt-3">
          <button
            onClick={() => setShowPredictions(v => !v)}
            className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider"
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand-gold" />
              Predicciones de todos ({matchPredictions.predictions.length})
            </span>
            {showPredictions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showPredictions && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-800">
              {matchPredictions.predictions.map((p) => {
                const isMe = p.user_id === currentUserId;
                const pts = p.points_earned;
                let rowColor = 'bg-slate-950/30';
                let ptsBadge = null;
                if (pts === 3) {
                  rowColor = 'bg-brand-gold/5 border border-brand-gold/20';
                  ptsBadge = <span className="text-brand-gold font-bold text-[9px]">+3 🎯</span>;
                } else if (pts === 1) {
                  rowColor = 'bg-brand-accent/5 border border-brand-accent/15';
                  ptsBadge = <span className="text-brand-accent font-bold text-[9px]">+1 ✓</span>;
                } else if (pts === 0) {
                  ptsBadge = <span className="text-slate-500 font-bold text-[9px]">+0</span>;
                }
                return (
                  <div
                    key={p.user_id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${rowColor} ${
                      isMe ? 'ring-1 ring-brand-gold/30' : ''
                    }`}
                  >
                    <img
                      src={p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.user_id}`}
                      alt={p.display_name}
                      className="w-5 h-5 rounded-full bg-slate-800 flex-shrink-0"
                    />
                    <span className={`text-[10px] font-semibold flex-1 truncate ${
                      isMe ? 'text-brand-gold' : 'text-slate-300'
                    }`}>
                      {p.display_name}{isMe ? ' (Tú)' : ''}
                    </span>
                    <span className="text-[10px] font-bold text-white bg-slate-900 px-1.5 py-0.5 rounded">
                      {p.home_prediction} - {p.away_prediction}
                    </span>
                    {ptsBadge}
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
