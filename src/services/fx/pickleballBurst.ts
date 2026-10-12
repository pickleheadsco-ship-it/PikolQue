import confetti from 'canvas-confetti';

let cachedPickleballShape: any = null;

function getPickleballShape() {
  if (cachedPickleballShape) return cachedPickleballShape;
  if (typeof window === 'undefined') return null;

  try {
    if (typeof Path2D !== 'undefined' && typeof (confetti as any).shapeFromPath === 'function') {
      // SVG path of a pickleball: Outer sphere boundary with 5 inner circular perforation holes
      const svgPath =
        'M 25,2 A 23,23 0 1,1 25,48 A 23,23 0 1,1 25,2 Z ' +
        'M 25,22 A 3,3 0 1,0 25,28 A 3,3 0 1,0 25,22 Z ' +
        'M 17,15 A 2.5,2.5 0 1,0 17,20 A 2.5,2.5 0 1,0 17,15 Z ' +
        'M 33,15 A 2.5,2.5 0 1,0 33,20 A 2.5,2.5 0 1,0 33,15 Z ' +
        'M 17,30 A 2.5,2.5 0 1,0 17,35 A 2.5,2.5 0 1,0 17,30 Z ' +
        'M 33,30 A 2.5,2.5 0 1,0 33,35 A 2.5,2.5 0 1,0 33,30 Z';
      cachedPickleballShape = (confetti as any).shapeFromPath({ path: svgPath });
    }
  } catch (err) {
    console.debug('Failed to initialize Path2D pickleball shape:', err);
  }

  return cachedPickleballShape;
}

/**
 * Fires a directional burst of 35 colorful pickleball particles
 * powered by canvas-confetti directly from the clicked coordinates.
 *
 * Requirements:
 * - particleCount: 35
 * - spread: 60
 * - origin: { x, y }
 * - Ball effect instead of confetti
 */
export function firePickleballBurst(clientX: number, clientY: number) {
  if (typeof window === 'undefined') return;

  const x = clientX / window.innerWidth;
  const y = clientY / window.innerHeight;

  const customShape = getPickleballShape();
  const shapes = customShape ? [customShape, 'circle'] : ['circle'];

  try {
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { x, y },
      colors: [
        '#FACC15', // Vibrant pickleball yellow
        '#EAB308', // Classic court yellow
        '#A3E635', // Optic lime
        '#84CC16', // Pickle green
        '#FEF08A', // Highlight bright lemon
        '#10B981', // Emerald tournament green
      ],
      shapes: shapes as any,
      scalar: 2.4, // Chunky, tactile spherical balls
      startVelocity: 32,
      ticks: 140,
      gravity: 0.92,
      drift: 0,
      disableForReducedMotion: false,
    });
  } catch (err) {
    console.warn('Canvas-confetti burst failed:', err);
  }

  // Also spawn a fast physical burst of 3D clay pickleballs on the DOM
  spawnPhysicalClayPickleballs(clientX, clientY);
}

/**
 * Spawns 6 lightweight floating 3D clay pickleballs that bounce
 * and spin outward from the click origin, creating a 4K clay burst sensation.
 */
function spawnPhysicalClayPickleballs(originX: number, originY: number) {
  if (typeof document === 'undefined') return;

  const count = 6;
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const ball = document.createElement('div');
    const size = 26 + Math.random() * 12; // 26px to 38px
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const distance = 80 + Math.random() * 110;
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance - 40; // slight upward pop
    const rotation = (Math.random() - 0.5) * 540;

    ball.style.position = 'absolute';
    ball.style.left = `${originX}px`;
    ball.style.top = `${originY}px`;
    ball.style.width = `${size}px`;
    ball.style.height = `${size}px`;
    ball.style.borderRadius = '50%';
    ball.style.backgroundImage = 'radial-gradient(circle at 35% 30%, #fef08a 0%, #eab308 60%, #a16207 100%)';
    ball.style.boxShadow =
      '0 8px 16px rgba(161, 98, 7, 0.4), inset -2px -3px 6px rgba(0,0,0,0.25), inset 2px 2px 4px rgba(255,255,255,0.85)';
    ball.style.border = '1px solid rgba(254, 240, 138, 0.7)';
    ball.style.transform = 'translate(-50%, -50%) scale(0.2)';
    ball.style.opacity = '1';
    ball.style.transition = 'transform 0.85s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.85s ease-out';

    // Pickleball perforated hole markers
    ball.innerHTML = `
      <svg viewBox="0 0 40 40" style="width: 100%; height: 100%; opacity: 0.45;">
        <circle cx="20" cy="20" r="2.8" fill="#713f12" />
        <circle cx="12" cy="14" r="2.2" fill="#713f12" />
        <circle cx="28" cy="14" r="2.2" fill="#713f12" />
        <circle cx="12" cy="26" r="2.2" fill="#713f12" />
        <circle cx="28" cy="26" r="2.2" fill="#713f12" />
      </svg>
    `;

    container.appendChild(ball);

    // Trigger physics frame
    requestAnimationFrame(() => {
      ball.style.transform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY + 40}px)) rotate(${rotation}deg) scale(1)`;
      ball.style.opacity = '0';
    });
  }

  // Cleanup DOM container after animation completes
  setTimeout(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }, 950);
}
