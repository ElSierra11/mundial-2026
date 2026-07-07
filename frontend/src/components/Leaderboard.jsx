import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Award, Sparkles, User, Crown, Medal, Plus, UserPlus, Users, Share2, Clipboard, ArrowLeft, TrendingUp, ChevronRight, Lock } from 'lucide-react';
import { api } from '../utils/api';
import ShareCardModal from './ShareCardModal';
import { playClickSound, triggerHapticFeedback } from '../utils/soundEffects';

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

export default function Leaderboard({ users, currentUser, matches = [], predictions = [] }) {
  // Navigation tabs: 'general' or 'groups'
  const [activeTab, setActiveTab] = useState('general');
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Private groups state
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupUsers, setGroupUsers] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Leaderboard Simulator States
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedScores, setSimulatedScores] = useState({});

  // Filter scheduled matches for simulation
  const scheduledMatches = useMemo(() => {
    return matches.filter(m => m.status === 'scheduled');
  }, [matches]);

  const simulatedBonusPoints = useMemo(() => {
    let bonusPoints = 0;
    Object.entries(simulatedScores).forEach(([matchIdStr, score]) => {
      const matchId = parseInt(matchIdStr);
      const homeSim = parseInt(score.home);
      const awaySim = parseInt(score.away);
      if (isNaN(homeSim) || isNaN(awaySim)) return;

      const pred = predictions.find(p => p.match_id === matchId);
      if (!pred) return;

      const pHome = pred.home_prediction;
      const pAway = pred.away_prediction;

      const simOutcome = homeSim > awaySim ? 1 : (awaySim > homeSim ? 2 : 0);
      const predOutcome = pHome > pAway ? 1 : (pAway > pHome ? 2 : 0);

      if (pHome === homeSim && pAway === awaySim) {
        bonusPoints += 3;
      } else if (simOutcome === predOutcome) {
        bonusPoints += 1;
      }
    });
    return bonusPoints;
  }, [simulatedScores, predictions]);

  const displayUsers = useMemo(() => {
    if (!isSimulating) return users;
    const bonus = simulatedBonusPoints;

    const updated = users.map(u => {
      const isMe = currentUser && (u.display_name === currentUser.display_name || u.email === currentUser.email);
      if (isMe) return { ...u, points: u.points + bonus, simulatedBonus: bonus };
      return { ...u, simulatedBonus: 0 };
    });

    const sorted = [...updated].sort((a, b) => b.points - a.points);
    let currentRank = 1;
    let prevPoints = null;
    return sorted.map((u, i) => {
      if (prevPoints !== null && u.points < prevPoints) {
        currentRank = i + 1;
      }
      prevPoints = u.points;
      return {
        ...u,
        simulatedRank: currentRank,
        rankDiff: u.rank - currentRank
      };
    });
  }, [isSimulating, simulatedBonusPoints, users, currentUser]);

  const displayGroupUsers = useMemo(() => {
    if (!isSimulating) return groupUsers;
    const bonus = simulatedBonusPoints;

    const updated = groupUsers.map(u => {
      const isMe = currentUser && (u.display_name === currentUser.display_name || u.email === currentUser.email);
      if (isMe) return { ...u, points: u.points + bonus, simulatedBonus: bonus };
      return { ...u, simulatedBonus: 0 };
    });

    const sorted = [...updated].sort((a, b) => b.points - a.points);
    let currentRank = 1;
    let prevPoints = null;
    return sorted.map((u, i) => {
      if (prevPoints !== null && u.points < prevPoints) {
        currentRank = i + 1;
      }
      prevPoints = u.points;
      return {
        ...u,
        simulatedRank: currentRank,
        rankDiff: u.rank - currentRank
      };
    });
  }, [isSimulating, simulatedBonusPoints, groupUsers, currentUser]);
  
  // Action forms state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Expanded User Predictions states
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedUserPredictions, setExpandedUserPredictions] = useState([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  const handleToggleExpand = async (userId) => {
    if (!userId) return;
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setExpandedUserPredictions([]);
      return;
    }

    setExpandedUserId(userId);
    setExpandedUserPredictions([]);
    setLoadingPredictions(true);
    try {
      const preds = await api.getOtherUserPredictions(userId);
      setExpandedUserPredictions(preds);
    } catch (err) {
      console.error("Error loading predictions:", err);
    } finally {
      setLoadingPredictions(false);
    }
  };

  // SVG Chart state
  const [showChart, setShowChart] = useState(false);

  // Fetch groups on mount or tab change
  useEffect(() => {
    if (activeTab === 'groups') {
      fetchGroups();
    }
  }, [activeTab]);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    setError('');
    try {
      const data = await api.getUserGroups();
      setGroups(data);
    } catch (err) {
      setError(err.message || 'Error al cargar grupos');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSelectGroup = async (group) => {
    setSelectedGroup(group);
    setLoadingGroups(true);
    try {
      const board = await api.getGroupLeaderboard(group.id);
      setGroupUsers(board);
    } catch (err) {
      setError(err.message || 'Error al cargar la tabla del grupo');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setError('');
    setFeedback('');
    try {
      const newG = await api.createGroup(newGroupName.trim());
      setNewGroupName('');
      setShowCreateForm(false);
      setFeedback(`¡Liga "${newG.name}" creada! Comparte el código: ${newG.code}`);
      fetchGroups();
    } catch (err) {
      setError(err.message || 'Error al crear grupo');
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setError('');
    setFeedback('');
    try {
      const joinedG = await api.joinGroup(joinCode.trim());
      setJoinCode('');
      setShowJoinForm(false);
      setFeedback(`¡Te has unido a "${joinedG.name}" exitosamente! ⚽`);
      fetchGroups();
      handleSelectGroup(joinedG);
    } catch (err) {
      setError(err.message || 'Error al unirse al grupo');
    }
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-6 h-6 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold flex items-center justify-center font-bold text-xs shadow-md shadow-brand-gold/5">
            1
          </div>
        );
      case 2:
        return (
          <div className="w-6 h-6 rounded-full bg-slate-300/10 border border-slate-300/30 text-slate-300 flex items-center justify-center font-bold text-xs">
            2
          </div>
        );
      case 3:
        return (
          <div className="w-6 h-6 rounded-full bg-amber-700/10 border border-amber-700/30 text-amber-600 flex items-center justify-center font-bold text-xs">
            3
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 flex items-center justify-center text-slate-500 font-semibold text-xs">
            {rank}
          </div>
        );
    }
  };

  // 📈 Dynamic Score Progression Chart Calculation
  const chartData = useMemo(() => {
    if (!matches || matches.length === 0 || !predictions || predictions.length === 0) return [];
    
    // Sort finished matches chronologically
    const finished = [...matches]
      .filter(m => m.status === 'finished')
      .sort((a, b) => new Date(a.match_time) - new Date(b.match_time));
      
    let cumulative = 0;
    return finished.map((m, idx) => {
      const pred = predictions.find(p => p.match_id === m.id);
      const pts = pred ? (pred.points_earned || 0) : 0;
      cumulative += pts;
      return {
        label: `${m.home_team.substring(0, 3)}-${m.away_team.substring(0, 3)}`,
        points: cumulative,
        added: pts,
        index: idx
      };
    });
  }, [matches, predictions]);

  // SVG Line Chart plotting variables
  const svgDimensions = { width: 500, height: 165 };
  const chartPath = useMemo(() => {
    const data = chartData;
    if (data.length <= 1) return '';
    const N = data.length;
    const maxVal = Math.max(...data.map(d => d.points), 5); // default min height scale of 5 pts
    const minVal = 0;
    
    const margin = { left: 40, right: 30, top: 15, bottom: 25 };
    const plotW = svgDimensions.width - margin.left - margin.right;
    const plotH = svgDimensions.height - margin.top - margin.bottom;

    return data.map((d, i) => {
      const x = margin.left + (i / (N - 1)) * plotW;
      const y = margin.top + plotH - (d.points / maxVal) * plotH;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [chartData]);

  const chartAreaPath = useMemo(() => {
    const data = chartData;
    if (data.length <= 1) return '';
    const N = data.length;
    const maxVal = Math.max(...data.map(d => d.points), 5);
    
    const margin = { left: 40, right: 30, top: 15, bottom: 25 };
    const plotW = svgDimensions.width - margin.left - margin.right;
    const plotH = svgDimensions.height - margin.top - margin.bottom;
    const baseY = margin.top + plotH;

    const pointsList = data.map((d, i) => {
      const x = margin.left + (i / (N - 1)) * plotW;
      const y = margin.top + plotH - (d.points / maxVal) * plotH;
      return `${x} ${y}`;
    });

    const startX = margin.left;
    const endX = margin.left + plotW;
    return `M ${startX} ${baseY} L ${pointsList.join(' L ')} L ${endX} ${baseY} Z`;
  }, [chartData]);

  // General tab variables
  const top3 = users.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="glass rounded-3xl p-6 border border-slate-800 flex items-center justify-between relative overflow-hidden flex-wrap gap-4">
        <div className="absolute right-0 top-0 w-36 h-36 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute left-10 bottom-0 w-24 h-24 bg-brand-purple/5 rounded-full blur-xl pointer-events-none"></div>

        <div className="flex items-center gap-4 z-10">
          <div className="p-4 bg-brand-gold/15 rounded-2xl border border-brand-gold/20 text-brand-gold animate-pulse">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Tabla de Posiciones</h2>
            <p className="text-slate-400 text-xs mt-0.5">Compite en la general o en tus ligas privadas</p>
          </div>
        </div>

        <button
          onClick={() => {
            playClickSound();
            triggerHapticFeedback(30);
            setShowShareModal(true);
          }}
          className="z-10 flex items-center gap-2 py-2.5 px-4 rounded-xl bg-brand-gold text-brand-dark hover:bg-amber-400 text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-brand-gold/10"
        >
          <Award className="w-4 h-4" />
          <span>Mi Tarjeta FUT</span>
        </button>
      </div>

      {/* Tab Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-900/60">
        <button
          onClick={() => { setActiveTab('general'); setSelectedGroup(null); }}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'general'
              ? 'bg-brand-gold text-brand-dark shadow-md shadow-brand-gold/15'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          General de Amigos
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'groups'
              ? 'bg-brand-gold text-brand-dark shadow-md shadow-brand-gold/15'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Mis Ligas Privadas
        </button>
      </div>

      {/* Global alert feedback */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Evolution Chart Dashboard Card */}
      {activeTab === 'general' && chartData.length > 1 && (
        <div className="glass rounded-3xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-brand-gold" /> Progreso de Puntos
            </span>
            <button
              onClick={() => setShowChart(!showChart)}
              className="text-[10px] font-bold text-brand-gold hover:text-amber-400 bg-brand-gold/10 hover:bg-brand-gold/20 py-1 px-2.5 rounded-lg border border-brand-gold/20 transition-all"
            >
              {showChart ? 'Ocultar Evolución' : 'Ver Evolución'}
            </button>
          </div>

          {showChart && (
            <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
              <div className="relative w-full h-[170px] bg-slate-950/40 rounded-2xl border border-slate-900/60 p-2 overflow-x-auto no-scrollbar">
                <svg className="min-w-[480px] h-full" viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e5c158" stopOpacity="0.25"/>
                      <stop offset="100%" stopColor="#e5c158" stopOpacity="0.00"/>
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="40" y1="15" x2="470" y2="15" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="40" y1="72.5" x2="470" y2="72.5" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="40" y1="130" x2="470" y2="130" stroke="#1e293b" strokeDasharray="3 3" />

                  {/* Gradient Area under line */}
                  <path d={chartAreaPath} fill="url(#goldGradient)" />

                  {/* SVG Line */}
                  <path
                    d={chartPath}
                    fill="none"
                    stroke="#e5c158"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Dots / Points on chart */}
                  {chartData.map((d, i) => {
                    const N = chartData.length;
                    const maxVal = Math.max(...chartData.map(c => c.points), 5);
                    const margin = { left: 40, right: 30, top: 15, bottom: 25 };
                    const plotW = svgDimensions.width - margin.left - margin.right;
                    const plotH = svgDimensions.height - margin.top - margin.bottom;
                    const cx = margin.left + (i / (N - 1)) * plotW;
                    const cy = margin.top + plotH - (d.points / maxVal) * plotH;

                    return (
                      <g key={i} className="group cursor-help">
                        <circle
                          cx={cx}
                          cy={cy}
                          r="4"
                          className="fill-brand-gold stroke-slate-950 stroke-2 transition-all group-hover:r-6"
                        />
                        <title>{`Partida ${d.label}: ${d.points} Pts (+${d.added})`}</title>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <p className="text-[9px] text-slate-500 text-center">Pasa el cursor por los nodos para ver el progreso de puntos de cada partido</p>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── GENERAL TAB VIEW ────────────────── */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* 🔮 Simulator Toggle Button */}
          <div className="flex justify-between items-center bg-slate-900/25 p-3 rounded-2xl border border-slate-900/60 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-slate-350 font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-brand-gold animate-pulse" />
              <span>Simulador de Clasificación:</span>
            </div>
            <button
              onClick={() => {
                playClickSound();
                triggerHapticFeedback(20);
                setIsSimulating(!isSimulating);
                if (!isSimulating) setSimulatedScores({});
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all border ${
                isSimulating
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-brand-gold text-brand-dark hover:bg-amber-400 border-transparent shadow-lg shadow-brand-gold/10'
              }`}
            >
              {isSimulating ? 'Cerrar Simulador' : 'Simular Resultados 🔮'}
            </button>
          </div>

          {/* 🔮 Simulator Controls Card */}
          {isSimulating && (
            <div className="glass rounded-3xl p-5 border border-brand-gold/20 relative overflow-hidden space-y-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <h4 className="text-sm font-extrabold text-white">Resultados de Partidos Futuros</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Ingresa marcadores simulados y mira cómo subes en la tabla según tus predicciones.</p>
              </div>

              {scheduledMatches.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No hay partidos futuros programados para simular.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {scheduledMatches.map(match => {
                    const pred = predictions.find(p => p.match_id === match.id);
                    const currentSim = simulatedScores[match.id] || { home: '', away: '' };
                    
                    return (
                      <div key={match.id} className="p-3 bg-slate-950/45 rounded-xl border border-slate-900 flex items-center justify-between gap-3 text-xs">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-semibold text-slate-300 truncate">{match.home_team} vs {match.away_team}</span>
                          <span className="text-[9px] text-slate-500 font-medium">
                            Tu predicción: {pred ? `${pred.home_prediction} - ${pred.away_prediction}` : 'Ninguna'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input
                            type="number"
                            min="0"
                            placeholder="L"
                            value={currentSim.home}
                            onChange={e => {
                              setSimulatedScores(prev => ({
                                ...prev,
                                [match.id]: { ...currentSim, home: e.target.value }
                              }));
                            }}
                            className="w-8 py-1 text-center bg-slate-900 border border-slate-800 rounded-lg text-white font-bold placeholder-slate-655"
                          />
                          <span className="text-slate-600 font-bold">-</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="V"
                            value={currentSim.away}
                            onChange={e => {
                              setSimulatedScores(prev => ({
                                ...prev,
                                [match.id]: { ...currentSim, away: e.target.value }
                              }));
                            }}
                            className="w-8 py-1 text-center bg-slate-900 border border-slate-800 rounded-lg text-white font-bold placeholder-slate-655"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 🏆 Visual Podium for Top 3 */}
          {top3.length >= 2 && (
            <div className="glass rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-brand-gold/3 to-transparent pointer-events-none" />
              <div className="text-center mb-5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">🏆 Podio del Torneo</span>
              </div>
              <div className="flex items-end justify-center gap-4">
                {podiumOrder.map((user, idx) => {
                  if (!user) return null;
                  const config = [
                    { ring: 'ring-slate-400', bg: 'from-slate-500/20 to-slate-600/5', text: 'text-slate-300', label: '2°', barH: 'h-20', medal: 'bg-slate-500/20 border-slate-500/40 text-slate-300', crownColor: 'text-slate-400' },
                    { ring: 'ring-brand-gold', bg: 'from-brand-gold/30 to-brand-gold/5', text: 'text-brand-gold', label: '1°', barH: 'h-28', medal: 'bg-brand-gold/15 border-brand-gold/40 text-brand-gold', crownColor: 'text-brand-gold' },
                    { ring: 'ring-amber-700', bg: 'from-amber-800/20 to-amber-900/5', text: 'text-amber-600', label: '3°', barH: 'h-14', medal: 'bg-amber-800/15 border-amber-700/40 text-amber-600', crownColor: 'text-amber-700' },
                  ][idx];
                  if (!config) return null;
                  return (
                    <div key={user.display_name} className="flex flex-col items-center gap-2 flex-1 max-w-[120px]">
                      {idx === 1 && <Crown className={`w-5 h-5 ${config.crownColor} mb-1 animate-bounce`} />}
                      <div className="relative">
                        <img
                          src={user.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
                          alt={user.display_name}
                          className={`w-14 h-14 rounded-full border-2 ${config.ring} ring-2 ring-offset-2 ring-offset-slate-950 bg-slate-950 object-cover shadow-lg`}
                        />
                        <span className={`absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded-full border ${config.medal}`}>{config.label}</span>
                      </div>
                      <span className={`text-xs font-bold text-center leading-tight ${config.text} truncate w-full text-center`}>{user.display_name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{user.points} pts</span>
                      <div className={`w-full ${config.barH} bg-gradient-to-t ${config.bg} border-t-2 ${config.ring} rounded-t-xl flex items-center justify-center`}>
                        <span className={`text-lg font-black ${config.text}`}>{config.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leaderboard Table List */}
          <div className="glass rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            {users.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Aún no hay usuarios en la tabla.</p>
                <p className="text-xs text-slate-600 mt-1">Regístrate y realiza predicciones para aparecer aquí.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-900/60">
                <div className="grid grid-cols-12 px-6 py-4 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <div className="col-span-2 text-center">Pos</div>
                  <div className="col-span-7 pl-2">Usuario</div>
                  <div className="col-span-3 text-right">Puntos</div>
                </div>

                {displayUsers.map((item, index) => {
                  const isMe = currentUser && (currentUser.display_name === item.display_name || currentUser.email === item.email);
                  const isExpanded = expandedUserId === item.id;
                  const itemRank = isSimulating ? item.simulatedRank : item.rank;
                  return (
                    <React.Fragment key={index}>
                      <div
                        onClick={() => handleToggleExpand(item.id)}
                        className={`grid grid-cols-12 px-6 py-3.5 items-center transition-all cursor-pointer ${
                          isMe ? 'bg-brand-accent/5 border-l-2 border-brand-accent' : 'hover:bg-slate-900/20'
                        } ${isExpanded ? 'bg-slate-900/40 border-b border-slate-850' : ''}`}
                      >
                        <div className="col-span-2 flex justify-center items-center gap-1">
                          {getRankBadge(itemRank)}
                          {isSimulating && item.rankDiff !== 0 && (
                            <span className={`text-[9px] font-bold ${item.rankDiff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {item.rankDiff > 0 ? `▲${item.rankDiff}` : `▼${Math.abs(item.rankDiff)}`}
                            </span>
                          )}
                        </div>

                        <div className="col-span-7 flex items-center gap-3 pl-2">
                          <img
                            src={item.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
                            alt={item.display_name}
                            className={`w-9 h-9 rounded-full border bg-slate-950 ${isMe ? 'border-brand-accent/40' : 'border-slate-800'}`}
                          />
                          <div>
                            <span className={`text-sm font-semibold block ${isMe ? 'text-brand-accent' : 'text-slate-200'} flex items-center gap-1.5`}>
                              <span>{item.display_name}</span>
                              {item.favorite_team && (
                                <img
                                  src={getTeamFlag(item.favorite_team)}
                                  alt={item.favorite_team}
                                  className="w-5.5 h-3.5 object-cover rounded-sm border border-slate-900 shadow-sm"
                                  title={`Hincha de ${item.favorite_team}`}
                                />
                              )}
                              <span className="text-[8px] text-slate-550 lowercase tracking-tight normal-case font-normal">(ver predicciones)</span>
                            </span>
                            {isMe && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] text-brand-accent/80 font-bold uppercase leading-none mt-0.5">
                                <Sparkles className="w-2.5 h-2.5 fill-brand-accent/15" />
                                <span>Tú</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="col-span-3 text-right">
                          <span className={`text-base font-black ${itemRank === 1 ? 'text-brand-gold' : (isMe ? 'text-brand-accent' : 'text-slate-100')}`}>
                            {item.points}
                          </span>
                          {isSimulating && item.simulatedBonus > 0 && (
                            <span className="text-[10px] text-emerald-450 font-bold ml-1">
                              (+{item.simulatedBonus})
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-semibold ml-1">Pts</span>
                        </div>
                      </div>

                      {/* Expanded Sub-Panel */}
                      {isExpanded && (
                        <div className="col-span-12 px-6 py-4 bg-slate-950/65 border-b border-slate-900/50 space-y-2.5 animate-[slideInRight_0.2s_ease-out]">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-500">
                            <span>Pronósticos de {item.display_name}</span>
                            <span>Solo partidos iniciados/cerrados</span>
                          </div>
                          
                          {loadingPredictions ? (
                            <div className="flex items-center justify-center py-5">
                              <div className="w-5 h-5 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : expandedUserPredictions.length === 0 ? (
                            <p className="text-[10px] text-slate-600 italic py-2 text-center">Este usuario no tiene predicciones para partidos iniciados o finalizados.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {expandedUserPredictions.map(p => {
                                const match = p.match;
                                if (!match) return null;
                                const pts = p.points_earned;
                                let statusBadge = null;
                                if (pts === 3) {
                                  statusBadge = <span className="text-brand-gold font-bold text-[9px] bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/20">+3 Exacto 🎯</span>;
                                } else if (pts === 1) {
                                  statusBadge = <span className="text-brand-accent font-bold text-[9px] bg-brand-accent/15 px-1.5 py-0.5 rounded border border-brand-accent/25">+1 Acertado ✓</span>;
                                } else if (pts === 0) {
                                  statusBadge = <span className="text-slate-500 font-bold text-[9px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850">+0 Pts</span>;
                                } else {
                                  statusBadge = <span className="text-indigo-400 font-bold text-[9px] bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/30">En Juego 🕒</span>;
                                }

                                return (
                                  <div key={p.id || p.match_id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-850/80 text-[10px]">
                                    <div className="flex items-center gap-1.5 truncate flex-1 pr-2">
                                      <img src={match.home_flag_url} alt="" className="w-4.5 h-3 object-cover rounded-sm border border-slate-950/60" />
                                      <span className="font-semibold text-slate-350 truncate">{match.home_team} vs {match.away_team}</span>
                                      <img src={match.away_flag_url} alt="" className="w-4.5 h-3 object-cover rounded-sm border border-slate-950/60" />
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-xs font-bold text-white bg-slate-950 py-0.5 px-2 rounded-md border border-slate-850/70">{p.home_prediction} - {p.away_prediction}</span>
                                      {statusBadge}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────── PRIVATE GROUPS TAB VIEW ────────────────── */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Group Detail view */}
          {selectedGroup ? (
            <div className="space-y-6">
              {/* Group Navbar back */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => { setSelectedGroup(null); setGroupUsers([]); }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-bold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a mis ligas</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Código Liga:</span>
                  <button
                    onClick={() => handleCopyCode(selectedGroup.code, selectedGroup.id)}
                    className="flex items-center gap-1 py-1 px-2.5 rounded bg-slate-900 border border-slate-850 hover:border-slate-800 text-xs font-extrabold text-brand-gold transition-all"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>{selectedGroup.code}</span>
                    {copiedId === selectedGroup.id && <span className="ml-1 text-[9px] text-brand-accent">Copiado</span>}
                  </button>
                </div>
              </div>

              {/* Group Name Banner */}
              <div className="glass p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-brand-purple/15 rounded-xl border border-brand-purple/20 text-brand-purple">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedGroup.name}</h3>
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Liga de amigos</span>
                  </div>
                </div>
              </div>

              {/* Group Leaderboard List */}
              <div className="glass rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                {loadingGroups ? (
                  <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold">Cargando clasificación...</span>
                  </div>
                ) : groupUsers.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <p className="text-sm">No hay miembros en esta liga.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-900/60">
                    <div className="grid grid-cols-12 px-6 py-4 bg-slate-950/40 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <div className="col-span-2 text-center">Pos</div>
                      <div className="col-span-7 pl-2">Usuario</div>
                      <div className="col-span-3 text-right">Puntos</div>
                    </div>

                    {displayGroupUsers.map((item, index) => {
                      const isMe = currentUser && (currentUser.display_name === item.display_name || currentUser.email === item.email);
                      const isExpanded = expandedUserId === item.id;
                      const itemRank = isSimulating ? item.simulatedRank : item.rank;
                      return (
                        <React.Fragment key={index}>
                          <div
                            onClick={() => handleToggleExpand(item.id)}
                            className={`grid grid-cols-12 px-6 py-3.5 items-center transition-all cursor-pointer ${
                              isMe ? 'bg-brand-accent/5 border-l-2 border-brand-accent' : 'hover:bg-slate-900/20'
                            } ${isExpanded ? 'bg-slate-900/40 border-b border-slate-850' : ''}`}
                          >
                            <div className="col-span-2 flex justify-center items-center gap-1">
                              {getRankBadge(itemRank)}
                              {isSimulating && item.rankDiff !== 0 && (
                                <span className={`text-[9px] font-bold ${item.rankDiff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {item.rankDiff > 0 ? `▲${item.rankDiff}` : `▼${Math.abs(item.rankDiff)}`}
                                </span>
                              )}
                            </div>

                            <div className="col-span-7 flex items-center gap-3 pl-2">
                              <img
                                src={item.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
                                alt={item.display_name}
                                className={`w-9 h-9 rounded-full border bg-slate-950 ${isMe ? 'border-brand-accent/40' : 'border-slate-800'}`}
                              />
                              <div>
                                <span className={`text-sm font-semibold block ${isMe ? 'text-brand-accent' : 'text-slate-200'} flex items-center gap-1.5`}>
                                  <span>{item.display_name}</span>
                                  {item.favorite_team && (
                                    <img
                                      src={getTeamFlag(item.favorite_team)}
                                      alt={item.favorite_team}
                                      className="w-5.5 h-3.5 object-cover rounded-sm border border-slate-900 shadow-sm"
                                      title={`Hincha de ${item.favorite_team}`}
                                    />
                                  )}
                                  <span className="text-[8px] text-slate-550 lowercase tracking-tight normal-case font-normal">(ver predicciones)</span>
                                </span>
                                {isMe && <span className="text-[9px] text-brand-accent/80 font-bold uppercase tracking-wider block">Tú</span>}
                              </div>
                            </div>

                            <div className="col-span-3 text-right">
                              <span className={`text-base font-black ${itemRank === 1 ? 'text-brand-gold' : (isMe ? 'text-brand-accent' : 'text-slate-100')}`}>
                                {item.points}
                              </span>
                              {isSimulating && item.simulatedBonus > 0 && (
                                <span className="text-[10px] text-emerald-450 font-bold ml-1">
                                  (+{item.simulatedBonus})
                                </span>
                              )}
                              <span className="text-[10px] text-slate-500 font-semibold ml-1">Pts</span>
                            </div>
                          </div>

                          {/* Expanded Sub-Panel (Private League) */}
                          {isExpanded && (
                            <div className="col-span-12 px-6 py-4 bg-slate-950/65 border-b border-slate-900/50 space-y-2.5 animate-[slideInRight_0.2s_ease-out]">
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-500">
                                <span>Pronósticos de {item.display_name}</span>
                                <span>Solo partidos iniciados/cerrados</span>
                              </div>
                              
                              {loadingPredictions ? (
                                <div className="flex items-center justify-center py-5">
                                  <div className="w-5 h-5 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              ) : expandedUserPredictions.length === 0 ? (
                                <p className="text-[10px] text-slate-650 italic py-2 text-center">Este usuario no tiene predicciones para partidos iniciados o finalizados.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {expandedUserPredictions.map(p => {
                                    const match = p.match;
                                    if (!match) return null;
                                    const pts = p.points_earned;
                                    let statusBadge = null;
                                    if (pts === 3) {
                                      statusBadge = <span className="text-brand-gold font-bold text-[9px] bg-brand-gold/10 px-1.5 py-0.5 rounded border border-brand-gold/20">+3 Exacto 🎯</span>;
                                    } else if (pts === 1) {
                                      statusBadge = <span className="text-brand-accent font-bold text-[9px] bg-brand-accent/15 px-1.5 py-0.5 rounded border border-brand-accent/25">+1 Acertado ✓</span>;
                                    } else if (pts === 0) {
                                      statusBadge = <span className="text-slate-500 font-bold text-[9px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850">+0 Pts</span>;
                                    } else {
                                      statusBadge = <span className="text-indigo-400 font-bold text-[9px] bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/30">En Juego 🕒</span>;
                                    }

                                    return (
                                      <div key={p.id || p.match_id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/50 border border-slate-855/80 text-[10px]">
                                        <div className="flex items-center gap-1.5 truncate flex-1 pr-2">
                                          <img src={match.home_flag_url} alt="" className="w-4.5 h-3 object-cover rounded-sm border border-slate-950/60" />
                                          <span className="font-semibold text-slate-350 truncate">{match.home_team} vs {match.away_team}</span>
                                          <img src={match.away_flag_url} alt="" className="w-4.5 h-3 object-cover rounded-sm border border-slate-950/60" />
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-xs font-bold text-white bg-slate-950 py-0.5 px-2 rounded-md border border-slate-850/70">{p.home_prediction} - {p.away_prediction}</span>
                                          {statusBadge}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Groups Dashboard List
            <div className="space-y-5">
              
              {/* Group forms */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => { setShowCreateForm(true); setShowJoinForm(false); }}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-slate-800 bg-slate-900/30 hover:bg-slate-850 hover:border-slate-700 text-xs font-bold text-slate-200 transition-all"
                >
                  <Plus className="w-4 h-4 text-brand-gold" />
                  <span>Crear Nueva Liga</span>
                </button>
                <button
                  onClick={() => { setShowJoinForm(true); setShowCreateForm(false); }}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-slate-800 bg-slate-900/30 hover:bg-slate-850 hover:border-slate-700 text-xs font-bold text-slate-200 transition-all"
                >
                  <UserPlus className="w-4 h-4 text-brand-purple" />
                  <span>Unirse con Código</span>
                </button>
              </div>

              {/* Form creates group */}
              {showCreateForm && (
                <form onSubmit={handleCreateGroup} className="glass p-5 rounded-2xl border border-slate-800/80 space-y-3.5 animate-[fadeIn_0.2s_ease-out]">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nombre de la Liga</label>
                    <input
                      type="text"
                      placeholder="Ej: La Liga del Trabajo 🏆"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-850 rounded-xl py-2.5 px-3.5 text-white text-xs placeholder-slate-600 focus:outline-none focus:border-brand-gold transition-all"
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowCreateForm(false)} className="py-2 px-4 rounded-xl bg-transparent border border-slate-850 text-xs font-bold text-slate-400 hover:text-slate-200">Cancelar</button>
                    <button type="submit" className="py-2 px-4 rounded-xl bg-brand-gold text-brand-dark text-xs font-bold hover:bg-amber-400 transition-all">Crear Liga</button>
                  </div>
                </form>
              )}

              {/* Form joins group */}
              {showJoinForm && (
                <form onSubmit={handleJoinGroup} className="glass p-5 rounded-2xl border border-slate-800/80 space-y-3.5 animate-[fadeIn_0.2s_ease-out]">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Código de Invitación</label>
                    <input
                      type="text"
                      placeholder="Ej: AB12C3"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-850 rounded-xl py-2.5 px-3.5 text-white text-xs placeholder-slate-650 focus:outline-none focus:border-brand-purple transition-all uppercase"
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowJoinForm(false)} className="py-2 px-4 rounded-xl bg-transparent border border-slate-850 text-xs font-bold text-slate-400 hover:text-slate-200">Cancelar</button>
                    <button type="submit" className="py-2 px-4 rounded-xl bg-brand-purple text-white text-xs font-bold hover:bg-blue-600 transition-all">Unirse a Liga</button>
                  </div>
                </form>
              )}

              {/* Groups List */}
              <div className="glass rounded-3xl border border-slate-800 overflow-hidden">
                {loadingGroups ? (
                  <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold">Cargando tus ligas...</span>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-25" />
                    <p className="text-sm font-semibold">No estás en ninguna liga privada.</p>
                    <p className="text-xs text-slate-600 mt-1">Crea una liga para competir con tus amigos más cercanos.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-900/60">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        onClick={() => handleSelectGroup(group)}
                        className="p-4 flex items-center justify-between hover:bg-slate-900/20 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-450 group-hover:text-brand-gold transition-colors">
                            <Users className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                              {group.name}
                            </span>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                              <span>Código: <strong className="text-slate-400">{group.code}</strong></span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleCopyCode(group.code, group.id); }}
                            className="p-2 rounded-lg bg-slate-950/60 border border-slate-900 hover:border-slate-850 hover:bg-slate-900 transition-all"
                            title="Copiar código de invitación"
                          >
                            <Share2 className="w-3.5 h-3.5 text-brand-gold" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-650 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rules Card */}
      <div className="glass rounded-3xl p-5 border border-slate-900/60 text-slate-400 text-xs space-y-2.5 bg-slate-950/20">
        <h4 className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
          <Award className="w-4 h-4 text-brand-purple" />
          <span>Reglas de Juego</span>
        </h4>
        <ul className="list-disc pl-4 space-y-1 text-slate-400 leading-relaxed">
          <li>Le atinas al marcador exacto del partido: <strong className="text-brand-gold font-semibold">+3 puntos</strong>.</li>
          <li>Le atinas al ganador o al empate (pero no al marcador exacto): <strong className="text-brand-accent font-semibold">+1 punto</strong>.</li>
          <li>No le atinas al resultado: <strong className="text-slate-500 font-medium">0 puntos</strong>.</li>
          <li>Puedes enviar o editar tu marcador antes de que empiece el partido. Una vez iniciado o finalizado, se bloquearán tus predicciones.</li>
        </ul>
      </div>

      {showShareModal && (
        <ShareCardModal
          user={currentUser}
          predictions={predictions}
          matches={matches}
          onClose={() => setShowShareModal(false)}
        />
      )}
      
    </div>
  );
}
