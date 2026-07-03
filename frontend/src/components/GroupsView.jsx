import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Hash, Copy, Check, Trophy, Crown, Medal, Flame, ArrowLeft, Loader2, UserPlus, Share2, ChevronRight } from 'lucide-react';
import { api } from '../utils/api';

// ─── Rank Badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  if (rank === 1) return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-gold/20 border border-brand-gold/40">
      <Crown className="w-3.5 h-3.5 text-brand-gold" />
    </span>
  );
  if (rank === 2) return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-400/10 border border-slate-400/30">
      <Medal className="w-3.5 h-3.5 text-slate-400" />
    </span>
  );
  if (rank === 3) return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 border border-amber-700/30">
      <Medal className="w-3.5 h-3.5 text-amber-600" />
    </span>
  );
  return (
    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900/60 border border-slate-800 text-slate-500 text-xs font-black">
      {rank}
    </span>
  );
}

// ─── Group Leaderboard Card ────────────────────────────────────────────────────
function GroupLeaderboard({ group, currentUser, onBack }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getGroupLeaderboard(group.id);
        setMembers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [group.id]);

  const copyCode = () => {
    navigator.clipboard.writeText(group.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const myRank = members.find(m => m.display_name === currentUser?.display_name)?.rank;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-extrabold text-white tracking-tight">{group.name}</h2>
          <p className="text-xs text-slate-500 font-medium">Ranking del grupo</p>
        </div>
        {/* Invite code badge */}
        <button
          onClick={copyCode}
          className="flex items-center gap-2 py-2 px-3.5 bg-slate-900/60 border border-slate-800 hover:border-brand-gold/40 rounded-xl transition-all group"
        >
          <Hash className="w-3.5 h-3.5 text-brand-gold" />
          <span className="text-sm font-black text-brand-gold tracking-widest">{group.code}</span>
          {copied
            ? <Check className="w-3.5 h-3.5 text-emerald-400" />
            : <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-brand-gold transition-colors" />
          }
        </button>
      </div>

      {/* My rank pill (if in group) */}
      {myRank && (
        <div className="flex items-center gap-3 py-3 px-4 bg-brand-gold/8 border border-brand-gold/25 rounded-2xl">
          <Flame className="w-4 h-4 text-brand-gold flex-shrink-0" />
          <span className="text-sm font-bold text-brand-gold">
            Estás en el puesto #{myRank} de este grupo
          </span>
        </div>
      )}

      {/* Leaderboard */}
      <div className="glass rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-gold animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
            <Users className="w-10 h-10 opacity-20" />
            <p className="text-xs font-semibold">Aún no hay miembros en este grupo</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-900/80">
            {members.map((member, idx) => {
              const isMe = member.display_name === currentUser?.display_name;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-all ${
                    isMe
                      ? 'bg-brand-gold/5 border-l-2 border-brand-gold'
                      : member.rank === 1
                      ? 'bg-brand-gold/3'
                      : ''
                  }`}
                >
                  <RankBadge rank={member.rank} />

                  <img
                    src={member.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.display_name}`}
                    alt=""
                    className="w-9 h-9 rounded-full border border-slate-800 bg-slate-950 flex-shrink-0"
                    onError={e => { e.target.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${member.display_name}`; }}
                  />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${isMe ? 'text-brand-gold' : 'text-slate-200'}`}>
                      {member.display_name}
                      {isMe && <span className="ml-1.5 text-[9px] font-black uppercase tracking-wider text-brand-gold/70 bg-brand-gold/10 px-1.5 py-0.5 rounded-full border border-brand-gold/20">Tú</span>}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className={`text-lg font-black tabular-nums ${member.rank === 1 ? 'text-brand-gold' : isMe ? 'text-brand-gold' : 'text-slate-300'}`}>
                      {member.points}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold ml-0.5">pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Share invite */}
      <div className="glass rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-brand-gold/10 border border-brand-gold/20 rounded-xl flex-shrink-0">
          <Share2 className="w-4 h-4 text-brand-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-300">Invita a tus panas</p>
          <p className="text-[11px] text-slate-500">Comparte el código <span className="text-brand-gold font-black">{group.code}</span> para que se unan</p>
        </div>
        <button
          onClick={copyCode}
          className="flex items-center gap-1.5 py-1.5 px-3 bg-brand-gold hover:bg-amber-400 text-brand-dark text-xs font-black rounded-xl transition-all flex-shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </div>
  );
}

// ─── Main GroupsView ───────────────────────────────────────────────────────────
export default function GroupsView({ user }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(true);

  // Create group
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join group
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const loadGroups = useCallback(async () => {
    try {
      const data = await api.getUserGroups();
      setGroups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const group = await api.createGroup(newGroupName.trim());
      setGroups(prev => [...prev, group]);
      setNewGroupName('');
      setShowCreate(false);
      setSelectedGroup(group);
    } catch (err) {
      setCreateError(err.message || 'Error al crear el grupo');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError('');
    try {
      const group = await api.joinGroup(joinCode.trim().toUpperCase());
      // Reload to update list
      await loadGroups();
      setJoinCode('');
      setShowJoin(false);
      setSelectedGroup(group);
    } catch (err) {
      setJoinError(err.message || 'Código inválido. Verifica e intenta de nuevo.');
    } finally {
      setJoining(false);
    }
  };

  // ── If viewing a specific group, show its leaderboard ──────────────────────
  if (selectedGroup) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <GroupLeaderboard
          group={selectedGroup}
          currentUser={user}
          onBack={() => setSelectedGroup(null)}
        />
      </div>
    );
  }

  // ── Main groups list ───────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass rounded-3xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-gold" />
              Mis Grupos
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Crea o únete a un grupo privado y compite solo con tus panas
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowJoin(true); setShowCreate(false); setJoinError(''); }}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-900/60 border border-slate-800 hover:border-brand-gold/40 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all"
            >
              <Hash className="w-3.5 h-3.5 text-brand-gold" />
              Unirse
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); setCreateError(''); }}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-brand-gold hover:bg-amber-400 text-brand-dark text-xs font-black rounded-xl transition-all shadow-lg shadow-brand-gold/15"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Grupo
            </button>
          </div>
        </div>
      </div>

      {/* Create Group form */}
      {showCreate && (
        <div className="glass rounded-2xl p-5 border border-brand-gold/30 animate-[slideInRight_0.25s_ease-out]">
          <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-gold" />
            Crear nuevo grupo
          </h3>
          <form onSubmit={handleCreateGroup} className="space-y-3">
            <input
              type="text"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Nombre del grupo (ej: Los Crack's del Barrio)"
              maxLength={40}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-gold/50 rounded-xl py-3 px-4 text-white text-sm placeholder-slate-600 outline-none transition-all"
              autoFocus
            />
            {createError && (
              <p className="text-xs text-red-400 font-semibold px-1">{createError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 px-4 bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating || !newGroupName.trim()}
                className="flex-1 py-2.5 px-4 bg-brand-gold hover:bg-amber-400 text-brand-dark text-xs font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {creating ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Join Group form */}
      {showJoin && (
        <div className="glass rounded-2xl p-5 border border-slate-700/60 animate-[slideInRight_0.25s_ease-out]">
          <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-brand-gold" />
            Unirse a un grupo
          </h3>
          <form onSubmit={handleJoinGroup} className="space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Código del grupo (ej: ABC123)"
              maxLength={6}
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-brand-gold/50 rounded-xl py-3 px-4 text-white text-sm font-black tracking-widest uppercase placeholder-slate-600 outline-none transition-all"
              autoFocus
            />
            {joinError && (
              <p className="text-xs text-red-400 font-semibold px-1">{joinError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="flex-1 py-2.5 px-4 bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-400 text-xs font-bold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={joining || joinCode.length < 4}
                className="flex-1 py-2.5 px-4 bg-brand-gold hover:bg-amber-400 text-brand-dark text-xs font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Hash className="w-3.5 h-3.5" />}
                {joining ? 'Uniéndose...' : 'Unirse'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups list */}
      {loadingGroups ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand-gold animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="glass rounded-3xl p-10 border border-slate-800 flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 bg-brand-gold/8 border border-brand-gold/15 rounded-2xl">
            <Users className="w-10 h-10 text-brand-gold/50" />
          </div>
          <div>
            <p className="text-slate-300 font-bold text-sm">Aún no perteneces a ningún grupo</p>
            <p className="text-slate-500 text-xs mt-1 max-w-[260px]">
              Crea uno y comparte el código con tus panas, o únete a uno con un código existente.
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => { setShowJoin(true); setShowCreate(false); }}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-900/60 border border-slate-800 hover:border-brand-gold/40 text-slate-300 text-xs font-bold rounded-xl transition-all"
            >
              <Hash className="w-3.5 h-3.5 text-brand-gold" />
              Unirse con código
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); }}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-brand-gold hover:bg-amber-400 text-brand-dark text-xs font-black rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear grupo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(group => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className="w-full glass rounded-2xl p-4 border border-slate-800 hover:border-brand-gold/30 transition-all text-left flex items-center gap-4 group glass-card-hover"
            >
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-brand-gold" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">{group.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Hash className="w-3 h-3 text-brand-gold/60" />
                  <span className="text-[11px] font-black text-brand-gold/70 tracking-widest">{group.code}</span>
                  {group.owner_id === user?.id && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full ml-1">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-brand-gold transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
