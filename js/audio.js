/* Holo Gambit — synthesized sound. No audio files: every effect is generated
 * from oscillators and noise at runtime, so nothing has to be downloaded and
 * nothing is copyrighted. A low holotable "hum" bed runs during a match. */
const SFX = (() => {
  let ctx = null, master = null, hum = null, humGain = null, humFilter = null;
  let enabled = true, ready = false;

  function init() {
    if (ready) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      ready = true;
    } catch (e) { enabled = false; }
  }

  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(freq, dur, type = 'sine', vol = 0.3, glideTo = null, delay = 0) {
    if (!enabled || !ready) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol = 0.3, filterFreq = 1200, type = 'bandpass') {
    if (!enabled || !ready) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq; f.Q.value = 0.9;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  // a sigil materializing into a sector — a short shimmering blip that rises
  function place(side = 0) {
    resume();
    tone(360 + side * 120, 0.12, 'triangle', 0.2, 620 + side * 120);
    noise(0.06, 0.06, 3200, 'highpass');
  }
  // an illegal move — a dull denial buzz
  function invalid() {
    resume();
    tone(150, 0.16, 'square', 0.16, 96);
    noise(0.08, 0.06, 500, 'lowpass');
  }
  // an ability firing — an airy rising whoosh, tinted by the ability colour (0..1)
  function ability(color = 0.5) {
    resume();
    tone(180 + color * 260, 0.5, 'sawtooth', 0.24, 820);
    noise(0.34, 0.14, 700 + color * 900, 'bandpass');
  }
  // a sigil being erased / a line shoved off the board — a descending sweep
  function unmake() {
    resume();
    tone(540, 0.28, 'sawtooth', 0.2, 120);
    noise(0.22, 0.12, 900, 'lowpass');
  }
  // seizing a round — a bright ascending chord
  function roundWin() {
    resume();
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.24, null, i * 0.12));
    noise(0.5, 0.08, 2600, 'highpass');
  }
  // a stalemate — a flat, hollow two-note fall
  function draw() {
    resume();
    tone(392, 0.32, 'sine', 0.2, null, 0);
    tone(311, 0.5, 'sine', 0.2, null, 0.16);
  }
  // taking the whole match — a full fanfare
  function matchWin() {
    resume();
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.36, 'triangle', 0.26, null, i * 0.14));
    [523, 784].forEach((f, i) => tone(f / 2, 0.7, 'sawtooth', 0.12, null, i * 0.14));
  }
  // losing the match — a low descending crunch
  function matchLose() {
    resume();
    tone(300, 0.6, 'sawtooth', 0.26, 70);
    tone(90, 0.7, 'sine', 0.2, 40, 0.02);
    noise(0.5, 0.18, 700, 'lowpass');
  }
  // a soft click for menu / targeting
  function ui() { resume(); tone(520, 0.06, 'square', 0.1); }
  // a light tick as the opponent commits a move
  function tick() { resume(); tone(300, 0.05, 'triangle', 0.08, 220); }

  // a low holotable projector drone that runs during a live match
  function startHum() {
    if (!enabled || !ready || hum) return;
    hum = ctx.createOscillator(); humGain = ctx.createGain();
    const sub = ctx.createOscillator();
    hum.type = 'sawtooth'; hum.frequency.value = 66;
    sub.type = 'sine'; sub.frequency.value = 40;
    humGain.gain.value = 0.045;
    humFilter = ctx.createBiquadFilter(); humFilter.type = 'lowpass'; humFilter.frequency.value = 320;
    hum.connect(humFilter); sub.connect(humFilter); humFilter.connect(humGain); humGain.connect(master);
    hum.start(); sub.start();
    hum._sub = sub;
  }
  function stopHum() {
    if (hum) {
      try { hum.stop(); hum._sub && hum._sub.stop(); } catch (e) {}
      hum = null; humGain = null; humFilter = null;
    }
  }

  function setEnabled(v) { enabled = v; if (!v) stopHum(); }
  function isEnabled() { return enabled; }

  return {
    init, resume, place, invalid, ability, unmake, roundWin, draw,
    matchWin, matchLose, ui, tick, startHum, stopHum, setEnabled, isEnabled,
  };
})();
