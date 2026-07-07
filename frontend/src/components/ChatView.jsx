import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Shield, HelpCircle } from 'lucide-react';
import { api } from '../utils/api';

const parseISO = (str) => {
  if (!str) return new Date();
  if (!str.includes('Z') && !str.includes('+') && !str.match(/-\d{2}:\d{2}$/)) {
    return new Date(str + 'Z');
  }
  return new Date(str);
};

export default function ChatView({ user, isDemo }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // States for floating reactions
  const [activeEmojis, setActiveEmojis] = useState([]);
  const triggeredReactionsRef = useRef(new Set());

  const triggerEmojiAnimation = (emoji) => {
    const id = Date.now() + Math.random();
    setActiveEmojis(prev => [...prev, { id, emoji, left: Math.random() * 80 + 10 }]);
    setTimeout(() => {
      setActiveEmojis(prev => prev.filter(item => item.id !== id));
    }, 2500);
  };

  const sendReaction = async (emoji) => {
    triggerEmojiAnimation(emoji);
    try {
      if (isDemo) {
        const currentMsgs = JSON.parse(localStorage.getItem('demo_chat_messages') || '[]');
        const newMsg = {
          id: Date.now(),
          user_name: user?.display_name || 'Tú',
          user_avatar: user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest',
          text: `[reaction:${emoji}]`,
          timestamp: new Date().toISOString(),
          is_admin: !!user?.is_admin
        };
        const updated = [...currentMsgs, newMsg];
        localStorage.setItem('demo_chat_messages', JSON.stringify(updated));
        setMessages(updated);
      } else {
        const newMsg = await api.sendChatMessage(`[reaction:${emoji}]`);
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (e) {
      console.warn("Error sending reaction:", e);
    }
  };

  // Load chat messages
  const loadMessages = async () => {
    try {
      if (isDemo) {
        // Load from LocalStorage
        let localMsgs = localStorage.getItem('demo_chat_messages');
        if (!localMsgs) {
          // Seed initial messages
          const seed = [
            {
              id: 1,
              user_name: 'Leo Messi',
              user_avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=messi',
              text: '¡Qué partidazo de Canadá! No esperaba que Sudáfrica aguantara tanto. ¿Quiénes ya hicieron sus pronósticos para mañana?',
              timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hrs ago
              is_admin: false
            },
            {
              id: 2,
              user_name: 'Neymar Jr',
              user_avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ney',
              text: 'Jajaja Leo, yo le atiné al marcador de Brasil 2-1 Japón. ¡Sumé 3 puntos de oro! 🇧🇷🔥',
              timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago
              is_admin: false
            },
            {
              id: 3,
              user_name: 'Kylian M.',
              user_avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=kiki',
              text: '¡Ojo con Francia! Mañana contra Suecia vamos a asegurar la clasificación. ¿Vieron quién va liderando la tabla?',
              timestamp: new Date(Date.now() - 1800000).toISOString(), // 30m ago
              is_admin: false
            }
          ];
          localStorage.setItem('demo_chat_messages', JSON.stringify(seed));
          localMsgs = JSON.stringify(seed);
        }
        setMessages(JSON.parse(localMsgs));
      } else {
        // Load from server
        setLoading(true);
        const serverMsgs = await api.getChatMessages();
        setMessages(serverMsgs);
        setLoading(false);
      }
    } catch (e) {
      console.error("Error loading chat messages:", e);
    }
  };

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [isDemo]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync floating reactions when new messages arrive
  useEffect(() => {
    messages.forEach(msg => {
      if (msg.text && msg.text.startsWith('[reaction:') && msg.text.endsWith(']')) {
        if (!triggeredReactionsRef.current.has(msg.id)) {
          triggeredReactionsRef.current.add(msg.id);
          const msgTime = parseISO(msg.timestamp).getTime();
          const now = Date.now();
          if (now - msgTime < 15000) {
            const emoji = msg.text.slice(10, -1);
            triggerEmojiAnimation(emoji);
          }
        }
      }
    });
  }, [messages]);

  const displayMessages = messages.filter(msg => !msg.text?.startsWith('[reaction:'));

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      if (isDemo) {
        // Handle local message send
        const currentMsgs = JSON.parse(localStorage.getItem('demo_chat_messages') || '[]');
        const newMsg = {
          id: Date.now(),
          user_name: user?.display_name || 'Tú',
          user_avatar: user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest',
          text: textToSend,
          timestamp: new Date().toISOString(),
          is_admin: !!user?.is_admin
        };
        const updated = [...currentMsgs, newMsg];
        localStorage.setItem('demo_chat_messages', JSON.stringify(updated));
        setMessages(updated);

        // Simulate a chatbot reply from players after 1.5 seconds
        setTimeout(() => {
          const replies = [
            {
              name: 'Cristiano Ronaldo',
              avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=cr7',
              texts: [
                '¡Siiiiuuu! Yo estoy enfocado en el partido de Portugal mañana. ¡Marcador exacto cantado!',
                'No importa quién va primero ahora, lo que importa es el final del mundial. ¡El trabajo duro paga!',
                'Interesante predicción, pero yo sé más de táctica. ¡Vamos por la punta del ranking!'
              ]
            },
            {
              name: 'Leo Messi',
              avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=messi',
              texts: [
                'Tranquilos muchachos, paso a paso. Se viene una fecha muy difícil de predecir.',
                'jaja buena esa, yo creo que Colombia ganará mañana también.',
                'Felicidades por tus puntos, el ranking está muy apretado.'
              ]
            },
            {
              name: 'Neymar Jr',
              avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ney',
              texts: [
                'Oye, ¿vieron el golazo de Brasil? ¡Eso sí fue magia! 🇧🇷🕺',
                'Quien no le apueste al menos 2 goles a Argentina mañana está loco 😂',
                '¡Jajaja vamos a ver quién acierta la ronda de Octavos!'
              ]
            }
          ];

          // Pick a random player and a random reply text
          const randomPlayer = replies[Math.floor(Math.random() * replies.length)];
          const randomText = randomPlayer.texts[Math.floor(Math.random() * randomPlayer.texts.length)];

          const botMsg = {
            id: Date.now() + 1,
            user_name: randomPlayer.name,
            user_avatar: randomPlayer.avatar,
            text: randomText,
            timestamp: new Date().toISOString(),
            is_admin: false
          };

          const latestMsgs = JSON.parse(localStorage.getItem('demo_chat_messages') || '[]');
          const updatedWithBot = [...latestMsgs, botMsg];
          localStorage.setItem('demo_chat_messages', JSON.stringify(updatedWithBot));
          setMessages(updatedWithBot);
        }, 1500);

      } else {
        // Call Server API
        const newMsg = await api.sendChatMessage(textToSend);
        setMessages(prev => [...prev, newMsg]);
      }
    } catch (err) {
      alert("Error al enviar mensaje: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = parseISO(isoString);
      
      const getBogotaDateString = (d) => {
        return d.toLocaleDateString('es-CO', {
          timeZone: 'America/Bogota',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        });
      };
      
      const isToday = getBogotaDateString(date) === getBogotaDateString(new Date());
      if (isToday) {
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
      }
      return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-[520px] glass rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-gold/15 rounded-xl border border-brand-gold/25 text-brand-gold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white">Muro de Amigos</h3>
            <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Banter y Celebraciones en Vivo</span>
          </div>
        </div>
        {isDemo && (
          <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full tracking-wide">
            Simulador Demo
          </span>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
            <MessageSquare className="w-12 h-12 opacity-15" />
            <p className="text-xs font-semibold">¡Comienza el debate! Sé el primero en escribir.</p>
          </div>
        ) : (
          displayMessages.map((msg) => {
            const isMe = msg.user_name === user?.display_name || msg.user_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-start max-w-[80%] ${
                  isMe ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                <img
                  src={msg.user_avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
                  alt=""
                  className="w-8 h-8 rounded-full border border-slate-800 bg-slate-950 flex-shrink-0"
                />
                <div className="space-y-1">
                  <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? 'justify-end' : ''}`}>
                    <span className="font-bold text-slate-300">{msg.user_name}</span>
                    {msg.is_admin && (
                      <Shield className="w-3 h-3 text-brand-purple" title="Administrador" />
                    )}
                    <span className="text-slate-650 font-medium">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-xs font-medium leading-relaxed break-words border ${
                      isMe
                        ? 'bg-brand-gold/10 border-brand-gold/25 text-slate-200 rounded-tr-none'
                        : 'bg-slate-900/60 border-slate-850/80 text-slate-300 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Emojis elements */}
      {activeEmojis.map(e => (
        <span
          key={e.id}
          className="absolute bottom-20 pointer-events-none text-2xl z-30 select-none animate-[floatUpEmoji_2.2s_cubic-bezier(0.08,0.82,0.17,1)_forwards]"
          style={{ left: `${e.left}%` }}
        >
          {e.emoji}
        </span>
      ))}

      {/* Emojis float animation styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatUpEmoji {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translateY(-20px) scale(1.3);
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-340px) scale(0.8);
            opacity: 0;
          }
        }
      `}} />

      {/* Quick Reaction Bar */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-900/60 flex items-center justify-between gap-2 shrink-0 relative z-20">
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Reaccionar:</span>
        <div className="flex items-center gap-1.5">
          {['⚽', '🔥', '🏆', '😱', '🤫', '📣'].map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => sendReaction(emoji)}
              className="w-7.5 h-7.5 rounded-lg bg-slate-900/40 border border-slate-850 hover:border-brand-gold/30 hover:bg-slate-850 active:scale-90 transition-all text-sm flex items-center justify-center shrink-0"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Input Message Area */}
      <form onSubmit={handleSendMessage} className="p-4 bg-slate-950/65 border-t border-slate-900/80 flex items-center gap-3 relative z-20">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={sending}
          className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl py-3 px-4 text-white text-xs placeholder-slate-650 focus:outline-none focus:border-brand-gold/45 transition-all"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="p-3 rounded-xl bg-brand-gold hover:bg-amber-400 text-brand-dark transition-all disabled:opacity-50 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-gold/15"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
