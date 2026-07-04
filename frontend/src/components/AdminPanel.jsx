import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, Check, AlertTriangle, Save, RotateCcw, Users, Trash2, Mail, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { api } from '../utils/api';


export default function AdminPanel({ matches, onUpdateScore, onRecalculate, onResetDatabase }) {
  const [editingScores, setEditingScores] = useState({}); // {matchId: {home, away, status}}
  const [loadingMatchId, setLoadingMatchId] = useState(null);
  const [recalculating, setRecalculating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);

  // Email reminder test state
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestReport, setEmailTestReport] = useState(null);
  const [showEmailReport, setShowEmailReport] = useState(false);
  const [emailDryRun, setEmailDryRun] = useState(true);
  const [emailHours, setEmailHours] = useState(24);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.adminGetUsers();
      setUsersList(data);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (userId, displayName) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente al usuario "${displayName}"? Se borrarán todos sus pronósticos y participación.`)) {
      return;
    }
    setDeletingUserId(userId);
    try {
      await api.adminDeleteUser(userId);
      setUsersList(usersList.filter(u => u.id !== userId));
      setFeedback(`Usuario "${displayName}" eliminado correctamente.`);
      setTimeout(() => setFeedback(''), 4000);
    } catch (err) {
      alert("Error al eliminar usuario: " + err.message);
    } finally {
      setDeletingUserId(null);
    }
  };

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

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleTestEmails = async () => {
    setEmailTestLoading(true);
    setEmailTestReport(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/admin/test-email-reminders?hours_ahead=${emailHours}&dry_run=${emailDryRun}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Error al llamar al endpoint');
      const data = await res.json();
      setEmailTestReport(data);
      setShowEmailReport(true);
    } catch (err) {
      alert('Error al probar correos: ' + err.message);
    } finally {
      setEmailTestLoading(false);
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

          <button
            onClick={handleTestEmails}
            disabled={emailTestLoading}
            className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30 hover:border-emerald-500 hover:bg-emerald-950/40 text-xs font-bold text-emerald-400 transition-all shadow-md flex-1 lg:flex-none justify-center"
          >
            <Mail className={`w-4 h-4 text-emerald-500 ${emailTestLoading ? 'animate-bounce' : ''}`} />
            <span>{emailTestLoading ? 'Probando...' : 'Probar Correos'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 rounded-2xl bg-brand-purple/10 border border-brand-purple/30 text-brand-purple text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Email Test Config & Report */}
      <div className="glass rounded-3xl border border-slate-800 overflow-hidden">
        <button
          onClick={() => setShowEmailReport(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider bg-slate-950/30"
        >
          <span className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            Sistema de Recordatorios por Correo
          </span>
          {showEmailReport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showEmailReport && (
          <div className="px-6 pb-6 space-y-4">
            {/* Config Row */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ventana (horas):</label>
                <input
                  type="number" min="1" max="168"
                  value={emailHours}
                  onChange={e => setEmailHours(parseInt(e.target.value) || 24)}
                  className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white text-center focus:border-brand-gold/50 outline-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setEmailDryRun(v => !v)}
                  className={`w-10 h-5 rounded-full transition-all relative ${
                    emailDryRun ? 'bg-slate-700' : 'bg-emerald-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    emailDryRun ? 'left-0.5' : 'left-5'
                  }`} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {emailDryRun
                    ? <span className="text-slate-400">Simulación (sin enviar)</span>
                    : <span className="text-emerald-400">Envío Real activado</span>
                  }
                </span>
              </label>
              <button
                onClick={handleTestEmails}
                disabled={emailTestLoading}
                className="flex items-center gap-1.5 py-1.5 px-4 rounded-xl bg-emerald-900/30 border border-emerald-700/40 hover:bg-emerald-900/50 text-xs font-bold text-emerald-300 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                {emailTestLoading ? 'Ejecutando...' : 'Ejecutar prueba'}
              </button>
            </div>

            {/* Report Results */}
            {emailTestReport && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-[10px] font-bold text-emerald-300">
                  {emailTestReport.summary}
                </div>

                {emailTestReport.reminders_sent.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">✉️ Recordatorios enviados/simulados ({emailTestReport.reminders_sent.length})</p>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {emailTestReport.reminders_sent.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] bg-emerald-950/20 border border-emerald-900/30 rounded-lg px-3 py-2">
                          <Mail className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="text-slate-300 font-semibold flex-1 truncate">{r.user}</span>
                          <span className="text-slate-500 shrink-0">{r.match}</span>
                          <span className={`shrink-0 font-bold ${
                            r.status?.includes('enviado') ? 'text-emerald-400' :
                            r.status?.includes('simulado') ? 'text-amber-400' : 'text-red-400'
                          }`}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {emailTestReport.reminders_skipped.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">⏭️ Omitidos ({emailTestReport.reminders_skipped.length})</p>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {emailTestReport.reminders_skipped.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px] bg-slate-950/40 border border-slate-900/50 rounded-lg px-3 py-1.5">
                          <span className="text-slate-500 flex-1 truncate">{r.user}</span>
                          <span className="text-slate-600 shrink-0 truncate max-w-[150px]">{r.match}</span>
                          <span className="text-slate-600 shrink-0 text-[9px] italic">{r.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* 👥 Sección de Gestión de Usuarios */}
      <div className="glass rounded-3xl border border-slate-800 overflow-hidden shadow-xl mt-6">
        <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-900/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4.5 h-4.5 text-brand-purple" />
            <span>Usuarios Registrados ({usersList.length})</span>
          </h3>
          <button
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="p-1.5 rounded-lg hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-white transition-colors"
            title="Refrescar usuarios"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-4">
          {loadingUsers && usersList.length === 0 ? (
            <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold">Cargando listado de usuarios...</span>
            </div>
          ) : usersList.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No hay usuarios registrados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {usersList.map((usr) => {
                const isSelf = api.getCurrentUser()?.id === usr.id;
                return (
                  <div
                    key={usr.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/40 border border-slate-850 hover:border-slate-800 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={usr.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
                        alt={usr.display_name}
                        className="w-9 h-9 rounded-full border border-slate-700 bg-slate-950"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-200 block truncate flex items-center gap-1.5">
                          <span>{usr.display_name || usr.email.split('@')[0]}</span>
                          {usr.is_admin && (
                            <span className="text-[8px] bg-brand-purple/15 border border-brand-purple/35 text-brand-purple font-extrabold px-1 rounded uppercase tracking-wider">
                              Admin
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate">{usr.email}</span>
                        <span className="text-[10px] text-brand-gold font-bold">{usr.points || 0} Pts</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteUser(usr.id, usr.display_name)}
                      disabled={isSelf || deletingUserId === usr.id}
                      className={`p-2 rounded-xl border border-slate-850 transition-all ${
                        isSelf
                          ? 'opacity-40 cursor-not-allowed text-slate-650'
                          : 'hover:border-red-500/30 hover:bg-red-500/10 text-slate-450 hover:text-red-400'
                      }`}
                      title={isSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar usuario'}
                    >
                      {deletingUserId === usr.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DB Warning note */}
      <div className="p-4 bg-yellow-950/40 border border-yellow-500/20 text-yellow-500 rounded-2xl flex gap-3 text-xs leading-relaxed mt-4">
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
