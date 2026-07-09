import React, { useState } from 'react';
import { Award, Flame, Zap, User, Star, Percent, ShieldCheck, HelpCircle, History, Trophy, CheckCircle2, XCircle, Clock, Bell } from 'lucide-react';
import { subscribeUserToPush } from '../utils/pushNotifications';

const COPA_TEAMS = [
  "Alemania", "Argelia", "Argentina", "Australia", "Austria", "Bélgica", "Bosnia y Herz.", "Brasil", 
  "Cabo Verde", "Canadá", "Colombia", "Costa de Marfil", "Croacia", "Ecuador", "EE. UU.", "Egipto", 
  "España", "Francia", "Ghana", "Inglaterra", "Japón", "Marruecos", "México", "Noruega", "Países Bajos", 
  "Paraguay", "Portugal", "R. D. Congo", "Senegal", "Suecia", "Suiza", "Sudáfrica"
].sort();

const TEAM_FLAGS = {
  "Alemania": "de", "Argelia": "dz", "Argentina": "ar", "Australia": "au", "Austria": "at", 
  "Bélgica": "be", "Bosnia y Herz.": "ba", "Brasil": "br", "Cabo Verde": "cv", "Canadá": "ca", 
  "Colombia": "co", "Costa de Marfil": "ci", "Croacia": "hr", "Ecuador": "ec", "EE. UU.": "us", 
  "Egipto": "eg", "España": "es", "Francia": "fr", "Ghana": "gh", "Inglaterra": "gb", 
  "Japón": "jp", "Marruecos": "ma", "México": "mx", "Noruega": "no", "Países Bajos": "nl", 
  "Paraguay": "py", "Portugal": "pt", "R. D. Congo": "cd", "Senegal": "sn", "Suecia": "se", 
  "Suiza": "ch", "Sudáfrica": "za"
};

const getTeamFlag = (teamName) => {
  if (!teamName) return null;
  const code = TEAM_FLAGS[teamName];
  if (!code) return null;
  return `https://flagcdn.com/w160/${code}.png`;
};


