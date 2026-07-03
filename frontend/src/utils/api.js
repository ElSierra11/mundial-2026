// Client API for World Cup Predictions App
// Handles backend calls or falls back to LocalStorage in Demo Mode.

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper to get auth headers
const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Seed mock data for Demo Mode
const initialDemoMatches = [
  // Ronda de 32 (Dieciseisavos)
  { id: 1, home_team: "Canadá", away_team: "Sudáfrica", home_flag_url: "https://flagcdn.com/w160/ca.png", away_flag_url: "https://flagcdn.com/w160/za.png", match_time: new Date("2026-06-28T15:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 1, away_score: 0, status: "finished" },
  { id: 2, home_team: "Países Bajos", away_team: "Marruecos", home_flag_url: "https://flagcdn.com/w160/nl.png", away_flag_url: "https://flagcdn.com/w160/ma.png", match_time: new Date("2026-06-29T18:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 1, away_score: 1, status: "finished" },
  { id: 3, home_team: "Alemania", away_team: "Paraguay", home_flag_url: "https://flagcdn.com/w160/de.png", away_flag_url: "https://flagcdn.com/w160/py.png", match_time: new Date("2026-06-29T21:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 1, away_score: 1, status: "finished" },
  { id: 4, home_team: "Francia", away_team: "Suecia", home_flag_url: "https://flagcdn.com/w160/fr.png", away_flag_url: "https://flagcdn.com/w160/se.png", match_time: new Date("2026-06-30T21:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 3, away_score: 0, status: "finished" },
  { id: 5, home_team: "Brasil", away_team: "Japón", home_flag_url: "https://flagcdn.com/w160/br.png", away_flag_url: "https://flagcdn.com/w160/jp.png", match_time: new Date("2026-06-29T15:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 2, away_score: 1, status: "finished" },
  { id: 6, home_team: "Noruega", away_team: "Costa de Marfil", home_flag_url: "https://flagcdn.com/w160/no.png", away_flag_url: "https://flagcdn.com/w160/ci.png", match_time: new Date("2026-06-30T18:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 2, away_score: 1, status: "finished" },
  { id: 7, home_team: "México", away_team: "Ecuador", home_flag_url: "https://flagcdn.com/w160/mx.png", away_flag_url: "https://flagcdn.com/w160/ec.png", match_time: new Date("2026-06-30T18:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 2, away_score: 0, status: "finished" },
  { id: 8, home_team: "Inglaterra", away_team: "R. D. Congo", home_flag_url: "https://flagcdn.com/w160/gb.png", away_flag_url: "https://flagcdn.com/w160/cd.png", match_time: new Date("2026-07-01T15:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 2, away_score: 1, status: "finished" },
  
  { id: 9, home_team: "EE. UU.", away_team: "Bosnia y Herz.", home_flag_url: "https://flagcdn.com/w160/us.png", away_flag_url: "https://flagcdn.com/w160/ba.png", match_time: new Date("2026-07-01T21:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 2, away_score: 0, status: "finished" },
  { id: 10, home_team: "Bélgica", away_team: "Senegal", home_flag_url: "https://flagcdn.com/w160/be.png", away_flag_url: "https://flagcdn.com/w160/sn.png", match_time: new Date("2026-07-01T18:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 3, away_score: 2, status: "finished" },
  { id: 11, home_team: "España", away_team: "Austria", home_flag_url: "https://flagcdn.com/w160/es.png", away_flag_url: "https://flagcdn.com/w160/at.png", match_time: new Date("2026-07-02T15:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 3, away_score: 0, status: "finished" },
  { id: 12, home_team: "Portugal", away_team: "Croacia", home_flag_url: "https://flagcdn.com/w160/pt.png", away_flag_url: "https://flagcdn.com/w160/hr.png", match_time: new Date("2026-07-02T18:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 2, away_score: 1, status: "finished" },
  { id: 13, home_team: "Suiza", away_team: "Argelia", home_flag_url: "https://flagcdn.com/w160/ch.png", away_flag_url: "https://flagcdn.com/w160/dz.png", match_time: new Date("2026-07-02T18:00:00Z").toISOString(), stage: "Ronda de 32", home_score: 1, away_score: 0, status: "finished" },
  { id: 14, home_team: "Australia", away_team: "Egipto", home_flag_url: "https://flagcdn.com/w160/au.png", away_flag_url: "https://flagcdn.com/w160/eg.png", match_time: new Date("2026-07-03T15:00:00Z").toISOString(), stage: "Ronda de 32", home_score: null, away_score: null, status: "scheduled" },
  { id: 15, home_team: "Argentina", away_team: "Cabo Verde", home_flag_url: "https://flagcdn.com/w160/ar.png", away_flag_url: "https://flagcdn.com/w160/cv.png", match_time: new Date("2026-07-03T21:00:00Z").toISOString(), stage: "Ronda de 32", home_score: null, away_score: null, status: "scheduled" },
  { id: 16, home_team: "Colombia", away_team: "Ghana", home_flag_url: "https://flagcdn.com/w160/co.png", away_flag_url: "https://flagcdn.com/w160/gh.png", match_time: new Date("2026-07-03T21:00:00Z").toISOString(), stage: "Ronda de 32", home_score: null, away_score: null, status: "scheduled" },

  // Octavos de Final
  { id: 17, home_team: "Canadá", away_team: "Marruecos", home_flag_url: "https://flagcdn.com/w160/ca.png", away_flag_url: "https://flagcdn.com/w160/ma.png", match_time: new Date("2026-07-04T18:00:00Z").toISOString(), stage: "Octavos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 18, home_team: "Paraguay", away_team: "Francia", home_flag_url: "https://flagcdn.com/w160/py.png", away_flag_url: "https://flagcdn.com/w160/fr.png", match_time: new Date("2026-07-04T21:00:00Z").toISOString(), stage: "Octavos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 19, home_team: "Brasil", away_team: "Noruega", home_flag_url: "https://flagcdn.com/w160/br.png", away_flag_url: "https://flagcdn.com/w160/no.png", match_time: new Date("2026-07-05T18:00:00Z").toISOString(), stage: "Octavos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 20, home_team: "México", away_team: "Inglaterra", home_flag_url: "https://flagcdn.com/w160/mx.png", away_flag_url: "https://flagcdn.com/w160/gb.png", match_time: new Date("2026-07-05T21:00:00Z").toISOString(), stage: "Octavos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 21, home_team: "Portugal", away_team: "España", home_flag_url: "https://flagcdn.com/w160/pt.png", away_flag_url: "https://flagcdn.com/w160/es.png", match_time: new Date("2026-07-06T18:00:00Z").toISOString(), stage: "Octavos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 22, home_team: "EE. UU.", away_team: "Bélgica", home_flag_url: "https://flagcdn.com/w160/us.png", away_flag_url: "https://flagcdn.com/w160/be.png", match_time: new Date("2026-07-06T21:00:00Z").toISOString(), stage: "Octavos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 23, home_team: "Argentina / Cabo Verde", away_team: "Australia / Egipto", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-07T18:00:00Z").toISOString(), stage: "Octavos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 24, home_team: "Suiza / Argelia", away_team: "Colombia / Ghana", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-07T21:00:00Z").toISOString(), stage: "Octavos de Final", home_score: null, away_score: null, status: "scheduled" },

  // Cuartos
  { id: 25, home_team: "TBD", away_team: "TBD", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-11T20:00:00Z").toISOString(), stage: "Cuartos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 26, home_team: "TBD", away_team: "TBD", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-12T20:00:00Z").toISOString(), stage: "Cuartos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 27, home_team: "TBD", away_team: "TBD", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-13T20:00:00Z").toISOString(), stage: "Cuartos de Final", home_score: null, away_score: null, status: "scheduled" },
  { id: 28, home_team: "TBD", away_team: "TBD", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-14T20:00:00Z").toISOString(), stage: "Cuartos de Final", home_score: null, away_score: null, status: "scheduled" },

  // Semis
  { id: 29, home_team: "TBD", away_team: "TBD", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-15T20:00:00Z").toISOString(), stage: "Semifinal", home_score: null, away_score: null, status: "scheduled" },
  { id: 30, home_team: "TBD", away_team: "TBD", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-16T20:00:00Z").toISOString(), stage: "Semifinal", home_score: null, away_score: null, status: "scheduled" },

  // Tercero
  { id: 31, home_team: "TBD", away_team: "TBD", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-18T20:00:00Z").toISOString(), stage: "3er Puesto", home_score: null, away_score: null, status: "scheduled" },

  // Final
  { id: 32, home_team: "TBD", away_team: "TBD", home_flag_url: "https://flagcdn.com/w160/un.png", away_flag_url: "https://flagcdn.com/w160/un.png", match_time: new Date("2026-07-19T20:00:00Z").toISOString(), stage: "Final", home_score: null, away_score: null, status: "scheduled" }
];

const initialDemoUsers = [
  { id: "mock_admin", display_name: "Tú (Admin)", avatar_url: "https://api.dicebear.com/7.x/adventurer/svg?seed=admin", points: 0, is_admin: true, email: "admin@polla.com" },
  { id: "user_messi", display_name: "Leo Messi", avatar_url: "https://api.dicebear.com/7.x/adventurer/svg?seed=messi", points: 10, is_admin: false, email: "messi@polla.com" },
  { id: "user_neymar", display_name: "Neymar Jr", avatar_url: "https://api.dicebear.com/7.x/adventurer/svg?seed=ney", points: 7, is_admin: false, email: "ney@polla.com" },
  { id: "user_mbappe", display_name: "Kylian M.", avatar_url: "https://api.dicebear.com/7.x/adventurer/svg?seed=kiki", points: 4, is_admin: false, email: "kiki@polla.com" }
];

// Initialize LocalStorage with migration check for 2026 matches
const initDemoStorage = () => {
  const existingMatches = localStorage.getItem("demo_matches");
  let needsReset = false;

  if (existingMatches) {
    try {
      const parsed = JSON.parse(existingMatches);
      // Force reset if the match list is old, incomplete, or contains incorrect pairings
      const hasIncorrectPairing = parsed.some(m => m.id === 23 && m.home_team === "Suiza");
      // Also reset if Suiza vs Argelia (id:13) is still scheduled (should be finished)
      const suizaStillScheduled = parsed.some(m => m.id === 13 && m.status === 'scheduled');
      if (parsed.length < 20 || parsed.some(m => m.home_team === "Catar" || m.stage === "Fase de Grupos") || hasIncorrectPairing || suizaStillScheduled) {
        needsReset = true;
      }
    } catch (e) {
      needsReset = true;
    }
  } else {
    needsReset = true;
  }

  if (needsReset) {
    localStorage.setItem("demo_matches", JSON.stringify(initialDemoMatches));
    localStorage.setItem("demo_predictions", JSON.stringify([]));
    
    // Reset points of existing demo users
    const existingUsers = localStorage.getItem("demo_users");
    if (existingUsers) {
      try {
        const users = JSON.parse(existingUsers);
        users.forEach(u => { u.points = 0; });
        localStorage.setItem("demo_users", JSON.stringify(users));
      } catch (e) {}
    }
    
    // Reset active user session points if logged in, and grant admin rights
    const currentUser = localStorage.getItem("user");
    if (currentUser) {
      try {
        const parsedUser = JSON.parse(currentUser);
        parsedUser.points = 0;
        parsedUser.is_admin = true;
        localStorage.setItem("user", JSON.stringify(parsedUser));

        const existingUsers = localStorage.getItem("demo_users");
        if (existingUsers) {
          const users = JSON.parse(existingUsers);
          const idx = users.findIndex(u => u.id === parsedUser.id || u.email === parsedUser.email);
          if (idx !== -1) {
            users[idx].points = 0;
            users[idx].is_admin = true;
            localStorage.setItem("demo_users", JSON.stringify(users));
          }
        }
      } catch (e) {}
    }
  }

  if (!localStorage.getItem("demo_users")) {
    localStorage.setItem("demo_users", JSON.stringify(initialDemoUsers));
  }
  if (!localStorage.getItem("demo_predictions")) {
    localStorage.setItem("demo_predictions", JSON.stringify([]));
  }
};

initDemoStorage();

export const api = {
  // Check backend availability
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/matches`, { signal: AbortSignal.timeout(1000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Auth Operations
  async loginWithGoogle(token, isDemo = false, demoEmail = "", demoName = "") {
    if (isDemo) {
      // In Demo mode, simulate backend OAuth and return JWT
      const email = demoEmail || "amigo_demo@polla.com";
      const name = demoName || "Invitado";
      const users = JSON.parse(localStorage.getItem("demo_users"));
      
      let user = users.find(u => u.email === email);
      if (!user) {
        user = {
          id: `demo_${Date.now()}`,
          display_name: name,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
          points: 0,
          is_admin: true, // Make admin true by default in Demo mode for easy testing
          email: email
        };
        users.push(user);
        localStorage.setItem("demo_users", JSON.stringify(users));
      }
      
      localStorage.setItem("token", `mock_${email}_${name}`);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("mode", "demo");
      return { user, access_token: `mock_${email}_${name}` };
    }

    // Call Real API
    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email: demoEmail, name: demoName }),
    });
    if (!response.ok) {
      throw new Error("Error en la autenticación de Google");
    }
    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("mode", "real");
    return data;
  },

  async registerWithEmail(email, password, displayName) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || "Error en el registro");
    }
    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("mode", "real");
    return data;
  },

  async loginWithEmail(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || "Usuario o contraseña incorrectos");
    }
    const data = await response.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("mode", "real");
    return data;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // We keep mode preference
  },

  getCurrentUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  getMode() {
    return localStorage.getItem("mode") || "demo";
  },

  setMode(mode) {
    localStorage.setItem("mode", mode);
  },

  // Matches
  async getMatches() {
    if (this.getMode() === "demo") {
      return JSON.parse(localStorage.getItem("demo_matches"));
    }

    const response = await fetch(`${API_BASE_URL}/api/matches`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Error al obtener los partidos");
    return await response.json();
  },

  // Predictions
  async getPredictions() {
    if (this.getMode() === "demo") {
      const user = this.getCurrentUser();
      if (!user) return [];
      const allPreds = JSON.parse(localStorage.getItem("demo_predictions"));
      return allPreds.filter(p => p.user_id === user.id);
    }

    const response = await fetch(`${API_BASE_URL}/api/predictions`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Error al obtener predicciones");
    return await response.json();
  },

  async savePrediction(matchId, homePrediction, awayPrediction) {
    if (this.getMode() === "demo") {
      const user = this.getCurrentUser();
      if (!user) throw new Error("No autenticado");
      
      const matches = JSON.parse(localStorage.getItem("demo_matches"));
      const match = matches.find(m => m.id === matchId);
      if (match && match.status !== "scheduled") {
        throw new Error("El partido ya ha comenzado");
      }

      const preds = JSON.parse(localStorage.getItem("demo_predictions"));
      let pred = preds.find(p => p.user_id === user.id && p.match_id === matchId);
      if (pred) {
        pred.home_prediction = parseInt(homePrediction);
        pred.away_prediction = parseInt(awayPrediction);
      } else {
        pred = {
          id: Date.now(),
          user_id: user.id,
          match_id: matchId,
          home_prediction: parseInt(homePrediction),
          away_prediction: parseInt(awayPrediction),
          points_earned: null
        };
        preds.push(pred);
      }
      localStorage.setItem("demo_predictions", JSON.stringify(preds));
      return pred;
    }

    const response = await fetch(`${API_BASE_URL}/api/predictions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ match_id: matchId, home_prediction: homePrediction, away_prediction: awayPrediction }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Error al guardar predicción");
    }
    return await response.json();
  },

  // Leaderboard
  async getLeaderboard() {
    if (this.getMode() === "demo") {
      const users = JSON.parse(localStorage.getItem("demo_users"));
      // Sort descending by points
      const sortedUsers = [...users].sort((a, b) => b.points - a.points);
      
      // Calculate ranks with support for ties
      let currentRank = 1;
      let prevPoints = null;
      return sortedUsers.map((u, i) => {
        if (prevPoints !== null && u.points < prevPoints) {
          currentRank = i + 1;
        }
        prevPoints = u.points;
        return {
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          points: u.points,
          rank: currentRank
        };
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/users/leaderboard`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Error al obtener el leaderboard");
    return await response.json();
  },

  // Admin Actions
  async adminUpdateMatchScore(matchId, homeScore, awayScore, status, homeTeam = null, awayTeam = null) {
    if (this.getMode() === "demo") {
      const matches = JSON.parse(localStorage.getItem("demo_matches"));
      const matchIndex = matches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) throw new Error("Partido no encontrado");

      if (homeScore !== null && homeScore !== '') matches[matchIndex].home_score = parseInt(homeScore);
      if (awayScore !== null && awayScore !== '') matches[matchIndex].away_score = parseInt(awayScore);
      if (status) matches[matchIndex].status = status;
      if (homeTeam) {
        matches[matchIndex].home_team = homeTeam;
        matches[matchIndex].home_flag_url = this._guessFlagUrl(homeTeam);
      }
      if (awayTeam) {
        matches[matchIndex].away_team = awayTeam;
        matches[matchIndex].away_flag_url = this._guessFlagUrl(awayTeam);
      }
      localStorage.setItem("demo_matches", JSON.stringify(matches));
      
      // Recalculate predictions and points locally
      this._demoRecalculateScores();
      
      // Fetch fresh updated user details for local state
      const users = JSON.parse(localStorage.getItem("demo_users"));
      const currentUser = this.getCurrentUser();
      const updatedCurrentUser = users.find(u => u.id === currentUser.id);
      if (updatedCurrentUser) {
        localStorage.setItem("user", JSON.stringify(updatedCurrentUser));
      }

      return matches[matchIndex];
    }

    const body = { status };
    if (homeScore !== null && homeScore !== '') body.home_score = parseInt(homeScore);
    if (awayScore !== null && awayScore !== '') body.away_score = parseInt(awayScore);
    if (homeTeam) body.home_team = homeTeam;
    if (awayTeam) body.away_team = awayTeam;

    const response = await fetch(`${API_BASE_URL}/api/admin/matches/${matchId}/score`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Error al actualizar resultado del partido");
    }
    
    // Refresh local profile stats in real mode as well
    await this.refreshLocalUserProfile();
    
    return await response.json();
  },

  // Guess flag url by country name (Spanish) - client-side version
  _guessFlagUrl(teamName) {
    if (!teamName) return "https://flagcdn.com/w160/un.png";
    const name = teamName.toLowerCase().trim();
    const codes = {
      "méxico": "mx", "mexico": "mx", "ecuador": "ec", "francia": "fr",
      "suecia": "se", "noruega": "no", "costa de marfil": "ci",
      "brasil": "br", "japón": "jp", "japon": "jp",
      "canadá": "ca", "canada": "ca", "sudáfrica": "za", "sudafrica": "za",
      "marruecos": "ma", "paraguay": "py", "alemania": "de",
      "inglaterra": "gb-eng", "españa": "es", "espana": "es",
      "portugal": "pt", "ee. uu.": "us", "estados unidos": "us", "usa": "us",
      "bélgica": "be", "belgica": "be", "suiza": "ch", "argelia": "dz",
      "australia": "au", "egipto": "eg", "argentina": "ar",
      "cabo verde": "cv", "colombia": "co", "ghana": "gh", "senegal": "sn",
      "países bajos": "nl", "holanda": "nl", "croacia": "hr",
      "r. d. congo": "cd", "congo": "cd", "uruguay": "uy", "chile": "cl",
      "perú": "pe", "peru": "pe", "corea del sur": "kr", "japón": "jp",
      "nigeria": "ng", "camerún": "cm", "costa rica": "cr",
    };
    const code = codes[name] || "un";
    return `https://flagcdn.com/w160/${code}.png`;
  },



  async refreshLocalUserProfile() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, { headers: getHeaders() });
      if (response.ok) {
        const user = await response.json();
        localStorage.setItem("user", JSON.stringify(user));
      }
    } catch (e) {
      console.warn("Could not refresh user profile:", e);
    }
  },

  async getChatMessages() {
    if (this.getMode() === "demo") {
      return JSON.parse(localStorage.getItem("demo_chat_messages") || "[]");
    }
    const response = await fetch(`${API_BASE_URL}/api/chat`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Error al obtener mensajes");
    return await response.json();
  },

  async sendChatMessage(text) {
    if (this.getMode() === "demo") {
      return null;
    }
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("Error al enviar mensaje");
    return await response.json();
  },

  async adminRecalculate() {
    if (this.getMode() === "demo") {
      this._demoRecalculateScores();
      const users = JSON.parse(localStorage.getItem("demo_users"));
      const currentUser = this.getCurrentUser();
      const updatedCurrentUser = users.find(u => u.id === currentUser?.id);
      if (updatedCurrentUser) {
        localStorage.setItem("user", JSON.stringify(updatedCurrentUser));
      }
      return;
    }
    const response = await fetch(`${API_BASE_URL}/api/admin/recalculate`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Error al recalcular puntajes");
    await this.refreshLocalUserProfile();
  },

  async adminResetDatabase() {
    if (this.getMode() === "demo") {
      localStorage.setItem("demo_matches", JSON.stringify(initialDemoMatches));
      localStorage.setItem("demo_predictions", JSON.stringify([]));
      const users = JSON.parse(localStorage.getItem("demo_users"));
      users.forEach(u => { u.points = 0; });
      localStorage.setItem("demo_users", JSON.stringify(users));
      
      const currentUser = this.getCurrentUser();
      const updatedCurrentUser = users.find(u => u.id === currentUser?.id);
      if (updatedCurrentUser) {
        localStorage.setItem("user", JSON.stringify(updatedCurrentUser));
      }
      return;
    }
    const response = await fetch(`${API_BASE_URL}/api/admin/reset_db`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Error al reiniciar la base de datos");
    await this.refreshLocalUserProfile();
  },

  // Private helper to calculate points in Demo Mode
  _demoRecalculateScores() {
    const matches = JSON.parse(localStorage.getItem("demo_matches"));
    const predictions = JSON.parse(localStorage.getItem("demo_predictions"));
    const users = JSON.parse(localStorage.getItem("demo_users"));

    // Reset user points to 0
    users.forEach(u => { u.points = 0; });

    // Score predictions
    predictions.forEach(pred => {
      const match = matches.find(m => m.id === pred.match_id);
      if (!match || match.status !== "finished" || match.home_score === null || match.away_score === null) {
        pred.points_earned = null;
        return;
      }

      const pHome = pred.home_prediction;
      const pAway = pred.away_prediction;
      const mHome = match.home_score;
      const mAway = match.away_score;

      const matchOutcome = mHome > mAway ? 1 : (mAway > mHome ? 2 : 0);
      const predOutcome = pHome > pAway ? 1 : (pAway > pHome ? 2 : 0);

      if (pHome === mHome && pAway === mAway) {
        pred.points_earned = 3; // Exact match
      } else if (matchOutcome === predOutcome) {
        pred.points_earned = 1; // Correct outcome
      } else {
        pred.points_earned = 0; // Wrong
      }

      // Add to user points
      const user = users.find(u => u.id === pred.user_id);
      if (user) {
        user.points += pred.points_earned;
      }
    });

    localStorage.setItem("demo_predictions", JSON.stringify(predictions));
    localStorage.setItem("demo_users", JSON.stringify(users));
  },

  // ─── Community Match Stats ─────────────────────────────────────────────────────
  async getMatchStats(matchId) {
    if (this.getMode() === "demo") {
      const seed = matchId * 31 + 17;
      const home_win_pct = Math.abs(seed) % 50 + 20; // 20 - 70%
      const away_win_pct = Math.abs(seed * 7) % (100 - home_win_pct - 15) + 10;
      const draw_pct = 100 - home_win_pct - away_win_pct;
      
      const avg_home_prediction = parseFloat((Math.abs(seed * 3) % 3 + 0.5).toFixed(1));
      const avg_away_prediction = parseFloat((Math.abs(seed * 5) % 3 + 0.2).toFixed(1));
      
      return {
        total_predictions: 14,
        home_win_pct,
        away_win_pct,
        draw_pct,
        avg_home_prediction,
        avg_away_prediction
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}/stats`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Error al obtener estadísticas del partido");
    return await response.json();
  },

  // ─── Private Leagues / Groups ──────────────────────────────────────────────────
  async createGroup(name) {
    if (this.getMode() === "demo") {
      const user = this.getCurrentUser();
      if (!user) throw new Error("No autenticado");
      
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newGroup = { id: Date.now(), name, code, owner_id: user.id };
      
      // Save group
      const groups = JSON.parse(localStorage.getItem("demo_groups") || "[]");
      groups.push(newGroup);
      localStorage.setItem("demo_groups", JSON.stringify(groups));
      
      // Save member (creator)
      const members = JSON.parse(localStorage.getItem("demo_group_members") || "[]");
      members.push({ group_id: newGroup.id, user_id: user.id });
      
      // Add a couple of other demo users to make the leaderboard interesting
      const allDemoUsers = JSON.parse(localStorage.getItem("demo_users") || "[]");
      allDemoUsers.filter(u => u.id !== user.id).slice(0, 3).forEach(u => {
        members.push({ group_id: newGroup.id, user_id: u.id });
      });
      localStorage.setItem("demo_group_members", JSON.stringify(members));
      
      return newGroup;
    }

    const response = await fetch(`${API_BASE_URL}/api/groups`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Error al crear el grupo");
    return await response.json();
  },

  async joinGroup(code) {
    if (this.getMode() === "demo") {
      const user = this.getCurrentUser();
      if (!user) throw new Error("No autenticado");
      
      const groups = JSON.parse(localStorage.getItem("demo_groups") || "[]");
      const group = groups.find(g => g.code === code.toUpperCase().trim());
      if (!group) throw new Error("Grupo no encontrado. Verifica el código.");
      
      const members = JSON.parse(localStorage.getItem("demo_group_members") || "[]");
      const alreadyMember = members.some(m => m.group_id === group.id && m.user_id === user.id);
      
      if (!alreadyMember) {
        members.push({ group_id: group.id, user_id: user.id });
        localStorage.setItem("demo_group_members", JSON.stringify(members));
      }
      return group;
    }

    const response = await fetch(`${API_BASE_URL}/api/groups/join`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Error al unirse al grupo");
    }
    return await response.json();
  },

  async getUserGroups() {
    if (this.getMode() === "demo") {
      const user = this.getCurrentUser();
      if (!user) return [];
      const groups = JSON.parse(localStorage.getItem("demo_groups") || "[]");
      const members = JSON.parse(localStorage.getItem("demo_group_members") || "[]");
      
      const myGroupIds = members.filter(m => m.user_id === user.id).map(m => m.group_id);
      return groups.filter(g => myGroupIds.includes(g.id));
    }

    const response = await fetch(`${API_BASE_URL}/api/users/me/groups`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Error al obtener tus grupos");
    return await response.json();
  },

  async getGroupLeaderboard(groupId) {
    if (this.getMode() === "demo") {
      const members = JSON.parse(localStorage.getItem("demo_group_members") || "[]");
      const users = JSON.parse(localStorage.getItem("demo_users") || "[]");
      
      const groupUserIds = members.filter(m => m.group_id === groupId).map(m => m.user_id);
      const groupUsers = users.filter(u => groupUserIds.includes(u.id));
      
      // Sort and rank
      const sorted = [...groupUsers].sort((a, b) => b.points - a.points);
      let currentRank = 1;
      let prevPoints = null;
      return sorted.map((u, i) => {
        if (prevPoints !== null && u.points < prevPoints) {
          currentRank = i + 1;
        }
        prevPoints = u.points;
        return {
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          points: u.points,
          rank: currentRank
        };
      });
    }

    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/leaderboard`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Error al obtener la tabla de posiciones del grupo");
    return await response.json();
  }
};

