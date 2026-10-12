import { useEffect, useState } from 'react';
import MatrixRain from './MatrixRain.jsx';
import { prefersReducedMotion, useCountUp, useInView } from './hooks.js';
import { PILL_EVENT, fetchStats, recordPill } from './stats.js';

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const WAKE_LINES = [
  'Herää, Valtteri...',
  'Matrix on sinut saanut.',
  'Seuraa valkoista kania.',
  'Knock, knock, Valtteri.',
];

const TERMINAL_SCRIPT = [
  { cmd: 'whoami' },
  { out: 'happovaltteri', tone: 'hi' },
  { cmd: 'cat rooli.txt' },
  { out: 'Suomen kovin JavaScript-koodari' },
  { cmd: 'node --version' },
  { out: 'v∞.0.0 (hän kirjoitti sen itse)' },
  { cmd: 'npm run bugs' },
  { out: 'ERROR: ei löytynyt yhtään bugia. Etsitkö väärästä paikasta?', tone: 'ok' },
  { cmd: 'git blame production' },
  { out: '100 % Valtteri. Kiitos, Valtteri.', tone: 'hi' },
];

const STATS = [
  { label: 'Korjattua bugia', value: 9001, suffix: '' },
  { label: 'Kahvikuppia', value: 42000, suffix: '' },
  { label: 'Tuotantovikaa', value: 0, suffix: '' },
  { label: 'Sijoitus Suomessa', value: 1, suffix: '.' },
];

const SKILLS = [
  { name: 'Vanilla JavaScript', level: 100, note: 'äidinkieli' },
  { name: 'async / await', level: 100, note: 'ei koskaan race conditioneja' },
  { name: 'React', level: 99, note: 'hookit tottelevat' },
  { name: 'TypeScript', level: 97, note: 'any vain ironiana' },
  { name: 'CSS-keskitys', level: 96, note: 'ensimmäisellä yrittämällä' },
  { name: 'Regex', level: 94, note: 'lukee sen kuin runoa' },
  { name: 'Off-by-one-virheet', level: 0, note: 'ei tunne käsitettä' },
];

const LEGENDS = [
  ['01', 'Ei debuggaa. Bugit ilmoittautuvat itse ja pyytävät anteeksi.'],
  ['02', 'Hänen console.log tulostaa aina oikean arvon ensimmäisellä kerralla.'],
  ['03', 'Pushaa perjantaina kello 16.59. Tuotanto kiittää.'],
  ['04', 'Ymmärtää this-avainsanan. Kaikissa konteksteissa.'],
  ['05', 'npm install valmistuu hänen katseensa alla alle sekunnissa.'],
  ['06', 'Hänen koodinsa ei tarvitse kommentteja. Koodi kommentoi häntä.'],
];

const CODE = `// valtteri.js
const happovaltteri = {
  titteli: 'Suomen kovin JavaScript-koodari',
  bugeja: 0,
  async korjaa(ongelma) {
    await Promise.all(ongelma.syyt);
    return 'jo korjattu';
  },
};

while (true) {
  await happovaltteri.korjaa(seuraavaBugi());
}`;

/* ------------------------------------------------------------------ */
/* Pienet apukomponentit                                               */
/* ------------------------------------------------------------------ */

function Reveal({ children, className = '', delay = 0 }) {
  const [ref, inView] = useInView(0.15);
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ index, children }) {
  return (
    <Reveal>
      <h2 className="section-title">
        <span className="section-index">{index}</span>
        <span className="glitch-sm" data-text={children}>
          {children}
        </span>
      </h2>
    </Reveal>
  );
}

/* ------------------------------------------------------------------ */
/* "Herää, Valtteri" -aloitusruutu                                      */
/* ------------------------------------------------------------------ */

