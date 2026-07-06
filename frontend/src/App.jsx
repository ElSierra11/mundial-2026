import React, { useState, useEffect, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import MatchCard from './components/MatchCard';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';
import BracketView from './components/BracketView';
import GroupsView from './components/GroupsView';
import ChatView from './components/ChatView';
import ProfileView from './components/ProfileView';
import ChampionPoll from './components/ChampionPoll';
import OfflineGame from './components/OfflineGame';
import { api } from './utils/api';
import { fetchLiveWorldCupScores, mergeLiveData } from './utils/liveApi';
import { Sparkles, Radio, Database, AlertCircle, Calendar, Wifi, WifiOff, CheckCircle2, XCircle, Info } from 'lucide-react';
import { triggerConfetti } from './utils/confetti';
import { playGoalChime, triggerHapticFeedback } from './utils/soundEffects';

// ─── Global Toast Component ────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-4 z-[999] flex flex-col gap-2 pointer-events-none" style={{maxWidth: '320px'}}>
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 py-3 px-4 rounded-2xl border shadow-2xl shadow-black/40 pointer-events-auto
            animate-[slideInRight_0.3s_ease-out] backdrop-blur-md
            ${
              t.type === 'success' ? 'bg-slate-900/95 border-brand-accent/40 text-brand-accent'
              : t.type === 'error'   ? 'bg-slate-900/95 border-red-500/40 text-red-400'
              : 'bg-slate-900/95 border-slate-700/60 text-slate-300'
            }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          {t.type === 'error'   && <XCircle      className="w-4 h-4 flex-shrink-0" />}
          {t.type === 'info'    && <Info         className="w-4 h-4 flex-shrink-0" />}
          <span className="text-xs font-semibold flex-1">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 text-lg leading-none">&times;</button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState('bracket');
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [isDemo, setIsDemo] = useState(api.getMode() === 'demo');
  const [loginError, setLoginError] = useState('');

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // Live scores state
  const [liveMatches, setLiveMatches] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);

  // Filter for matches tab
  const [selectedStage, setSelectedStage] = useState('Pendientes');

  // Network listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check if user is already logged in & check backend health
  useEffect(() => {
    const checkStatus = async () => {
      // Always use server/real mode
      api.setMode('real');

      const loggedUser = api.getCurrentUser();
      if (loggedUser) {
        setUser(loggedUser);
      }

      // Check if python backend is online
      const online = await api.checkHealth();
      setBackendOnline(online);
    };
    checkStatus();
  }, []);

  // Fetch data whenever user or isDemo changes
  const loadAppData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const allMatches = await api.getMatches();
      setMatches(allMatches);

      const board = await api.getLeaderboard();
      setLeaderboard(board);

      const preds = await api.getPredictions();
      setPredictions(preds);
    } catch (err) {
      console.error("Error loading application data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppData();
  }, [user]);

  // Live goal score notification helper
  const checkAndNotifyScoreChanges = useCallback((newLiveMatches) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    
    newLiveMatches.forEach(lm => {
      const currentMatch = matches.find(m => 
        m.home_team.toLowerCase() === lm.home_team.toLowerCase() &&
        m.away_team.toLowerCase() === lm.away_team.toLowerCase()
      );
      
      if (currentMatch && lm.status === 'live') {
        const prevLive = liveMatches.find(pm => 
          pm.home_team.toLowerCase() === lm.home_team.toLowerCase() && 
          pm.away_team.toLowerCase() === lm.away_team.toLowerCase()
        );
        
        const oldHome = prevLive ? prevLive.home_score : currentMatch.home_score;
        const oldAway = prevLive ? prevLive.away_score : currentMatch.away_score;
        
        if (oldHome !== null && oldAway !== null && lm.home_score !== null && lm.away_score !== null) {
          if (lm.home_score > oldHome) {
            showGoalNotification(lm.home_team, lm.home_score, lm.away_score, lm.away_team);
          } else if (lm.away_score > oldAway) {
            showGoalNotification(lm.away_team, lm.home_score, lm.away_score, lm.home_team);
          }
        }
      }
    });
  }, [matches, liveMatches]);

  const showGoalNotification = (scoringTeam, homeScore, awayScore, opposingTeam) => {
    try {
      playGoalChime();
      triggerHapticFeedback(80);
      
      new Notification("⚽ ¡GOOOL EN VIVO!", {
        body: `¡Gol de ${scoringTeam}! Marcador actual: ${homeScore} - ${awayScore}`,
        icon: '/logo.png'
      });
    } catch (e) {
      console.warn("Could not fire notification:", e);
    }
  };

  // ── ESPN Live Score polling (every 60 seconds) ──────────────────────────────
  const syncLiveScores = useCallback(async () => {
    if (!user) return;
    try {
      const live = await fetchLiveWorldCupScores();
      if (live && live.length > 0) {
        checkAndNotifyScoreChanges(live);
        setLiveMatches(live);
        setLiveConnected(true);
        const now = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
        setLastSync(now);
      } else {
        setLiveConnected(false);
      }
    } catch (e) {
      setLiveConnected(false);
    }
  }, [user, checkAndNotifyScoreChanges]);

  useEffect(() => {
    syncLiveScores();
    const interval = setInterval(syncLiveScores, 60000);
    return () => clearInterval(interval);
  }, [syncLiveScores]);

  // Periodically check if backend status changes
  useEffect(() => {
    const interval = setInterval(async () => {
      const online = await api.checkHealth();
      setBackendOnline(online);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = async (token, _isDemoMode, email, name) => {
    setLoading(true);
    setLoginError('');
    try {
      const data = await api.loginWithGoogle(token, _isDemoMode, email, name);
      setIsDemo(_isDemoMode);
      setLoginError('');
      setUser(data.user);
    } catch (err) {
      setLoginError(err.message || 'Error al autenticar con Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (email, password) => {
    setLoading(true);
    setLoginError('');
    try {
      const data = await api.loginWithEmail(email, password);
      setIsDemo(false);
      setUser(data.user);
    } catch (err) {
      setLoginError(err.message || 'Error al iniciar sesión');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (email, password, displayName) => {
    setLoading(true);
    setLoginError('');
    try {
      const data = await api.registerWithEmail(email, password, displayName);
      setIsDemo(false);
      setUser(data.user);
    } catch (err) {
      setLoginError(err.message || 'Error al registrarse');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setMatches([]);
    setPredictions([]);
    setLeaderboard([]);
  };

  const handleSavePrediction = async (matchId, homePred, awayPred) => {
    try {
      await api.savePrediction(matchId, homePred, awayPred);
      // Reload predictions to get calculated scores / updated status
      const preds = await api.getPredictions();
      setPredictions(preds);
      
      // Also reload leaderboard in case local calculation happened
      const board = await api.getLeaderboard();
      setLeaderboard(board);

      showToast('¡Predicción guardada correctamente! 🎯', 'success');
      triggerConfetti();
    } catch (err) {
      showToast('Error al guardar: ' + err.message, 'error');
    }
  };

  const handleUpdateMatchScore = async (matchId, homeScore, awayScore, status, homeTeam = null, awayTeam = null, homePenalties = null, awayPenalties = null, penaltiesWinner = null) => {
    await api.adminUpdateMatchScore(matchId, homeScore, awayScore, status, homeTeam, awayTeam, homePenalties, awayPenalties, penaltiesWinner);
    // Reload all data to recalculate scores and update user stats
    await loadAppData();
    // Refresh header score by loading the updated user profile
    const freshUser = api.getCurrentUser();
    if (freshUser) setUser(freshUser);
  };

  const handleRecalculateScores = async () => {
    await api.adminRecalculate();
    await loadAppData();
    const freshUser = api.getCurrentUser();
    if (freshUser) setUser(freshUser);
  };

  const handleResetDatabase = async () => {
    await api.adminResetDatabase();
    await loadAppData();
    const freshUser = api.getCurrentUser();
    if (freshUser) setUser(freshUser);
  };

  const toggleMode = (newMode) => {
    if (newMode === 'real' && !backendOnline) {
      alert("El servidor de Python no parece estar en línea en http://localhost:8000. Por favor, inícialo primero.");
      return;
    }
    api.setMode(newMode);
    setIsDemo(newMode === 'demo');
    handleLogout(); // Log out to prompt sign in on the new mode context
  };

  if (!user) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess} 
        onEmailLogin={handleEmailLogin}
        onEmailRegister={handleEmailRegister}
        loginError={loginError} 
        onClearError={() => setLoginError('')} 
      />
    );
  }

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-stadium-gradient pb-10 flex items-center justify-center px-4 py-12">
        <OfflineGame onRetryConnection={() => setIsOnline(navigator.onLine)} />
      </div>
    );
  }

  const mergedMatches = mergeLiveData(matches, liveMatches);

  // Get all unique stages present in matches for filtering
  const allStages = ['Todas', 'Pendientes', ...Array.from(new Set(mergedMatches.map(m => m.stage)))];
  
  const filteredMatches = selectedStage === 'Todas' 
    ? mergedMatches 
    : selectedStage === 'Pendientes'
      ? mergedMatches.filter(m => m.status !== 'finished')
      : mergedMatches.filter(m => m.stage === selectedStage);

  return (
    <div className="min-h-screen bg-stadium-gradient pb-10">
      {/* Global Toast */}
      <Toast toasts={toasts} removeToast={removeToast} />
      {/* Mode Status Banner */}
      <div className="w-full bg-slate-950 text-slate-400 text-xs border-b border-slate-900 py-2.5 px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 py-0.5 px-2 rounded bg-brand-accent/10 border border-brand-accent/30 text-brand-accent font-bold tracking-wide text-[10px] uppercase">
            <Database className="w-3 h-3" /> Modo Servidor Activo
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400">Conectado al servidor de producción.</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-brand-accent' : 'bg-red-500 animate-pulse'}`}></span>
            <span className="text-slate-500 text-[10px]">
              Servidor: {backendOnline ? 'EN LÍNEA' : 'DESCONECTADO'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
        isDemo={false}
      />

      {/* Content wrapper */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-400">Cargando datos de la polla...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Matches Tab */}
            {activeTab === 'matches' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/25 p-3 rounded-2xl border border-slate-900/60 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Calendar className="w-4 h-4 text-brand-accent" />
                    <span className="text-xs font-bold uppercase tracking-wider">Filtro de Partidos:</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar">
                    {allStages.map((stage) => (
                      <button
                        key={stage}
                        onClick={() => setSelectedStage(stage)}
                        className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                          selectedStage === stage
                            ? 'bg-brand-accent text-brand-dark font-bold'
                            : 'bg-slate-950/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Match Cards Grid */}
                {filteredMatches.length === 0 ? (
                  <div className="py-20 text-center glass rounded-3xl border border-slate-900">
                    <p className="text-slate-500 text-sm">No hay partidos en esta categoría.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredMatches.map((match) => {
                      const pred = predictions.find(p => p.match_id === match.id);
                      return (
                        <MatchCard
                          key={match.id}
                          match={match}
                          prediction={pred}
                          onSavePrediction={handleSavePrediction}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Bracket Tab */}
            {activeTab === 'bracket' && (
              <div className="space-y-6">
                {/* Champion Poll Widget */}
                <ChampionPoll />

                {/* Bracket Card */}
                <div className="glass rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none"></div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 z-10 relative">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                        <span>Llave del Torneo</span>
                        <span className="text-xs py-0.5 px-2 bg-brand-accent/15 border border-brand-accent/30 text-brand-accent rounded-full font-bold uppercase tracking-wide">Octavos + Eliminatorias</span>
                      </h2>
                      <p className="text-slate-400 text-xs mt-1">Sigue el avance de los partidos reales y mira tus predicciones en tiempo real</p>
                    </div>
                    {lastSync && (
                      <div className="flex items-center gap-2 text-xs py-1.5 px-3 bg-slate-950/60 border border-slate-900 rounded-xl text-slate-400">
                        {liveConnected ? (
                          <>
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span>ESPN en Vivo Conectado · {lastSync}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2.5 h-2.5 bg-slate-600 rounded-full"></span>
                            <span>ESPN Sincronizado · {lastSync}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <BracketView 
                    matches={mergedMatches} 
                    predictions={predictions} 
                    lastSync={lastSync}
                  />
                </div>
              </div>
            )}


            {/* Leaderboard Tab */}
            {activeTab === 'leaderboard' && (
              <Leaderboard 
                users={leaderboard} 
                currentUser={user} 
                matches={mergedMatches} 
                predictions={predictions} 
              />
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
              <GroupsView user={user} />
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <ChatView user={user} isDemo={isDemo} leaderboard={leaderboard} />
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <ProfileView 
                user={user} 
                predictions={predictions} 
                matches={mergedMatches}
                onUpdateProfile={async (data) => {
                  const updated = await api.updateUserProfile(data);
                  setUser(updated);
                }}
              />
            )}

            {/* Admin Panel Tab */}
            {activeTab === 'admin' && user?.is_admin && (
              <AdminPanel 
                matches={mergedMatches} 
                onUpdateScore={handleUpdateMatchScore} 
                onRecalculate={handleRecalculateScores}
                onResetDatabase={handleResetDatabase}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
