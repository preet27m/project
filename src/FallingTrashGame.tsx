import React, { useRef, useEffect } from 'react';

// Only garbage-related, dark-themed emojis (updated with new items)
const TRASH_EMOJIS = [
  '🧻', // paper roll
  '🛢️', // oil drum (can)
  '📦', // cardboard box
  '🧴', // bottle
  '📰', // newspaper
  '📄', // paper
  '🥤', // plastic cup
  '🧃', // juice box/carton
  '🧊', // ice (as a stand-in for glass)
  '🫙', // jar
  '📀', // disc
  '🥥', // coconut
  '🥜', // peanut
  '🧋', // bubble tea
  '🧣', // scarf
  '🔋', // battery
];
const PARTICLE_COLORS = ['#222', '#444', '#555', '#333', '#111']; // dark colors

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// Score popup type
interface ScorePopup {
  x: number;
  y: number;
  value: number;
  alpha: number;
  vy: number;
  scale: number;
}

const FallingTrashGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mouseX = useRef<number>(window.innerWidth / 2);
  const score = useRef<number>(0);
  const trash = useRef<any[]>([]);
  const particles = useRef<any[]>([]);
  const scorePopups = useRef<ScorePopup[]>([]);
  // Responsive basket size
  const getBasketWidth = () => Math.max(80, window.innerWidth * 0.18);
  const getBasketHeight = () => Math.max(40, window.innerHeight * 0.06);

  // Responsive canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Mouse/touch movement
  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      let x = 0;
      if ('touches' in e && e.touches.length > 0) {
        x = e.touches[0].clientX;
      } else if ('clientX' in e) {
        x = e.clientX;
      }
      mouseX.current = x;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
    };
  }, []);

  // Game loop
  useEffect(() => {
    let basketGlow = 0;
    let basketGlowDir = 1;
    function loop(now: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      // Deep blue-grey gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#232946');
      grad.addColorStop(0.5, '#232946');
      grad.addColorStop(1, '#181c2f');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Responsive basket size
      const basketWidth = getBasketWidth();
      const basketHeight = getBasketHeight();

      // Spawn trash
      if (Math.random() < 0.025) {
        const size = randomBetween(Math.max(32, w * 0.035), Math.max(44, w * 0.055));
        trash.current.push({
          x: randomBetween(30, w - 30),
          y: -40,
          vy: randomBetween(2, 4),
          emoji: TRASH_EMOJIS[Math.floor(Math.random() * TRASH_EMOJIS.length)],
          size,
        });
      }
      // Update and draw trash
      for (let i = trash.current.length - 1; i >= 0; i--) {
        const t = trash.current[i];
        t.y += t.vy;
        ctx.font = `${t.size}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.globalAlpha = 1;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#222';
        ctx.fillText(t.emoji, t.x, t.y);
        ctx.shadowBlur = 0;
        // Check for catch
        const basketY = h - basketHeight - 20;
        const basketX = Math.max(Math.min(mouseX.current, w - basketWidth / 2), basketWidth / 2);
        if (
          t.y + t.size > basketY &&
          t.x > basketX - basketWidth / 2 &&
          t.x < basketX + basketWidth / 2
        ) {
          // Caught!
          score.current++;
          // Particle burst
          for (let j = 0; j < 18; j++) {
            particles.current.push({
              x: t.x,
              y: basketY,
              vx: Math.cos((j / 18) * 2 * Math.PI) * randomBetween(2, 5),
              vy: Math.sin((j / 18) * 2 * Math.PI) * randomBetween(2, 5),
              alpha: 1,
              color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
            });
          }
          // Score popup
          scorePopups.current.push({
            x: t.x,
            y: basketY,
            value: 1,
            alpha: 1,
            vy: -1.2,
            scale: 1.2,
          });
          trash.current.splice(i, 1);
        } else if (t.y > h + 50) {
          // Missed
          trash.current.splice(i, 1);
        }
      }
      // Update and draw particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.alpha -= 0.025;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.fill();
        if (p.alpha <= 0) particles.current.splice(i, 1);
      }
      ctx.globalAlpha = 1;
      // Update and draw score popups
      for (let i = scorePopups.current.length - 1; i >= 0; i--) {
        const popup = scorePopups.current[i];
        popup.y += popup.vy;
        popup.alpha -= 0.025;
        popup.scale += 0.01;
        ctx.save();
        ctx.globalAlpha = Math.max(0, popup.alpha);
        ctx.font = `bold ${Math.round(32 * popup.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fff';
        ctx.fillText('+1', popup.x, popup.y);
        ctx.restore();
        if (popup.alpha <= 0) scorePopups.current.splice(i, 1);
      }
      // Animate basket glow
      basketGlow += basketGlowDir * 0.08;
      if (basketGlow > 1) { basketGlow = 1; basketGlowDir = -1; }
      if (basketGlow < 0.2) { basketGlow = 0.2; basketGlowDir = 1; }
      // Draw dustbin at the bottom with subtle glow
      const basketY = h - basketHeight - 20;
      const basketX = Math.max(Math.min(mouseX.current, w - basketWidth / 2), basketWidth / 2);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(basketX, basketY + basketHeight / 2, basketWidth / 2, basketHeight / 2, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#111'; // even darker
      ctx.shadowColor = `rgba(180,220,255,${0.25 * basketGlow})`;
      ctx.shadowBlur = 32 * basketGlow;
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.stroke();
      // Enlarge dustbin emoji
      ctx.font = `${Math.round(basketHeight * 1.25)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#181818'; // darkest fill for emoji
      ctx.shadowColor = `rgba(180,220,255,${0.18 * basketGlow})`;
      ctx.shadowBlur = 8 * basketGlow;
      ctx.fillText('🗑️', basketX, basketY + basketHeight / 2 + 2);
      ctx.shadowBlur = 0;
      // Draw score (top right)
      ctx.font = `bold ${Math.round(Math.max(24, w * 0.025))}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#232946';
      ctx.shadowBlur = 6;
      ctx.fillText(`Score: ${score.current}`, w - 32, 24);
      ctx.shadowBlur = 0;
      // Next frame
      animationRef.current = requestAnimationFrame(loop);
    }
    animationRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        zIndex: 0,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        touchAction: 'none',
        background: 'transparent',
        transition: 'background 0.3s',
      }}
      tabIndex={-1}
      aria-hidden="true"
    />
  );
};

export default FallingTrashGame; 