function WakeUp({ onDone }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const finish = () => {
    setLeaving(true);
    setTimeout(onDone, 700);
  };

  useEffect(() => {
    const line = WAKE_LINES[lineIdx];
    if (chars < line.length) {
      const t = setTimeout(() => setChars((c) => c + 1), 55 + Math.random() * 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (lineIdx < WAKE_LINES.length - 1) {
        setLineIdx((i) => i + 1);
        setChars(0);
      } else {
        finish();
      }
    }, 750);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars, lineIdx]);

  return (
    <div className={`wake ${leaving ? 'leaving' : ''}`} onClick={finish} role="presentation">
      <p className="wake-text">
        {WAKE_LINES[lineIdx].slice(0, chars)}
        <span className="caret" />
      </p>
      <p className="wake-skip">klikkaa ohittaaksesi</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const PILL_MESSAGES = {
  green: 'Yhteys muodostettu. Tervetuloa Matrixiin.',
  red: 'Punainen pilleri nielty. Pesä on syvä, ja siellä Valtteri koodaa jo.',
  blue: 'Sininen pilleri. Palaat arkeen: Excel-makroihin ja kokousmuistioihin.',
};

function Hero({ theme, onPill, setBulletTime }) {
  return (
    <header className="hero">
      <p className="eyebrow">&gt; järjestelmä online _</p>
      <h1
        className="glitch"
        data-text="HAPPOVALTTERI"
        onMouseEnter={() => setBulletTime(true)}
        onMouseLeave={() => setBulletTime(false)}
        onTouchStart={() => setBulletTime(true)}
        onTouchEnd={() => setBulletTime(false)}
      >
        HAPPOVALTTERI
      </h1>
      <p className="tagline">
        Suomen <strong>kovin</strong> JavaScript-koodari
      </p>
      <p className="hint">(pidä hiiri tai sormi nimen päällä: bullet time)</p>

      <div className="pills" role="group" aria-label="Valitse pilleri">
        <button
          className={`pill pill-red ${theme === 'red' ? 'active' : ''}`}
          onClick={() => onPill('red')}
        >
          <span className="pill-dot" /> Punainen pilleri
        </button>
        <button
          className={`pill pill-green ${theme === 'green' ? 'active' : ''}`}
          onClick={() => onPill('green')}
        >
          <span className="pill-dot" /> Normaali
        </button>
        <button
          className={`pill pill-blue ${theme === 'blue' ? 'active' : ''}`}
          onClick={() => onPill('blue')}
        >
          <span className="pill-dot" /> Sininen pilleri
        </button>
      </div>
      <p className="pill-msg" key={theme}>
        {PILL_MESSAGES[theme]}
      </p>

      <a className="scroll-cue" href="#terminal" aria-label="Selaa alas">
        <span>▼</span>
      </a>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Terminaali                                                          */
/* ------------------------------------------------------------------ */

function Terminal() {
  const [ref, inView] = useInView(0.3);
  const [shown, setShown] = useState([]);
  const [typing, setTyping] = useState('');
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const reduced = prefersReducedMotion();
    const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
    setShown([]);
    setTyping('');
    setFinished(false);

    (async () => {
      for (const line of TERMINAL_SCRIPT) {
        if (cancelled) return;
        if (line.cmd) {
          for (let i = 1; i <= line.cmd.length; i++) {
            if (cancelled) return;
            setTyping(line.cmd.slice(0, i));
            await sleep(40 + Math.random() * 60);
          }
          await sleep(260);
          if (cancelled) return;
          setShown((s) => [...s, { cmd: line.cmd }]);
          setTyping('');
        } else {
          await sleep(160);
          if (cancelled) return;
          setShown((s) => [...s, { out: line.out, tone: line.tone }]);
        }
      }
      if (!cancelled) setFinished(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [inView]);

  return (
    <section id="terminal" className="section">
      <SectionTitle index="01">Tunnistautuminen</SectionTitle>
      <Reveal>
        <div className="window" ref={ref}>
          <div className="window-bar">
            <i /> <i /> <i />
            <span>valtteri@matrix: ~</span>
          </div>
          <div className="terminal-body" aria-live="polite">
            {shown.map((l, i) =>
              l.cmd ? (
                <div key={i} className="t-line">
                  <span className="prompt">$</span> {l.cmd}
                </div>
              ) : (
                <div key={i} className={`t-out ${l.tone || ''}`}>
                  {l.out}
                </div>
              ),
            )}
            {!finished && (
              <div className="t-line">
                <span className="prompt">$</span> {typing}
                <span className="caret" />
              </div>
            )}
            {finished && (
              <div className="t-line">
                <span className="prompt">$</span> <span className="caret" />
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tilastot                                                            */
/* ------------------------------------------------------------------ */

function Stat({ label, value, suffix, active }) {
  const n = useCountUp(value, active);
  return (
    <div className="stat">
      <div className="stat-num">
        {n.toLocaleString('fi-FI')}
        {suffix}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Stats() {
  const [ref, inView] = useInView(0.4);
  return (
    <section className="section">
      <SectionTitle index="02">Lukemat</SectionTitle>
      <Reveal>
        <div className="stats" ref={ref}>
          {STATS.map((s) => (
            <Stat key={s.label} {...s} active={inView} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Taidot ("ladataan ohjelmaa...")                                      */
/* ------------------------------------------------------------------ */

function Skill({ name, level, note, active, delay }) {
  const n = useCountUp(level, active, 1600 + delay * 2);
  return (
    <div className="skill">
      <div className="skill-head">
        <span>{name}</span>
        <span className="skill-note">{note}</span>
      </div>
      <div className="skill-bar">
        <div
          className="skill-track"
          role="progressbar"
          aria-label={name}
          aria-valuenow={level}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="skill-fill" style={{ width: `${n}%` }} />
        </div>
        <span className="skill-pct">{n}%</span>
      </div>
    </div>
  );
}

function Skills() {
  const [ref, inView] = useInView(0.2);
  return (
    <section className="section">
      <SectionTitle index="03">Ladataan taitoja...</SectionTitle>
      <Reveal>
        <div className="panel" ref={ref}>
          {SKILLS.map((s, i) => (
            <Skill key={s.name} {...s} active={inView} delay={i * 80} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Koodi-ikkuna                                                        */
/* ------------------------------------------------------------------ */

const TOKEN_RE =
  /(\/\/.*$)|('[^']*')|\b(const|async|await|return|while|true)\b|\b(\d+)\b/g;

function highlight(line) {
  const out = [];
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const cls = m[1] ? 'tk-c' : m[2] ? 'tk-s' : m[3] ? 'tk-k' : 'tk-n';
    out.push(
      <span key={m.index} className={cls}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

function CodeWindow() {
  const lines = CODE.split('\n');
  return (
    <section className="section">
      <SectionTitle index="04">Lähdekoodi</SectionTitle>
      <Reveal>
        <div className="window">
          <div className="window-bar">
            <i /> <i /> <i />
            <span>valtteri.js</span>
          </div>
          <pre className="code">
            {lines.map((l, i) => (
              <div key={i} className="code-line" style={{ animationDelay: `${i * 70}ms` }}>
                <span className="ln">{String(i + 1).padStart(2, ' ')}</span>
                {highlight(l)}
              </div>
            ))}
          </pre>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Legendat                                                            */
/* ------------------------------------------------------------------ */

function Legends() {
  return (
    <section className="section">
      <SectionTitle index="05">Legendat</SectionTitle>
      <div className="legends">
        {LEGENDS.map(([n, text], i) => (
          <Reveal key={n} delay={(i % 2) * 120}>
            <article className="legend">
              <span className="legend-n">{n}</span>
              <p>{text}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pillerilaskuri (tietokannasta)                                       */
/* ------------------------------------------------------------------ */

const PILL_ROWS = [
  { key: 'red', label: 'Punainen pilleri', color: '#ff2a3d' },
  { key: 'green', label: 'Normaali', color: '#00ff41' },
  { key: 'blue', label: 'Sininen pilleri', color: '#3d8bff' },
];

function PillRow({ label, color, count, total, active }) {
  const n = useCountUp(count, active, 1200);
  const share = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="skill pill-row" style={{ '--c': color }}>
      <div className="skill-head">
        <span>{label}</span>
        <span className="skill-note">{share} %</span>
      </div>
      <div className="skill-bar">
        <div
          className="skill-track"
          role="progressbar"
          aria-label={label}
          aria-valuenow={share}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="skill-fill pill-fill" style={{ width: `${share}%` }} />
        </div>
        <span className="skill-pct pill-count">{n.toLocaleString('fi-FI')}</span>
      </div>
    </div>
  );
}

function PillStats() {
  const [ref, inView] = useInView(0.2);
  const [stats, setStats] = useState(null); // null = ladataan, false = ei saatavilla

  useEffect(() => {
    if (!inView) return;
    let alive = true;
    const load = async () => {
      const s = await fetchStats();
      if (alive) setStats(s);
    };
    load();
    const id = setInterval(load, 10000);
    window.addEventListener(PILL_EVENT, load);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener(PILL_EVENT, load);
    };
  }, [inView]);

  return (
    <section className="section">
      <SectionTitle index="06">Pillerit nielty</SectionTitle>
      <Reveal>
        <div className="panel" ref={ref}>
          <p className="live-note">
            <span className="live-dot" /> LIVE · kaikkien kävijöiden valinnat
          </p>
          {stats === null && <p className="muted">Yhdistetään Matrixiin...</p>}
          {stats === false && (
            <p className="muted">Tilastot eivät ole juuri nyt saatavilla. Matrix on hiljaa.</p>
          )}
          {stats && (
            <>
              {PILL_ROWS.map((r) => (
                <PillRow
                  key={r.key}
                  label={r.label}
                  color={r.color}
                  count={stats.counts[r.key]}
                  total={stats.total}
                  active={inView}
                />
              ))}
              <p className="muted total">
                Valintoja yhteensä: <strong>{stats.total.toLocaleString('fi-FI')}</strong>
              </p>
            </>
          )}
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

const SPEEDS = { green: 1, red: 1.9, blue: 0.55 };

export default function App() {
  const [awake, setAwake] = useState(() => prefersReducedMotion());
  const [theme, setTheme] = useState('green');
  const [bulletTime, setBulletTime] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const choosePill = (pill) => {
    setTheme(pill);
    recordPill(pill);
  };

  const speed = SPEEDS[theme] * (bulletTime ? 0.18 : 1);

  return (
    <>
      <MatrixRain theme={theme} speed={speed} />
      <div className="scanlines" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      {!awake && <WakeUp onDone={() => setAwake(true)} />}

      <main className={`page ${awake ? 'awake' : ''}`}>
        <Hero theme={theme} onPill={choosePill} setBulletTime={setBulletTime} />
        <Terminal />
        <Stats />
        <Skills />
        <CodeWindow />
        <Legends />
        <PillStats />

        <footer className="footer">
          <p>
            <span className="caret" /> Totuus on: <em>ei ole lusikkaa. Ei ole bugia.</em>
          </p>
          <p className="tiny">
            © {new Date().getFullYear()} Happovaltteri · Rakennettu Reactilla · Kaikki väitteet
            täysin objektiivisia
          </p>
          <p className="tiny">
            Pillerin valinnasta tallennetaan vain valittu pilleri ja ajankohta. Ei evästeitä, ei
            IP-osoitteita.
          </p>
        </footer>
      </main>
    </>
  );
}
