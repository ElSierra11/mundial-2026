import React, { useEffect, useRef, useState } from 'react';
import { X, Download, Share2, Award, Sparkles } from 'lucide-react';
import { playClickSound, triggerHapticFeedback } from '../utils/soundEffects';

export default function ShareCardModal({ user, predictions, matches, onClose }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [imgUrl, setImgUrl] = useState('');

  // Calculate statistics
  const gradedPreds = predictions.filter(p => p.points_earned !== null);
  const totalGraded = gradedPreds.length;
  const exactCount = gradedPreds.filter(p => p.points_earned === 3).length;
  const outcomeCount = gradedPreds.filter(p => p.points_earned === 1).length;
  
  const accuracy = totalGraded > 0 
    ? Math.round(((exactCount + outcomeCount) / totalGraded) * 100) 
    : 0;

  useEffect(() => {
    generateCard();
  }, [user, predictions]);

  const generateCard = async () => {
    setLoading(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Canvas size (FUT card aspect ratio)
    const w = 400;
    const h = 560;
    canvas.width = w;
    canvas.height = h;

    // 1. Draw Gold Shield Background
    // Draw outer glow/shadow
    ctx.shadowColor = 'rgba(229, 193, 88, 0.4)';
    ctx.shadowBlur = 20;

    // Draw FUT Shield Path
    ctx.fillStyle = '#0a0d18'; // Base dark body
    drawFutShield(ctx, 20, 20, w - 40, h - 40, 30);
    ctx.fill();

    // Disable shadow for internal lines
    ctx.shadowBlur = 0;

    // Draw Golden Frame
    const goldGrad = ctx.createLinearGradient(0, 0, w, h);
    goldGrad.addColorStop(0, '#f59e0b');
    goldGrad.addColorStop(0.3, '#fbbf24');
    goldGrad.addColorStop(0.5, '#fffbeb');
    goldGrad.addColorStop(0.7, '#d97706');
    goldGrad.addColorStop(1, '#78350f');
    
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 6;
    drawFutShield(ctx, 20, 20, w - 40, h - 40, 30);
    ctx.stroke();

    // Inner gold border
    ctx.strokeStyle = 'rgba(229, 193, 88, 0.2)';
    ctx.lineWidth = 1.5;
    drawFutShield(ctx, 26, 26, w - 52, h - 52, 27);
    ctx.stroke();

    // 2. Shiny Background Patterns (Subtle diagonal lines)
    ctx.strokeStyle = 'rgba(229, 193, 88, 0.05)';
    ctx.lineWidth = 2;
    for (let i = -w; i < w + h; i += 18) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }

    // 3. Draw Brand Titles
    ctx.fillStyle = '#e5c158';
    ctx.font = 'black 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '2px';
    ctx.fillText('RESULTADOS MUNDIALISTAS', w / 2, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px sans-serif';
    ctx.fillText('FIFA WORLD CUP 2026', w / 2, 78);

    // Divider line
    ctx.strokeStyle = 'rgba(229, 193, 88, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, 92);
    ctx.lineTo(w - 50, 92);
    ctx.stroke();

    // 4. Load & Draw User Avatar with CrossOrigin
    try {
      const avatarImg = new Image();
      avatarImg.crossOrigin = 'anonymous';
      // Load Dicebear SVG or default
      const avatarUrl = user?.avatar_url || 'https://api.dicebear.com/7.x/adventurer/png?seed=guest';
      // Convert svg api to png if needed, or dicebear accepts png directly by changing /svg to /png!
      // Let's modify the dicebear URL to get PNG since canvas has trouble drawing raw SVG files sometimes.
      const pngAvatarUrl = avatarUrl.replace('/svg?', '/png?').replace('/svg', '/png');
      
      avatarImg.src = pngAvatarUrl;
      await new Promise((resolve, reject) => {
        avatarImg.onload = resolve;
        avatarImg.onerror = () => {
          // Fallback to anonymous guest PNG avatar
          avatarImg.src = 'https://api.dicebear.com/7.x/adventurer/png?seed=guest';
          avatarImg.onload = resolve;
        };
      });

      // Draw Avatar inside circular card frame
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, 175, 52, 0, Math.PI * 2);
      ctx.clip();

      // Avatar background
      const avatarBg = ctx.createRadialGradient(w/2, 175, 10, w/2, 175, 52);
      avatarBg.addColorStop(0, '#1e293b');
      avatarBg.addColorStop(1, '#0f172a');
      ctx.fillStyle = avatarBg;
      ctx.fillRect(w/2 - 52, 175 - 52, 104, 104);

      ctx.drawImage(avatarImg, w / 2 - 48, 175 - 48, 96, 96);
      ctx.restore();

      // Golden ring around avatar
      ctx.strokeStyle = '#e5c158';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, 175, 54, 0, Math.PI * 2);
      ctx.stroke();
    } catch (err) {
      console.warn("Could not draw avatar on canvas:", err);
    }

    // 5. Draw User Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((user?.display_name || 'MUNDIALISTA').toUpperCase(), w / 2, 260);

    // 6. Draw Favorite Team / Flag
    if (user?.favorite_team) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 11px sans-serif';
      ctx.fillText(`HINCHA DE: ${user.favorite_team.toUpperCase()}`, w / 2, 280);
    }

    // Divider
    ctx.strokeStyle = 'rgba(229, 193, 88, 0.2)';
    ctx.beginPath();
    ctx.moveTo(70, 300);
    ctx.lineTo(w - 70, 300);
    ctx.stroke();

    // 7. Draw STATS Box
    const startY = 320;
    
    // Draw Stats Title
    ctx.fillStyle = '#e5c158';
    ctx.font = '900 36px sans-serif';
    ctx.fillText(`${user?.points || 0}`, w / 2, startY + 36);
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('PUNTOS TOTALES', w / 2, startY + 54);

    // Mini divider
    ctx.beginPath();
    ctx.moveTo(120, startY + 70);
    ctx.lineTo(w - 120, startY + 70);
    ctx.stroke();

    // Render 3 sub-stats columns (Exact, Accuracy, Outcomes)
    const statsCols = [
      { num: `${exactCount}`, label: 'PLENOS' },
      { num: `${accuracy}%`, label: 'EFECTIV.' },
      { num: `${outcomeCount}`, label: 'ACIERTOS' }
    ];

    const colWidth = w / 3;
    ctx.textAlign = 'center';
    statsCols.forEach((col, idx) => {
      const colX = idx * colWidth + colWidth / 2;
      
      // Number
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 20px sans-serif';
      ctx.fillText(col.num, colX, startY + 105);

      // Label
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(col.label, colX, startY + 122);
    });

    // 8. Bottom Badge (FIFA Official licensing aesthetic)
    ctx.fillStyle = 'rgba(229,193,88,0.1)';
    ctx.fillRect(w/2 - 80, h - 75, 160, 24);
    ctx.strokeStyle = 'rgba(229,193,88,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w/2 - 80, h - 75, 160, 24);

    ctx.fillStyle = '#e5c158';
    ctx.font = '900 9px sans-serif';
    ctx.fillText('TARJETA DE CAMPEÓN 2026', w / 2, h - 59);

    // Save image to URL
    try {
      const url = canvas.toDataURL('image/png');
      setImgUrl(url);
    } catch (e) {
      console.warn("Canvas exports blocked by security restrictions:", e);
    }
    setLoading(false);
  };

  const drawFutShield = (ctx, x, y, width, height, radius) => {
    // Custom FIFA shield formula: standard rectangle that curves downwards into a point at bottom center
    const cx = x + width / 2;
    const bottomY = y + height;
    
    ctx.beginPath();
    // Top-left corner
    ctx.moveTo(x + radius, y);
    // Top border
    ctx.lineTo(x + width - radius, y);
    // Top-right corner
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    
    // Right vertical border
    ctx.lineTo(x + width, y + height * 0.7);
    
    // Smooth curve towards bottom tip
    ctx.quadraticCurveTo(x + width * 0.95, y + height * 0.88, cx, bottomY);
    ctx.quadraticCurveTo(x + width * 0.05, y + height * 0.88, x, y + height * 0.7);
    
    // Left vertical border
    ctx.lineTo(x, y + radius);
    // Top-left corner
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const handleDownload = () => {
    playClickSound();
    triggerHapticFeedback(30);
    if (!imgUrl) return;
    
    const link = document.createElement('a');
    link.download = `mundialistas-tarjeta-${user?.display_name || 'usuario'}.png`;
    link.href = imgUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={() => {
            playClickSound();
            triggerHapticFeedback(15);
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-500 hover:text-white bg-slate-950/50 hover:bg-slate-950 border border-slate-850 hover:border-slate-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-1.5 mb-4 text-brand-gold">
          <Award className="w-5 h-5 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">Tarjeta Compartible</span>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview Frame */}
        <div className="relative w-[280px] h-[392px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Creando tarjeta...</span>
            </div>
          ) : (
            <img
              src={imgUrl}
              alt="FUT Card Preview"
              className="w-full h-full object-contain animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
            />
          )}
        </div>

        {/* Tip */}
        <p className="text-[10px] text-slate-500 font-medium mt-3 text-center px-4 leading-normal flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
          <span>¡Descárgala para subirla a tus historias o enviarla a WhatsApp!</span>
        </p>

        {/* Actions */}
        <div className="w-full mt-6 grid grid-cols-1 gap-3">
          <button
            onClick={handleDownload}
            disabled={loading || !imgUrl}
            className="w-full py-3 px-5 bg-brand-gold text-brand-dark hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-brand-gold/10 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
