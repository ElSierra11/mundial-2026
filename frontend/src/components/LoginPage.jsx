import React, { useState } from 'react';
import { Trophy, ShieldAlert, MapPin, Shield, Sparkles, User, Mail, Lock } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, onEmailLogin, onEmailRegister, loginError = '', onClearError }) {
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Email/Password states
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Combine external error (from App) with local error
  const error = loginError || localError;
  const clearError = () => {
    setLocalError('');
    if (onClearError) onClearError();
  };

  const handleCredentialResponse = async (response) => {
    setLoading(true);
    clearError();
    try {
      await onLoginSuccess(response.credential, false, '', '');
    } catch (err) {
      setLocalError('Error al iniciar sesión con Google: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    clearError();
    try {
      await onLoginSuccess('mock_invitado@polla.com_Invitado Demo', true, 'invitado@polla.com', 'Invitado Demo');
    } catch (err) {
      setLocalError('Error al ingresar en modo demo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegistering && !displayName)) {
      setLocalError('Por favor, completa todos los campos requeridos.');
      return;
    }
    setLoading(true);
    clearError();
    try {
      if (isRegistering) {
        await onEmailRegister(email, password, displayName);
      } else {
        await onEmailLogin(email, password);
      }
    } catch (err) {
      setLocalError(err.message || 'Error en la autenticación por correo');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    /* global google */
    if (typeof google !== 'undefined') {
      try {
        google.accounts.id.initialize({
          client_id: '187358281044-0b7p18pq73th8g0qvhtd4vmsi4kcsg0j.apps.googleusercontent.com',
          callback: handleCredentialResponse,
        });
        google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          {
            theme: 'outline',
            size: 'large',
            width: '320',
            shape: 'pill',
            text: 'signin_with',
            locale: 'es',
          }
        );
      } catch (err) {
        console.error('Error rendering Google signin button:', err);
      }
    }
  }, [isRegistering]); // Re-render Google button when form mode changes to ensure container ID exists

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden select-none"
      style={{ background: 'radial-gradient(ellipse at top, #1a1f35 0%, #080b14 60%, #030508 100%)' }}
    >
      {/* Background particle glows */}
      <div style={{ position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, rgba(229,193,88,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', left: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(220,38,38,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '-5%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(22,163,74,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Card */}
      <div className="w-full relative z-10 my-8" style={{ maxWidth: '400px' }}>

        {/* Outer glow border around card */}
        <div style={{ position: 'absolute', inset: '-1px', borderRadius: '28px', background: 'linear-gradient(135deg, rgba(220,38,38,0.4), rgba(229,193,88,0.3), rgba(22,163,74,0.4))', padding: '1px', zIndex: -1 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '27px', background: '#0d1120' }} />
        </div>

        <div
          style={{
            background: 'linear-gradient(180deg, #111827 0%, #0d1120 100%)',
            borderRadius: '28px',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
            padding: '36px 28px 28px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top multicolor bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #dc2626 0%, #e5c158 33%, #16a34a 66%, #1d4ed8 100%)', borderRadius: '28px 28px 0 0' }} />

          {/* Trophy Icon */}
          <div className="flex flex-col items-center mb-6">
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              {/* Outer glow ring */}
              <div style={{
                width: '90px', height: '90px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(229,193,88,0.25) 0%, rgba(229,193,88,0.05) 60%, transparent 80%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {/* Inner badge */}
                <div style={{
                  width: '68px', height: '68px', borderRadius: '18px',
                  background: 'linear-gradient(145deg, #1e2438, #151929)',
                  border: '1.5px solid rgba(229,193,88,0.45)',
                  boxShadow: '0 0 24px rgba(229,193,88,0.2), inset 0 1px 0 rgba(229,193,88,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden'
                }}>
                  <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '2px', lineHeight: 1.1 }}>
              Resultados
            </h1>
            <h2 style={{ fontSize: '30px', fontWeight: 900, background: 'linear-gradient(135deg, #f59e0b, #e5c158, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: '10px' }}>
              MUNDIALISTAS
            </h2>

            {/* FIFA badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                FIFA World Cup 2026
              </span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/25 text-red-400 flex items-start gap-2.5 text-xs animate-[shake_0.4s_ease-in-out]">
              <ShieldAlert style={{ width: '15px', height: '15px', flexShrink: 0, marginTop: '1px' }} />
              <span className="flex-1">{error}</span>
              <button onClick={clearError} className="text-red-500 hover:text-red-400 font-bold ml-1">&times;</button>
            </div>
          )}

          {/* Form and Buttons area */}
          <div className="space-y-4">
            
            {/* Standard Email/Password Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              {isRegistering && (
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Tu nombre o apodo"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required={isRegistering}
                    className="w-full bg-[#0a0d14] text-slate-100 placeholder:text-slate-500 rounded-full pl-11 pr-4 py-2.5 text-xs border border-slate-800/80 focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/20 outline-none transition-all"
                  />
                </div>
              )}

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  placeholder="Tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#0a0d14] text-slate-100 placeholder:text-slate-500 rounded-full pl-11 pr-4 py-2.5 text-xs border border-slate-800/80 focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/20 outline-none transition-all"
                />
              </div>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#0a0d14] text-slate-100 placeholder:text-slate-500 rounded-full pl-11 pr-4 py-2.5 text-xs border border-slate-800/80 focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/20 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-full text-xs font-bold text-[#05070a] tracking-wider uppercase transition-all duration-300 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #e5c158 0%, #c29f3c 100%)',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
                onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
              >
                {loading ? 'Procesando...' : isRegistering ? 'Crear Cuenta y Entrar' : 'Iniciar Sesión'}
              </button>
            </form>

            {/* Toggle Sign-In / Register Mode */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  clearError();
                  setIsRegistering(!isRegistering);
                }}
                className="text-[11px] text-slate-400 hover:text-brand-gold font-medium transition-colors outline-none"
              >
                {isRegistering
                  ? '¿Ya tienes una cuenta? Inicia Sesión'
                  : '¿No tienes cuenta? Regístrate aquí'}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize: '10px', color: '#334155', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>o</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Google Sign-In */}
            <div className="space-y-2">
              <p style={{ textAlign: 'center', fontSize: '9px', color: '#475569', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Google Sign-In oficial
              </p>

              <div style={{
                padding: '1.5px',
                borderRadius: '50px',
                background: 'linear-gradient(135deg, rgba(220,38,38,0.7), rgba(229,193,88,0.5), rgba(66,133,244,0.7))',
              }}>
                <div style={{
                  background: '#0d1120',
                  borderRadius: '48px',
                  minHeight: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  <div
                    id="google-signin-btn"
                    style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>Cargando botón de Google...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize: '10px', color: '#334155', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>o</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Guest / Demo button */}
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '13px 20px',
                borderRadius: '50px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                color: '#94a3b8',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(229,193,88,0.4)';
                e.currentTarget.style.background = 'rgba(229,193,88,0.05)';
                e.currentTarget.style.color = '#e5c158';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <Sparkles style={{ width: '13px', height: '13px', color: '#e5c158', flexShrink: 0 }} />
              <span>Probar en Modo Demo</span>
            </button>

            {/* Security notice */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', paddingTop: '4px' }}>
              <Shield style={{ width: '12px', height: '12px', color: 'rgba(22,163,74,0.5)', flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: '#334155' }}>Acceso oficial cifrado · Sin contraseñas requeridas para Google</span>
            </div>
          </div>

          {/* Loading indicator */}
          {loading && (
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#e5c158', fontSize: '11px', fontWeight: 600 }}>
              <div style={{ width: '12px', height: '12px', border: '2px solid #e5c158', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <span>Verificando credenciales...</span>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
            <span style={{ fontSize: '10px', color: '#1e293b' }}>🌎 USA · Canadá · México — FIFA World Cup 2026</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
