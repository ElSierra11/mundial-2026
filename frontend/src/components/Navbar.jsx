import { Trophy, Calendar, ShieldCheck, LogOut, Sparkles, GitBranch, MessageSquare, User, Users, Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { playClickSound, triggerHapticFeedback } from '../utils/soundEffects';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, isDemo, isTtsEnabled, toggleTts }) {
  const handleTabClick = (tabId) => {
    playClickSound();
    triggerHapticFeedback(15);
    setActiveTab(tabId);
  };

  return (
    <>
      {/* Desktop Header Navbar */}
      <header className="hidden md:block w-full sticky top-0 z-50 px-4 py-4 bg-brand-dark/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-9 h-9 rounded-xl object-cover border border-brand-gold/30 shadow-md shadow-brand-gold/5"
            />
            <span className="font-extrabold text-sm xl:text-lg tracking-tight bg-gradient-to-r from-white to-brand-gold bg-clip-text text-transparent hidden lg:inline-block">
              RESULTADOS MUNDIALISTAS
            </span>
            {isDemo && (
              <span className="ml-1.5 py-0.5 px-2 rounded-full bg-brand-accent/10 border border-brand-accent/30 text-[10px] font-bold text-brand-accent tracking-wider uppercase">
                Demo
              </span>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 xl:gap-2 bg-slate-950/40 p-1 lg:p-1.5 rounded-2xl border border-slate-800/80">
            {[
              { id: 'bracket',     icon: <GitBranch className="w-4 h-4" />,     label: 'Llave'    },
              { id: 'matches',     icon: <Calendar className="w-4 h-4" />,      label: 'Partidos' },
              { id: 'leaderboard', icon: <Trophy className="w-4 h-4" />,        label: 'Ranking'  },
              { id: 'chat',        icon: <MessageSquare className="w-4 h-4" />, label: 'Chat'     },
              { id: 'groups',      icon: <Users className="w-4 h-4" />,         label: 'Grupos'   },
              { id: 'trivia',      icon: <HelpCircle className="w-4 h-4" />,    label: 'Trivia'   },
              { id: 'profile',     icon: <User className="w-4 h-4" />,          label: 'Perfil'   },
              ...(user?.is_admin ? [{ id: 'admin', icon: <ShieldCheck className="w-4 h-4" />, label: 'Admin' }] : [])
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const activeStyle = tab.id === 'admin' 
                ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' 
                : 'bg-brand-gold text-brand-dark shadow-lg shadow-brand-gold/15';
              const inactiveStyle = 'text-slate-400 hover:text-slate-200';
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-1 lg:gap-2 py-1.5 px-2.5 xl:px-4 rounded-xl text-xs xl:text-sm font-semibold transition-all ${
                    isActive ? activeStyle : inactiveStyle
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 xl:gap-3 shrink-0">
            {/* TTS volume toggle */}
            <button
              onClick={() => {
                playClickSound();
                triggerHapticFeedback(15);
                toggleTts();
              }}
              className={`p-2.5 rounded-xl border transition-all ${
                isTtsEnabled
                  ? 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 text-slate-500 hover:text-slate-400'
              }`}
              title={isTtsEnabled ? "Silenciar narración de goles" : "Activar narración de goles"}
            >
              {isTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2 xl:gap-3 bg-slate-900/40 py-1.5 pl-2 pr-3 xl:pl-3 xl:pr-4 rounded-2xl border border-slate-800">
              <img
                src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
                alt={user?.display_name}
                className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800"
              />
              <div className="text-left hidden xl:block">
                <p className="text-xs font-semibold text-slate-300 max-w-[100px] truncate">
                  {user?.display_name}
                </p>
                <p className="text-[11px] font-bold text-brand-gold flex items-center gap-0.5 leading-none">
                  <Sparkles className="w-3 h-3 fill-brand-gold/20" />
                  <span>{user?.points || 0} Pts</span>
                </p>
              </div>
              <div className="xl:hidden text-center min-w-[32px]">
                <p className="text-[11px] font-bold text-brand-gold leading-none">
                  {user?.points || 0} Pts
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound();
                triggerHapticFeedback(30);
                onLogout();
              }}
              className="p-2.5 rounded-xl border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Header (Fixed at top for profile context) */}
      <header className="md:hidden w-full flex items-center justify-between px-5 py-3.5 bg-brand-dark/95 backdrop-blur-md border-b border-slate-900 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-7 h-7 rounded-lg object-cover border border-brand-gold/30 shadow-sm"
          />
          <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-white to-brand-gold bg-clip-text text-transparent">RESULTADOS MUNDIALISTAS</span>
          {isDemo && (
            <span className="py-0.5 px-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-[8px] font-bold text-brand-gold tracking-wide uppercase">
              Demo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* TTS volume toggle */}
          <button
            onClick={() => {
              playClickSound();
              triggerHapticFeedback(15);
              toggleTts();
            }}
            className={`p-2 rounded-xl border transition-all ${
              isTtsEnabled
                ? 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold'
                : 'border-slate-800 bg-slate-900/40 text-slate-500'
            }`}
            title={isTtsEnabled ? "Silenciar" : "Activar narración"}
          >
            {isTtsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* User info widget */}
          <div className="flex items-center gap-2 bg-slate-900/50 py-1 px-2.5 rounded-xl border border-slate-800">
            <img
              src={user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
              alt={user?.display_name}
              className="w-6 h-6 rounded-full border border-slate-700 bg-slate-800"
            />
            <span className="text-xs font-bold text-brand-gold">{user?.points || 0} Pts</span>
          </div>

          <button
            onClick={() => {
              playClickSound();
              triggerHapticFeedback(30);
              onLogout();
            }}
            className="p-2 rounded-xl text-slate-400 active:text-red-400 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Sticky bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-brand-dark/95 backdrop-blur-lg border-t border-slate-900/80 py-2 px-2 flex justify-around items-center">
        {[
          { id: 'bracket',     icon: <GitBranch className="w-5 h-5" />,     label: 'Llave'    },
          { id: 'matches',     icon: <Calendar className="w-5 h-5" />,      label: 'Partidos' },
          { id: 'leaderboard', icon: <Trophy className="w-5 h-5" />,        label: 'Ranking'  },
          { id: 'groups',      icon: <Users className="w-5 h-5" />,         label: 'Grupos'   },
          { id: 'chat',        icon: <MessageSquare className="w-5 h-5" />, label: 'Chat'     },
          { id: 'trivia',      icon: <HelpCircle className="w-5 h-5" />,    label: 'Trivia'   },
          { id: 'profile',     icon: <User className="w-5 h-5" />,          label: 'Perfil'   },
          ...(user?.is_admin ? [{ id: 'admin', icon: <ShieldCheck className="w-5 h-5" />, label: 'Admin' }] : [])
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? tab.id === 'admin' ? 'text-brand-purple' : 'text-brand-gold'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                {tab.icon}
              </span>
              <span className={`text-[9px] font-bold tracking-wider transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {tab.label}
              </span>
              {/* Active dot indicator */}
              {isActive && (
                <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                  tab.id === 'admin' ? 'bg-brand-purple' : 'bg-brand-gold'
                } shadow-lg`} />
              )}
            </button>
          );
        })}
      </nav>
      {/* Spacer for mobile bottom nav so content doesn't get covered */}
      <div className="md:hidden h-16"></div>
    </>
  );
}
