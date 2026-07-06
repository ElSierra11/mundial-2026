import React, { useState, useEffect, useRef } from 'react';
import { playClickSound, triggerHapticFeedback } from '../utils/soundEffects';
import { Trophy, Play, RotateCcw, Wifi } from 'lucide-react';

export default function OfflineGame({ onRetryConnection }) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('offline_high_score') || '0', 10)
  );
  const [gameOver, setGameOver] = useState(false);

  // References for game loop
  const gameStateRef = useRef({
    ball: { x: 150, y: 100, radius: 24, vx: 2, vy: 0 },
    gravity: 0.35,
    bounceStrength: -8.5,
    particles: [],
    width: 300,
    height: 450,
  });

  const requestRef = useRef();

  useEffect(() => {
    // Save high score
    localStorage.setItem('offline_high_score', highScore.toString());
  }, [highScore]);

  // Handle canvas size and basic setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set scale for high DPI screens
    const width = 320;
    const height = 480;
    canvas.width = width;
    canvas.height = height;
    
    gameStateRef.current.width = width;
    gameStateRef.current.height = height;
    
    // Draw initial state
    drawGame(ctx);
  }, []);

  // Main game loop
  const updateGame = () => {
    const state = gameStateRef.current;
    const { ball, gravity, width, height } = state;

    // Apply gravity
    ball.vy += gravity;
    
    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Bounce off left/right walls
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = -ball.vx * 0.8;
      playClickSound();
    } else if (ball.x + ball.radius > width) {
      ball.x = width - ball.radius;
      ball.vx = -ball.vx * 0.8;
      playClickSound();
    }

    // Top border bounce
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy = -ball.vy * 0.5;
    }

    // Ground collision: GAME OVER
    if (ball.y + ball.radius > height - 10) {
      setIsPlaying(false);
      setGameOver(true);
      triggerHapticFeedback(150);
      return; // Stop loop
    }

    // Update particles
    state.particles.forEach((p, idx) => {
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.03;
      p.radius *= 0.95;
      if (p.alpha <= 0 || p.radius < 1) {
        state.particles.splice(idx, 1);
      }
    });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawGame(ctx);
    }

    requestRef.current = requestAnimationFrame(updateGame);
  };

  const drawGame = (ctx) => {
    const state = gameStateRef.current;
    const { ball, particles, width, height } = state;

    // Clear background with nice pitch gradient
    ctx.clearRect(0, 0, width, height);
    
    // Pitch background color (rich green)
    const bgGradient = ctx.createRadialGradient(width/2, height/3, 10, width/2, height/2, width);
    bgGradient.addColorStop(0, '#062c14');
    bgGradient.addColorStop(1, '#030c05');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw field lines (retro feel)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.lineWidth = 2;
    // Outer border
    ctx.strokeRect(10, 10, width - 20, height - 20);
    // Center circle
    ctx.beginPath();
    ctx.arc(width/2, height/2, 60, 0, Math.PI * 2);
    ctx.stroke();
    // Center line
    ctx.beginPath();
    ctx.moveTo(10, height/2);
    ctx.lineTo(width - 10, height/2);
    ctx.stroke();
    // Penalty area at bottom
    ctx.strokeRect(width/2 - 70, height - 60, 140, 50);

    // Draw goal line bar at bottom
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(10, height - 14, width - 20, 4);

    // Draw particles
    particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw soccer ball
    ctx.save();
    // Glowing neon border
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#e5c158';
    
    // Draw ball body
    const ballGrad = ctx.createRadialGradient(
      ball.x - ball.radius * 0.3,
      ball.y - ball.radius * 0.3,
      2,
      ball.x,
      ball.y,
      ball.radius
    );
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.85, '#e2e8f0');
    ballGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw pentagon patterns (classical football)
    ctx.shadowBlur = 0; // disable shadow for internal lines
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#0f172a';
    
    // Draw a center pentagon
    drawPentagon(ctx, ball.x, ball.y, ball.radius * 0.35, 0);

    // Draw rays from pentagon corners
    const angles = [0, 72, 144, 216, 288];
    angles.forEach(angle => {
      const rad = (angle - 90) * Math.PI / 180;
      const x1 = ball.x + Math.cos(rad) * (ball.radius * 0.35);
      const y1 = ball.y + Math.sin(rad) * (ball.radius * 0.35);
      const x2 = ball.x + Math.cos(rad) * ball.radius;
      const y2 = ball.y + Math.sin(rad) * ball.radius;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    ctx.restore();
  };

  const drawPentagon = (ctx, cx, cy, r, rot) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (rot + i * 72 - 90) * Math.PI / 180;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const handleCanvasClick = (e) => {
    if (!isPlaying) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const state = gameStateRef.current;
    const { ball, bounceStrength } = state;

    // Check distance to ball center
    const dist = Math.hypot(clickX - ball.x, clickY - ball.y);

    // Click is within ball or close to it
    if (dist < ball.radius + 30) {
      playClickSound();
      triggerHapticFeedback(30);

      // Bounce ball up
      ball.vy = bounceStrength;
      
      // Calculate horizontal push based on click position relative to ball
      const dx = ball.x - clickX;
      ball.vx = dx * 0.25; // push sideways

      // Limit horizontal velocity
      ball.vx = Math.max(-6, Math.min(6, ball.vx));

      // Add points
      const newScore = score + 1;
      setScore(newScore);
      if (newScore > highScore) {
        setHighScore(newScore);
      }

      // Add particles
      for (let i = 0; i < 12; i++) {
        state.particles.push({
          x: ball.x,
          y: ball.y + ball.radius,
          vx: (Math.random() - 0.5) * 6,
          vy: Math.random() * 3 + 1,
          radius: Math.random() * 4 + 2,
          alpha: 1,
          color: Math.random() > 0.5 ? '#e5c158' : '#10b981',
        });
      }
    }
  };

  const startGame = () => {
    playClickSound();
    triggerHapticFeedback(40);
    
    // Reset ball
    const state = gameStateRef.current;
    state.ball = { x: 160, y: 80, radius: 22, vx: (Math.random() - 0.5) * 4, vy: -2 };
    state.particles = [];
    
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  // Start/Stop game loop
  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, score]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950/95 backdrop-blur-md rounded-3xl border border-emerald-500/20 max-w-sm mx-auto shadow-2xl shadow-emerald-950/20 animate-[slideInRight_0.3s_ease-out]">
      {/* Network offline banner */}
      <div className="flex items-center gap-2 mb-3 bg-red-950/40 border border-red-500/30 text-red-400 py-1.5 px-4 rounded-full text-xs font-bold">
        <Wifi className="w-4 h-4 shrink-0 animate-pulse" />
        <span>Estás desconectado del servidor</span>
      </div>

      <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-widest text-center mb-1">
        ¿Qué tal unas dominadas?
      </h3>
      <p className="text-[10px] text-slate-500 font-semibold text-center mb-4 leading-snug">
        Toca el balón para mantenerlo en el aire y supera tu récord.
      </p>

      {/* Game Canvas */}
      <div className="relative border border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-900 bg-[radial-gradient(circle_at_center,_#0a180f_0%,_#030905_100%)]">
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasClick}
          onTouchStart={(e) => {
            if (e.touches && e.touches[0]) {
              handleCanvasClick(e.touches[0]);
            }
          }}
          className="block w-[300px] h-[420px] cursor-crosshair"
        />

        {/* Start Overlay */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold flex items-center justify-center mb-4 animate-bounce">
              <Play className="w-8 h-8 fill-brand-gold/10 ml-1" />
            </div>
            <button
              onClick={startGame}
              className="py-2.5 px-6 bg-brand-gold text-brand-dark hover:bg-amber-400 text-xs font-extrabold rounded-full uppercase tracking-wider transition-all shadow-lg shadow-brand-gold/10"
            >
              Comenzar a Jugar
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.25s_ease-out]">
            <span className="text-[10px] font-black tracking-widest text-red-500 uppercase mb-1">Pérdida de Balón</span>
            <h4 className="text-xl font-black text-white uppercase tracking-wider mb-2">¡Fin del Juego!</h4>
            
            <div className="bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-2xl mb-5 text-slate-300 text-xs font-semibold flex flex-col gap-1 items-center">
              <span>Puntaje: <strong className="text-white text-sm">{score}</strong></span>
              <span className="text-[10px] text-brand-gold flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 fill-brand-gold/10" /> Récord: {highScore}
              </span>
            </div>

            <button
              onClick={startGame}
              className="flex items-center gap-1.5 py-2.5 px-5 bg-brand-gold text-brand-dark hover:bg-amber-400 text-xs font-extrabold rounded-full uppercase tracking-wider transition-all shadow-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Volver a Intentar</span>
            </button>
          </div>
        )}

        {/* Live Score indicators */}
        {isPlaying && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none select-none">
            <span className="text-xl font-black text-white drop-shadow-md">
              Score: {score}
            </span>
            <span className="text-xs font-bold text-brand-gold flex items-center gap-1 bg-slate-900/60 py-1 px-2 rounded-lg border border-slate-800 backdrop-blur-sm shadow-sm">
              <Trophy className="w-3.5 h-3.5" /> Récord: {highScore}
            </span>
          </div>
        )}
      </div>

      {/* Connection retry button */}
      <button
        onClick={() => {
          playClickSound();
          triggerHapticFeedback(30);
          if (onRetryConnection) onRetryConnection();
        }}
        className="w-full mt-4 py-2.5 px-4 rounded-xl border border-slate-800 hover:border-brand-gold/30 hover:bg-slate-900/80 text-[10px] font-extrabold text-slate-400 hover:text-white transition-all uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <Wifi className="w-3.5 h-3.5 text-brand-gold" />
        <span>Reintentar Conexión</span>
      </button>
    </div>
  );
}
