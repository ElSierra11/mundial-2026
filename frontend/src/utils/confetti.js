// Pure CSS/JS Confetti Effect for React
export function triggerConfetti() {
  const colors = ['#e5c158', '#ef4444', '#10b981', '#6366f1', '#3b82f6', '#ec4899', '#f97316'];
  const confettiCount = 80;
  const container = document.createElement('div');
  
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '99999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  // Ensure keyframes are injected
  if (!document.getElementById('confetti-keyframes')) {
    const style = document.createElement('style');
    style.id = 'confetti-keyframes';
    style.innerHTML = `
      @keyframes confettiFall {
        0% {
          transform: translateY(-20px) rotate(0deg) translateX(0);
          opacity: 1;
        }
        100% {
          transform: translateY(105vh) rotate(720deg) translateX(100px);
          opacity: 0.3;
        }
      }
      @keyframes confettiExplode {
        0% {
          transform: translate(0, 0) scale(1) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translate(var(--x), var(--y)) scale(0.3) rotate(360deg);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create burst particles (from bottom center / center of screen)
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight * 0.7; // From lower middle

  for (let i = 0; i < confettiCount; i++) {
    const p = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 8 + 6; // 6px to 14px
    const isCircle = Math.random() > 0.5;

    p.style.position = 'absolute';
    p.style.left = `${startX}px`;
    p.style.top = `${startY}px`;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.backgroundColor = color;
    if (isCircle) p.style.borderRadius = '50%';
    p.style.transformOrigin = 'center';

    // Explosion vector
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 250 + 100;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - 80; // slightly upward bias

    p.style.setProperty('--x', `${destX}px`);
    p.style.setProperty('--y', `${destY}px`);

    const duration = Math.random() * 1.5 + 1.2; // 1.2s to 2.7s
    p.style.animation = `confettiExplode ${duration}s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`;

    container.appendChild(p);
  }

  // Create some falling particles from top
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 7 + 5;
    
    p.style.position = 'absolute';
    p.style.left = `${Math.random() * 100}vw`;
    p.style.top = `-20px`;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.backgroundColor = color;
    if (Math.random() > 0.5) p.style.borderRadius = '50%';

    const duration = Math.random() * 3 + 2.5; // 2.5s to 5.5s
    const delay = Math.random() * 1.5;
    p.style.animation = `confettiFall ${duration}s linear ${delay}s infinite`;

    container.appendChild(p);
  }

  // Play audio sound if supported
  try {
    // Standard referee whistle or goal cheer sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-84.wav'); // whistle
    audio.volume = 0.15;
    audio.play();
  } catch (e) {
    // Ignore audio play errors
  }

  // Clean up
  setTimeout(() => {
    container.style.transition = 'opacity 0.8s ease';
    container.style.opacity = '0';
    setTimeout(() => {
      container.remove();
    }, 800);
  }, 4000);
}
