import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from './hooks.js';

const GLYPHS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789{}[]()<>=+*/;:.$#&|!?'.split('');

const WORDS = [
  'HAPPOVALTTERI',
  'JAVASCRIPT',
  'async',
  'await',
  'Promise',
  'useEffect',
  'null',
  'undefined',
  'NaN',
  '=>',
  'this',
  'npm',
];

const PALETTES = {
  green: { head: '#e8fff0', trail: '#00ff41', fade: '2, 10, 4' },
  red: { head: '#fff0f0', trail: '#ff2a3d', fade: '14, 2, 4' },
  blue: { head: '#f0f6ff', trail: '#3d8bff', fade: '2, 5, 16' },
};

const rand = (n) => Math.floor(Math.random() * n);

/**
 * Klassinen Matrix-sade canvasilla.
 * - theme: 'green' | 'red' | 'blue'
 * - speed: kerroin (1 = normaali, 0.2 = "bullet time")
 */
export default function MatrixRain({ theme = 'green', speed = 1 }) {
  const canvasRef = useRef(null);
  const live = useRef({ theme, speed });
  live.current = { theme, speed };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const fontSize = 18;
    const reduced = prefersReducedMotion();
    let columns = 0;
    let drops = [];
    let w = 0;
    let h = 0;
    let raf;
    let last = 0;
    let acc = 0;

    const newDrop = (initial) => ({
      y: initial ? -rand(60) : -rand(20),
      step: 0.55 + Math.random() * 0.9,
      word: Math.random() < 0.14 ? WORDS[rand(WORDS.length)] : null,
      idx: 0,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#020a04';
      ctx.fillRect(0, 0, w, h);
      columns = Math.ceil(w / fontSize);
      drops = Array.from({ length: columns }, () => newDrop(true));
    };

    const draw = () => {
      const { theme: t } = live.current;
      const pal = PALETTES[t] || PALETTES.green;
      ctx.fillStyle = `rgba(${pal.fade}, 0.085)`;
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fontSize}px "Share Tech Mono", monospace`;
      ctx.textAlign = 'center';

      for (let i = 0; i < columns; i++) {
        const d = drops[i];
        const x = i * fontSize + fontSize / 2;
        const y = Math.floor(d.y) * fontSize;
        let ch;
        if (d.word) {
          ch = d.word[d.idx % d.word.length];
          d.idx++;
        } else {
          ch = GLYPHS[rand(GLYPHS.length)];
        }
        // Kirkas "pää" ja himmeämpi häntä
        ctx.shadowBlur = 0;
        ctx.fillStyle = pal.trail;
        ctx.fillText(ch, x, y - fontSize);
        ctx.shadowColor = pal.trail;
        ctx.shadowBlur = 10;
        ctx.fillStyle = pal.head;
        ctx.fillText(ch, x, y);
        ctx.shadowBlur = 0;

        d.y += d.step;
        if (y > h && Math.random() > 0.975) drops[i] = newDrop(false);
      }
    };

    resize();

    if (reduced) {
      // Ei liikettä: piirretään yksi staattinen kuva.
      for (let i = 0; i < 90; i++) draw();
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = now - last;
      last = now;
      acc += dt * live.current.speed;
      const interval = 1000 / 30; // ~30 fps perusnopeudella
      if (acc >= interval) {
        acc %= interval;
        draw();
      }
    };
    raf = requestAnimationFrame((now) => {
      last = now;
      frame(now);
    });

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="rain" aria-hidden="true" />;
}