export default function ProfileView({ user, predictions, matches, onUpdateProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [password, setPassword] = useState('');
  
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const handleToggleNotifications = async () => {
    if (typeof Notification === 'undefined') {
      alert("Tu dispositivo o navegador no soporta notificaciones nativas.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      
      if (permission === 'granted') {
        // Subscribe to real push notifications and trigger test notification
        await subscribeUserToPush();
      } else if (permission === 'denied') {
        alert("Permiso denegado. Si quieres recibir alertas, por favor habilita los permisos de notificación de la página en tu navegador.");
      }
    } catch (err) {
      console.error("Error setting up push notifications:", err);
      alert("Error al activar las notificaciones push: " + err.message);
    }
  };
  
  // Extract seed from dicebear url if possible, otherwise fallback to display name
  const getInitialSeed = () => {
    if (user?.avatar_url && user.avatar_url.includes('seed=')) {
      return user.avatar_url.split('seed=')[1];
    }
    return user?.display_name || 'guest';
  };
  
  const [avatarSeed, setAvatarSeed] = useState(getInitialSeed());
  const [favoriteTeam, setFavoriteTeam] = useState(user?.favorite_team || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('El nombre de pantalla no puede estar vacío');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const seed = avatarSeed.trim() || displayName.trim();
    const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;

    const data = {
      display_name: displayName.trim(),
      avatar_url: avatarUrl,
      favorite_team: favoriteTeam
    };

    if (password.trim() !== '') {
      data.password = password.trim();
    }

    try {
      await onUpdateProfile(data);
      setSuccess('¡Perfil actualizado con éxito! ✨');
      setPassword('');
      setTimeout(() => {
        setIsEditing(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };
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

  const circ = 2 * Math.PI * 38; // ~238.76

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
    },
    {
      id: 'favorite_selected',
      name: 'Hincha Oficial',
      desc: 'Seleccionaste tu selección favorita del mundial',
      earned: !!user?.favorite_team,
      icon: <Star className="w-6 h-6 text-indigo-400" />,
      bg: 'bg-indigo-500/10 border-indigo-500/25'
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="glass-pitch-glow border-gold-glow rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="absolute right-0 top-0 w-48 h-48 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-10 bottom-0 w-32 h-32 bg-brand-purple/5 rounded-full blur-2xl pointer-events-none"></div>

        <img
          src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
          alt={user?.display_name}
          className="w-24 h-24 rounded-full border-2 border-brand-gold bg-slate-950 p-1 shadow-lg shadow-brand-gold/10"
        />

        <div className="text-center md:text-left flex-1 space-y-1 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">{user?.display_name}</h2>
                {user?.favorite_team && (
                  <img
                    src={getTeamFlag(user.favorite_team)}
                    alt={user.favorite_team}
                    className="w-7 h-5 object-cover rounded shadow border border-slate-850"
                    title={`Hincha de ${user.favorite_team}`}
                  />
                )}
              </div>
              <p className="text-xs text-slate-400 font-semibold">{user?.email}</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="py-1.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 transition-all self-center sm:self-auto shrink-0 shadow-md"
            >
              {isEditing ? 'Cancelar Edición' : 'Editar Perfil'}
            </button>
          </div>
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

      {/* Profile Edit Card */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="glass rounded-3xl p-6 border border-brand-gold/20 space-y-4 animate-[fadeIn_0.2s_ease-out]">
          <h3 className="text-xs font-bold text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
            <span>Modificar Datos Personales</span>
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre o apodo</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Ingresa tu nuevo nombre"
                className="w-full bg-[#0a0d14] text-slate-150 placeholder:text-slate-650 rounded-xl px-4 py-2.5 text-xs border border-slate-850/80 focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/25 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Avatar (Semilla de dibujo)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={avatarSeed}
                  onChange={e => setAvatarSeed(e.target.value)}
                  placeholder="Ej: messi, ronaldo..."
                  className="flex-1 bg-[#0a0d14] text-slate-150 placeholder:text-slate-650 rounded-xl px-4 py-2.5 text-xs border border-slate-850/80 focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/25 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setAvatarSeed(Math.random().toString(36).substring(7))}
                  className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-bold text-brand-gold hover:bg-slate-850 transition-colors"
                >
                  Aleatorio
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Selección Favorita ⚽</label>
              <select
                value={favoriteTeam}
                onChange={e => setFavoriteTeam(e.target.value)}
                className="w-full bg-[#0a0d14] text-slate-150 rounded-xl px-4 py-2.5 text-xs border border-slate-850/80 focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/25 outline-none transition-all"
              >
                <option value="">Ninguna</option>
                {COPA_TEAMS.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nueva contraseña (deja vacío para no cambiarla)</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full bg-[#0a0d14] text-slate-150 placeholder:text-slate-650 rounded-xl px-4 py-2.5 text-xs border border-slate-850/80 focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/25 outline-none transition-all"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
          {success && <p className="text-xs text-brand-accent font-bold animate-pulse">{success}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setError('');
                setSuccess('');
              }}
              className="py-2 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-850 text-xs font-bold text-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="py-2 px-5 rounded-xl bg-brand-gold text-brand-dark hover:bg-amber-400 text-xs font-bold transition-all shadow-md shadow-brand-gold/10"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      )}

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
        <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#0a0d14" strokeWidth="8" />
              {totalGraded === 0 ? (
                <circle cx="50" cy="50" r="38" fill="none" stroke="#1e293b" strokeWidth="8" />
              ) : (
                <>
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="8"
                    strokeDasharray={`${circ * (wrongCount / totalGraded)} ${circ}`}
                    strokeDashoffset={circ - circ * (wrongCount / totalGraded) - circ * (outcomeCount / totalGraded) - circ * (exactCount / totalGraded)}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray={`${circ * (outcomeCount / totalGraded)} ${circ}`}
                    strokeDashoffset={circ - circ * (outcomeCount / totalGraded) - circ * (exactCount / totalGraded)}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#e5c158"
                    strokeWidth="8"
                    strokeDasharray={`${circ * (exactCount / totalGraded)} ${circ}`}
                    strokeDashoffset={circ - circ * (exactCount / totalGraded)}
                  />
                </>
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-black text-white">{accuracy}%</span>
              <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Aciertos</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Desglose de Aciertos</h3>
            
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                  <span className="text-brand-gold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-gold inline-block"></span>
                    Marcador Exacto (+3 pts)
                  </span>
                  <span className="text-slate-400">{exactCount} ({exactPct}%)</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
                  <div className="bg-brand-gold h-full rounded-full" style={{ width: `${exactPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                  <span className="text-brand-accent flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-accent inline-block"></span>
                    Ganador / Empate (+1 pt)
                  </span>
                  <span className="text-slate-400">{outcomeCount} ({totalGraded > 0 ? Math.round((outcomeCount / totalGraded) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
                  <div className="bg-brand-accent h-full rounded-full" style={{ width: `${totalGraded > 0 ? Math.round((outcomeCount / totalGraded) * 100) : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-semibold mb-0.5">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-650 inline-block"></span>
                    Fallados (+0 pts)
                  </span>
                  <span className="text-slate-500">{wrongCount} ({totalGraded > 0 ? Math.round((wrongCount / totalGraded) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-900">
                  <div className="bg-slate-700 h-full rounded-full" style={{ width: `${totalGraded > 0 ? Math.round((wrongCount / totalGraded) * 100) : 0}%` }}></div>
                </div>
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

      {/* 🔔 Ajustes de Notificaciones */}
      <div className="glass p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="w-4.5 h-4.5 text-brand-gold animate-pulse" /> Ajustes de Alertas
            </h3>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Habilita notificaciones locales en tu teléfono o computadora para goles en vivo y alertas importantes.
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/20 border border-slate-900/60 text-xs">
          <div className="space-y-0.5 pr-2">
            <span className="font-bold text-slate-200 block">Notificaciones en Navegador</span>
            <span className="text-[10px] text-slate-500">Recibe goles del mundial al instante y alertas en segundo plano.</span>
          </div>
          
          <button
            onClick={handleToggleNotifications}
            className={`py-2 px-4 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border shrink-0 ${
              notifPermission === 'granted'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-brand-gold text-brand-dark hover:bg-amber-400 border-transparent shadow-lg shadow-brand-gold/15'
            }`}
          >
            {notifPermission === 'granted' ? 'Activado ✓' : 'Activar Alertas'}
          </button>
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
