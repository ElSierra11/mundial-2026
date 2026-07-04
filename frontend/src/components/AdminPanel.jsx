import React, { useState } from 'react';
import { Shield, RefreshCw, Check, AlertTriangle, Save, RotateCcw } from 'lucide-react';


export default function AdminPanel({ matches, onUpdateScore, onRecalculate, onResetDatabase }) {
  const [editingScores, setEditingScores] = useState({}); // {matchId: {home, away, status}}
  const [loadingMatchId, setLoadingMatchId] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleInputChange = (matchId, field, value) => {
    // If not in editingScores yet, populate it with current match values
    const current = editingScores[matchId] || {
      home: matches.find(m => m.id === matchId).home_score ?? '',
      away: matches.find(m => m.id === matchId).away_score ?? '',
      status: matches.find(m => m.id === matchId).status,
      home_team: matches.find(m => m.id === matchId).home_team,
      away_team: matches.find(m => m.id === matchId).away_team,
      home_penalties: matches.find(m => m.id === matchId).home_penalties ?? '',
      away_penalties: matches.find(m => m.id === matchId).away_penalties ?? '',
      penalties_winner: matches.find(m => m.id === matchId).penalties_winner ?? ''
    };

    setEditingScores({
      ...editingScores,
      [matchId]: {
        ...current,
        [field]: value
      }
    });
  };

  const handleSaveScore = async (matchId) => {
    const editState = editingScores[matchId];
    if (!editState) return;

    const match = matches.find(m => m.id === matchId);
    const isTBD = match?.home_team === 'TBD' || match?.away_team === 'TBD';

    if (!isTBD && editState.status === 'finished' && (editState.home === '' || editState.away === '')) {
      alert("Por favor ingresa marcadores para poder finalizar el partido.");
      return;
    }

    // Validation for knockout tie penalty winner
    const isDraw = editState.home !== '' && editState.away !== '' && parseInt(editState.home) === parseInt(editState.away);
    if (!isTBD && match.stage !== 'Fase de Grupos' && isDraw && (editState.status === 'finished' || editState.status === 'live') && !editState.penalties_winner) {
      alert("Para empates en rondas eliminatorias, debes seleccionar un ganador por penales.");
      return;
    }

    setLoadingMatchId(matchId);
    setFeedback('');
    try {
      await onUpdateScore(
        matchId, 
        editState.home !== '' ? parseInt(editState.home) : null,
        editState.away !== '' ? parseInt(editState.away) : null,
        editState.status,
        editState.home_team || null,
        editState.away_team || null,
        editState.home_penalties !== '' ? parseInt(editState.home_penalties) : null,
        editState.away_penalties !== '' ? parseInt(editState.away_penalties) : null,
        editState.penalties_winner || null
      );
      // Clean editing state for this match
      const updated = { ...editingScores };
      delete updated[matchId];
      setEditingScores(updated);
      setFeedback('Partido actualizado y puntos recalculados.');
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      alert("Error al actualizar resultado: " + err.message);
    } finally {
      setLoadingMatchId(null);
    }
  };

  const handleFullRecalculate = async () => {
    setRecalculating(true);
    setFeedback('');
    try {
      await onRecalculate();
      setFeedback('Recálculo completo de todos los usuarios finalizado.');
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      alert("Error al recalcular: " + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("¿Estás seguro de que deseas borrar todas las predicciones y reiniciar los partidos al calendario oficial del Mundial 2026?")) {
      return;
    }
    setResetting(true);
    setFeedback('');
    try {
      await onResetDatabase();
      setFeedback('Base de datos restablecida correctamente con partidos del Mundial 2026.');
      setTimeout(() => setFeedback(''), 5000);
    } catch (err) {
      alert("Error al reiniciar la base de datos: " + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="glass rounded-3xl p-6 border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-brand-purple/10 rounded-full blur-xl pointer-events-none"></div>

        <div className="flex items-center gap-4 z-10">
          <div className="p-4 bg-brand-purple/15 rounded-2xl border border-brand-purple/20 text-brand-purple">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Panel del Administrador</h2>
            <p className="text-slate-400 text-xs mt-0.5">Define los marcadores reales y actualiza el ranking</p>
          </div>
        </div>

        <div className="z-10 flex flex-wrap gap-2 self-stretch lg:self-auto">
          <button
            onClick={handleFullRecalculate}
            disabled={recalculating}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-850 hover:border-brand-purple hover:bg-slate-850 text-xs font-bold text-slate-200 transition-all shadow-md flex-1 lg:flex-none justify-center"
          >
            <RefreshCw className={`w-4 h-4 text-brand-purple ${recalculating ? 'animate-spin' : ''}`} />
            <span>{recalculating ? 'Recalculando...' : 'Recálculo General'}</span>
          </button>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-red-950/20 border border-red-900/30 hover:border-red-500 hover:bg-red-950/50 text-xs font-bold text-red-400 transition-all shadow-md flex-1 lg:flex-none justify-center"
          >
            <RotateCcw className={`w-4 h-4 text-red-500 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Reiniciando...' : 'Reiniciar Mundial 2026'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-brand-purple/10 border border-brand-purple/30 text-brand-purple text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Matches Score Editor */}
      <div className="glass rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-900/50">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Listado de Partidos Reales
          </h3>
        </div>

        <div className="divide-y divide-slate-900/50">
          {matches.map((match) => {
            const currentEdit = editingScores[match.id] || {
              home: match.home_score ?? '',
              away: match.away_score ?? '',
              status: match.status,
              home_team: match.home_team,
              away_team: match.away_team,
            };
            
            const isMatchEditing = editingScores[match.id] !== undefined;
            const isTBD = match.home_team === 'TBD' || match.away_team === 'TBD';

            return (
              <div key={match.id} className="p-5 flex flex-col gap-4 hover:bg-slate-900/10 transition-all">
                {/* Stage badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-purple/70">{match.stage}</span>
                  <span className="text-[10px] text-slate-600">{new Date(match.match_time).toLocaleDateString('es-CO', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone: 'America/Bogota' })}</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Match Info & Teams */}
                  <div className="flex-1 grid grid-cols-5 items-center gap-3">
                    <div className="col-span-2 flex items-center gap-3 text-right justify-end">
                      {isTBD ? (
                        <input
                          type="text"
                          placeholder="Equipo local"
                          value={currentEdit.home_team || ''}
                          onChange={(e) => handleInputChange(match.id, 'home_team', e.target.value)}
                          className="text-xs font-bold bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white w-28 text-right focus:outline-none focus:border-brand-purple"
                        />
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-300 truncate max-w-[100px] sm:max-w-none">{match.home_team}</span>
                          <img src={match.home_flag_url} alt="" className="w-8 h-6 rounded-sm object-cover border border-slate-900" />
                        </>
                      )}
                    </div>

                    <div className="col-span-1 text-center font-extrabold text-slate-500 text-xs">
                      VS
                    </div>

                    <div className="col-span-2 flex items-center gap-3 text-left">
                      {isTBD ? (
                        <input
                          type="text"
                          placeholder="Equipo visitante"
                          value={currentEdit.away_team || ''}
                          onChange={(e) => handleInputChange(match.id, 'away_team', e.target.value)}
                          className="text-xs font-bold bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white w-28 focus:outline-none focus:border-brand-purple"
                        />
                      ) : (
                        <>
                          <img src={match.away_flag_url} alt="" className="w-8 h-6 rounded-sm object-cover border border-slate-900" />
                          <span className="text-xs font-bold text-slate-300 truncate max-w-[100px] sm:max-w-none">{match.away_team}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {!isTBD && (
                      <div className="flex items-center gap-1 bg-slate-950 py-1.5 px-3 rounded-xl border border-slate-900">
                        <input
                          type="number"
                          placeholder="-"
                          value={currentEdit.home}
                          onChange={(e) => handleInputChange(match.id, 'home', e.target.value)}
                          className="w-10 h-7 text-center bg-transparent focus:outline-none text-sm font-black text-white"
                        />
                        <span className="text-slate-700 text-xs">-</span>
                        <input
                          type="number"
                          placeholder="-"
                          value={currentEdit.away}
                          onChange={(e) => handleInputChange(match.id, 'away', e.target.value)}
                          className="w-10 h-7 text-center bg-transparent focus:outline-none text-sm font-black text-white"
                        />
                      </div>
                    )}

                    {/* Penalty Shootout Inputs (for knockout tie matches) */}
                    {!isTBD && match.stage !== 'Fase de Grupos' && currentEdit.home !== '' && currentEdit.away !== '' && parseInt(currentEdit.home) === parseInt(currentEdit.away) && (currentEdit.status === 'finished' || currentEdit.status === 'live') && (
                      <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-950/85 border border-brand-purple/20">
                        <span className="text-[8px] font-bold text-brand-purple uppercase tracking-wider">Penales</span>
                        <div className="flex items-center gap-1 py-1 px-2 rounded bg-slate-900 border border-slate-950/50">
                          <input
                            type="number"
                            placeholder="-"
                            value={currentEdit.home_penalties}
                            onChange={(e) => handleInputChange(match.id, 'home_penalties', e.target.value)}
                            className="w-8 h-6 text-center bg-transparent focus:outline-none text-xs font-extrabold text-slate-300"
                          />
                          <span className="text-slate-700 text-[10px]">-</span>
                          <input
                            type="number"
                            placeholder="-"
                            value={currentEdit.away_penalties}
                            onChange={(e) => handleInputChange(match.id, 'away_penalties', e.target.value)}
                            className="w-8 h-6 text-center bg-transparent focus:outline-none text-xs font-extrabold text-slate-300"
                          />
                        </div>
                        <select
                          value={currentEdit.penalties_winner || ''}
                          onChange={(e) => handleInputChange(match.id, 'penalties_winner', e.target.value)}
                          className="bg-slate-900 border border-slate-950/80 text-[9px] font-bold rounded px-1.5 py-0.5 text-slate-400 focus:outline-none focus:border-brand-purple"
                        >
                          <option value="">¿Ganador?</option>
                          <option value={match.home_team}>{match.home_team}</option>
                          <option value={match.away_team}>{match.away_team}</option>
                        </select>
                      </div>
                    )}

                    {/* Status Dropdown */}
                    <select
                      value={currentEdit.status}
                      onChange={(e) => handleInputChange(match.id, 'status', e.target.value)}
                      className="bg-slate-950 border border-slate-900 text-xs font-bold rounded-xl py-2 px-3 text-slate-300 focus:outline-none focus:border-brand-purple"
                    >
                      <option value="scheduled">Pendiente</option>
                      <option value="live">En Vivo</option>
                      <option value="finished">Finalizado</option>
                    </select>

                    {/* Save button */}
                    <button
                      onClick={() => handleSaveScore(match.id)}
                      disabled={loadingMatchId === match.id}
                      className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isMatchEditing
                          ? 'bg-brand-purple hover:bg-brand-purple/90 text-white shadow-md'
                          : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-850'
                      }`}
                    >
                      {loadingMatchId === match.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DB Warning note */}
      <div className="p-4 bg-yellow-950/40 border border-yellow-500/20 text-yellow-500 rounded-2xl flex gap-3 text-xs leading-relaxed">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div>
          <span className="font-bold block mb-0.5">Nota sobre la puntuación</span>
          <span>
            Al cambiar el estado de un partido a <strong>Finalizado</strong>, el sistema evaluará automáticamente las predicciones ingresadas por todos tus amigos, calculará sus respectivos aciertos exactos/parciales y actualizará sus puntuaciones totales al instante.
          </span>
        </div>
      </div>
    </div>
  );
}
