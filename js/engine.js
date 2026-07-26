/* Holo Gambit — the match engine.
 *
 * Classic tic-tac-toe at the core: two commanders alternate deploying a sigil to
 * a 3x3 grid of sectors, and three in a row — across any of the 8 lines (3 rows,
 * 3 columns, 2 diagonals) — seizes the round. On top of that sit five signature
 * abilities and best-of-N match play.
 *
 * A fixed internal resolution (CONFIG.W x CONFIG.H) is scaled to fit by CSS.
 * Everything — starfield, the holotable and its shimmer/scanlines, the sigils,
 * the igniting win-beam, particles, HUD — is drawn with canvas primitives; there
 * are no image or audio assets.
 *
 * The pure rules (win/draw detection, the minimax AI, the ability transforms) are
 * side-effect-free module functions, re-exposed on `Game.__debug` so a test rig
 * can verify them directly, and moves are injectable through the number keys 1-9
 * so whole games can be scripted deterministically. */
const Game = (() => {
  const { W, H } = CONFIG;
  const GX = (W - CONFIG.grid) / 2;         // holotable left edge
  const GY = CONFIG.hudTop;                  // holotable top edge
  const CELL = CONFIG.grid / 3;              // sector size
  const GB = GY + CONFIG.grid;               // holotable bottom edge

  // The 8 winning lines, in cell-index space (0 = top-left, 8 = bottom-right).
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],         // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8],         // columns
    [0, 4, 8], [2, 4, 6],                     // diagonals
  ];
  const ROWS = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
  const COLS = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];

  // Number keys use a numpad layout, so 7-8-9 is the top row and 1-2-3 the bottom.
  const KEYCELL = { '7': 0, '8': 1, '9': 2, '4': 3, '5': 4, '6': 5, '1': 6, '2': 7, '3': 8 };
  const CELLKEY = { 0: '7', 1: '8', 2: '9', 3: '4', 4: '5', 5: '6', 6: '1', 7: '2', 8: '3' };

  const DIFF = {
    padawan: { label: 'Padawan', slip: 1.00 },   // heuristic play, real mistakes
    knight:  { label: 'Knight',  slip: 0.15 },   // minimax with an occasional slip
    master:  { label: 'Master',  slip: 0.00 },   // perfect minimax — unbeatable
  };

  /* ===================================================================
   * PURE RULES  (no engine state — safe to call from tests)
   * =================================================================== */

  function winnerOf(bd) {
    for (const [a, b, c] of LINES) {
      if (bd[a] && bd[a] === bd[b] && bd[a] === bd[c]) return bd[a];
    }
    return null;
  }
  function lineFor(bd, mark) {
    for (const ln of LINES) {
      if (ln.every(i => bd[i] === mark)) return ln.slice();
    }
    return null;
  }
  function playable(bd, dis) {
    const r = [];
    for (let i = 0; i < 9; i++) if (!bd[i] && !(dis && dis.has(i))) r.push(i);
    return r;
  }
  function isDraw(bd, dis) { return !winnerOf(bd) && playable(bd, dis).length === 0; }

  // Cells where placing `mark` immediately completes a line.
  function winCellsFor(bd, mark, dis) {
    const out = [];
    for (const i of playable(bd, dis)) {
      bd[i] = mark; if (winnerOf(bd) === mark) out.push(i); bd[i] = null;
    }
    return out;
  }

  // Depth-aware minimax over placements, with alpha-beta pruning. `dis` (a Set)
  // marks unplayable sectors. The full (-Inf, Inf) default window returns the
  // exact optimal value, so pruning never changes which move Master picks.
  function minimax(bd, me, opp, cur, dis, depth, alpha, beta) {
    if (alpha === undefined) { alpha = -Infinity; beta = Infinity; }
    const w = winnerOf(bd);
    if (w === me) return 10 - depth;
    if (w === opp) return depth - 10;
    const moves = playable(bd, dis);
    if (moves.length === 0) return 0;
    if (cur === me) {
      let best = -Infinity;
      for (const m of moves) {
        bd[m] = cur; best = Math.max(best, minimax(bd, me, opp, opp, dis, depth + 1, alpha, beta)); bd[m] = null;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        bd[m] = cur; best = Math.min(best, minimax(bd, me, opp, me, dis, depth + 1, alpha, beta)); bd[m] = null;
        if (best < beta) beta = best;
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  const TIEBREAK = {
    aggressive: [4, 0, 2, 6, 8, 1, 3, 5, 7],
    defensive:  [4, 1, 3, 5, 7, 0, 2, 6, 8],
    cunning:    [0, 2, 6, 8, 4, 1, 3, 5, 7],
  };
  function tiebreak(cells, pref) {
    const order = TIEBREAK[pref] || TIEBREAK.aggressive;
    for (const i of order) if (cells.includes(i)) return i;
    return cells[0];
  }

  // Choose a move for `me`. Pure: works on a copy so the caller's board is intact.
  function chooseMove(bd, me, opp, difficulty, pref, dis) {
    const work = bd.slice();
    const disSet = dis instanceof Set ? dis : new Set(dis || []);
    const moves = playable(work, disSet);
    if (moves.length === 0) return -1;
    const d = DIFF[difficulty] || DIFF.master;

    if (difficulty === 'padawan') {
      // take an obvious win most of the time…
      const myWins = moves.filter(m => { work[m] = me; const w = winnerOf(work) === me; work[m] = null; return w; });
      if (myWins.length && Math.random() < 0.75) return myWins[(Math.random() * myWins.length) | 0];
      // …block an obvious loss about half the time…
      const opWins = moves.filter(m => { work[m] = opp; const w = winnerOf(work) === opp; work[m] = null; return w; });
      if (opWins.length && Math.random() < 0.5) return opWins[(Math.random() * opWins.length) | 0];
      // …otherwise wander, with a light centre bias.
      if (moves.includes(4) && Math.random() < 0.3) return 4;
      return moves[(Math.random() * moves.length) | 0];
    }

    const scored = moves.map(m => { work[m] = me; const sc = minimax(work, me, opp, opp, disSet, 1); work[m] = null; return { m, sc }; });
    const bestSc = Math.max(...scored.map(s => s.sc));
    // Knight occasionally slips to a random legal move.
    if (d.slip > 0 && Math.random() < d.slip) return moves[(Math.random() * moves.length) | 0];
    const top = scored.filter(s => s.sc === bestSc).map(s => s.m);
    return tiebreak(top, pref);
  }

  // Shift the three cells of `line` one sector along `dir` (+1 toward the high
  // index, -1 toward the low). The far sigil topples off; the near sector clears.
  function simPush(bd, line, dir) {
    const nb = bd.slice();
    const [a, b, c] = line;
    if (dir > 0) { nb[c] = bd[b]; nb[b] = bd[a]; nb[a] = null; }
    else { nb[a] = bd[b]; nb[b] = bd[c]; nb[c] = null; }
    return nb;
  }

  /* ===================================================================
   * ENGINE STATE
   * =================================================================== */

  let canvas, ctx, raf = null, last = 0, clock = 0;
  let state = 'idle';                          // idle | playing | roundover | matchover
  let paused = false;
  let opts = null, onEnd = null;
  let stars = [], nebula = [], particles = [], floats = [];

  let sides = null;                            // { L:{mark,commander,human}, R:{...} }
  let board, disabled, placedAt, minedAt;      // board[9], Set of dead cells, anim clocks
  let turn, winner, winLine;                   // 'L'|'R', round result, winning line
  let roundNo, roundWins, draws, target;       // match bookkeeping
  let meter, reinforce, foresight, targeting;  // ability state
  let matchPending, matchWinner;
  let aiTimer = 0, shake = 0, beamStart = 0, roundCardAt = 0, hover = -1;
  let streak = 0, best = 0;

  const other = s => (s === 'L' ? 'R' : 'L');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- setup ---------- */

  function attach(cv) {
    canvas = cv; ctx = cv.getContext('2d');
    canvas.width = W; canvas.height = H;
    loadState();
    buildSpace();
    last = 0;
    loop(0);                                   // seeds the first rAF (idle attract)
  }

  function buildSpace() {
    stars = [];
    for (let i = 0; i < 180; i++) {
      const layer = Math.random();
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: 0.4 + layer * 1.8, sp: 5 + layer * 22, tw: Math.random() * Math.PI * 2, tws: 0.6 + Math.random() * 2 });
    }
    nebula = [
      { x: W * 0.24, y: H * 0.28, r: 380, c: '60,110,220' },
      { x: W * 0.80, y: H * 0.72, r: 420, c: '150,60,190' },
      { x: W * 0.55, y: H * 0.14, r: 300, c: '40,140,200' },
    ];
  }

  function loadState() {
    try { const s = JSON.parse(localStorage.getItem('holo-gambit') || '{}'); best = s.best || 0; streak = s.streak || 0; }
    catch (e) { best = 0; streak = 0; }
  }
  function saveState() { try { localStorage.setItem('holo-gambit', JSON.stringify({ best, streak })); } catch (e) {} }
  function getBest() { return best; }
  function getStreak() { return streak; }

  /* ---------- lifecycle ---------- */

  function start(o, endCb) {
    opts = o; onEnd = endCb;
    sides = {
      L: { mark: 'L', commander: COMMANDER_BY_ID[o.left] || COMMANDERS[0], human: true },
      R: { mark: 'R', commander: COMMANDER_BY_ID[o.right] || COMMANDERS[1], human: o.mode !== 'ai' },
    };
    target = o.matchLen === 5 ? 3 : 2;         // best-of-3 → first to 2, best-of-5 → first to 3
    newMatch();
    SFX.init();
    if (SFX.isEnabled()) { SFX.resume(); SFX.startHum(); }
    bindInput();
  }

  function stop() { state = 'idle'; paused = false; SFX.stopHum(); unbindInput(); }

  function togglePause() {
    if (state === 'playing') { paused = !paused; if (paused) SFX.stopHum(); else if (SFX.isEnabled()) SFX.startHum(); }
  }

  function newMatch() {
    roundWins = { L: 0, R: 0 }; draws = 0; roundNo = 0;
    meter = { L: 0, R: 0 };
    matchWinner = null; matchPending = null;
    newRound();
  }

  function newRound() {
    roundNo++;
    board = new Array(9).fill(null);
    disabled = new Set();
    placedAt = new Array(9).fill(0);
    minedAt = new Array(9).fill(0);
    winner = null; winLine = null; foresight = null; targeting = null;
    reinforce = { L: 0, R: 0 };
    hover = -1; beamStart = 0;
    turn = (roundNo % 2 === 1) ? 'L' : 'R';     // alternate who opens each round
    state = 'playing'; paused = false;
    if (SFX.isEnabled() && !SFX_humOn()) SFX.startHum();
    scheduleAI();
  }
  let _humOn = false;
  function SFX_humOn() { return _humOn; }

  /* ---------- charging ---------- */

  function meterGain(side, amt) { if (opts && opts.abilities) meter[side] = Math.min(100, meter[side] + amt); }

  /* ---------- placement + resolution ---------- */

  function place(idx) {
    if (state !== 'playing' || paused || targeting) return false;
    if (idx < 0 || idx > 8 || board[idx] !== null || disabled.has(idx)) { SFX.invalid(); shake = Math.max(shake, 4); return false; }
    const side = turn;
    board[idx] = side; placedAt[idx] = clock;
    meterGain(side, CONFIG.chargePerPlace);
    SFX.place(side === 'L' ? 0 : 1);
    spawnBurst(cellCenter(idx), sides[side].commander.color, 14, 150);
    if (foresight && foresight.side === side) foresight = null;   // hint spent
    postAction(side);
    return true;
  }

  // Shared tail for anything that mutates the board on `side`'s turn.
  function postAction(side, ended) {
    if (resolveBoard(side)) return;
    if (!ended && reinforce[side] > 0) { reinforce[side]--; addFloat(W / 2, GB + 44, 'SECOND WAVE', ABILITIES.REINFORCE.color); }
    else turn = other(side);
    scheduleAI();
  }

  function resolveBoard(actor) {
    const a = actor || turn, o = other(a);
    if (lineFor(board, a)) { endRound(a); return true; }
    if (lineFor(board, o)) { endRound(o); return true; }
    if (isDraw(board, disabled)) { endRound('draw'); return true; }
    return false;
  }

  function endRound(result) {
    winner = result; state = 'roundover'; targeting = null; foresight = null;
    roundCardAt = clock; shake = Math.max(shake, result === 'draw' ? 8 : 16);
    if (result !== 'draw') {
      winLine = lineFor(board, result);
      roundWins[result]++;
      meterGain(result, CONFIG.chargeOnRoundWin);
      beamStart = clock;
      SFX.roundWin();
      for (const i of winLine) spawnBurst(cellCenter(i), sides[result].commander.color, 22, 300, true);
    } else { winLine = null; draws++; SFX.draw(); }
    matchPending = (roundWins.L >= target) ? 'L' : (roundWins.R >= target) ? 'R' : null;
  }

  function advance() {
    if (state !== 'roundover') return;
    if (matchPending) finishMatch(matchPending);
    else newRound();
  }

  function finishMatch(side) {
    matchWinner = side; state = 'matchover'; SFX.stopHum(); _humOn = false;
    let newBest = false;
    if (opts.mode === 'ai') {
      if (side === 'L') { streak++; if (streak > best) { best = streak; newBest = true; } SFX.matchWin(); }
      else { streak = 0; SFX.matchLose(); }
      saveState();
    } else { SFX.matchWin(); }
    shake = Math.max(shake, 20);
    const cx = W / 2, cy = (GY + GB) / 2;
    spawnBurst({ x: cx, y: cy }, sides[side].commander.color, 44, 380, true);
    onEnd && onEnd({
      winner: side, roundWins: { ...roundWins }, draws, streak, best, newBest,
      mode: opts.mode, commander: sides[side].commander, loser: sides[other(side)].commander,
    });
  }

  /* ---------- abilities ---------- */

  function armAbility(side) {
    side = side || turn;
    if (state !== 'playing' || paused || targeting) return false;
    if (!opts.abilities || meter[side] < 100 || side !== turn) { SFX.invalid(); return false; }
    const ab = ABILITIES[sides[side].commander.ability];
    if (ab.target === 'none') { ab.key === 'FORESIGHT' ? fireForesight(side) : fireReinforce(side); return true; }
    if (ab.key === 'MINDTRICK' && !board.some(v => v === other(side))) { SFX.invalid(); return false; }
    if (ab.key === 'IONMINE' && playable(board, disabled).length === 0) { SFX.invalid(); return false; }
    if (ab.key === 'FORCEPUSH' && !anyLegalPush()) { SFX.invalid(); return false; }
    targeting = { side, ability: ab.key, cell: ab.key === 'FORCEPUSH' ? 4 : -1 };
    SFX.ability(hexHue(ab.color));
    return true;
  }

  function cancelTargeting() { if (targeting) { targeting = null; SFX.ui(); } }

  function fireForesight(side) {
    meter[side] = 0;
    const idx = chooseMove(board, side, other(side), 'master', sides[side].commander.ai, disabled);
    foresight = { side, cell: idx };
    SFX.ability(hexHue(ABILITIES.FORESIGHT.color));
    if (idx >= 0) addFloat(cellCenter(idx).x, cellCenter(idx).y - CELL * 0.32, 'FORESIGHT', ABILITIES.FORESIGHT.color);
  }

  function fireReinforce(side) {
    if (playable(board, disabled).length < 2) { SFX.invalid(); return; }
    meter[side] = 0; reinforce[side] = 1;
    SFX.ability(hexHue(ABILITIES.REINFORCE.color));
    addFloat(W / 2, GB + 44, 'REINFORCEMENTS — DEPLOY TWO', ABILITIES.REINFORCE.color);
  }

  function anyLegalPush() { return [...ROWS, ...COLS].some(legalPush); }
  function legalPush(line) { return line.every(i => !disabled.has(i)) && line.some(i => board[i] !== null); }

  // Complete a targeted ability. `spec` = {cell} or {line,dir}. Also used by tests.
  function applyAbilityTarget(spec) {
    if (!targeting) return false;
    const { side, ability } = targeting;
    if (ability === 'MINDTRICK') {
      const i = spec.cell;
      if (board[i] !== other(side)) { SFX.invalid(); return false; }
      board[i] = null; placedAt[i] = 0;
      spawnBurst(cellCenter(i), ABILITIES.MINDTRICK.color, 20, 240); SFX.unmake();
    } else if (ability === 'IONMINE') {
      const i = spec.cell;
      if (board[i] !== null || disabled.has(i)) { SFX.invalid(); return false; }
      disabled.add(i); minedAt[i] = clock;
      spawnBurst(cellCenter(i), ABILITIES.IONMINE.color, 20, 240); SFX.ability(hexHue(ABILITIES.IONMINE.color));
    } else if (ability === 'FORCEPUSH') {
      const { line, dir } = spec;
      if (!line || !legalPush(line)) { SFX.invalid(); return false; }
      const pa = placedAt.slice();
      board = simPush(board, line, dir);
      const [a, b, c] = line;
      if (dir > 0) { placedAt[c] = board[c] ? clock : 0; placedAt[b] = board[b] ? clock : 0; placedAt[a] = 0; }
      else { placedAt[a] = board[a] ? clock : 0; placedAt[b] = board[b] ? clock : 0; placedAt[c] = 0; }
      for (const i of line) if (board[i]) spawnBurst(cellCenter(i), sides[board[i]].commander.color, 10, 200);
      SFX.unmake();
    }
    meter[side] = 0; targeting = null;
    postAction(side, true);                    // these abilities end the turn
    return true;
  }

  /* ---------- AI ---------- */

  function personaProb(p, agg, cun, def) { return p === 'aggressive' ? agg : p === 'cunning' ? cun : def; }

  function scheduleAI() { aiTimer = (state === 'playing' && sides && !sides[turn].human) ? rand(CONFIG.aiThinkMin, CONFIG.aiThinkMax) : 0; }

  function aiTakeTurn() {
    const side = turn, me = side, opp = other(side), S = sides[side];
    if (opts.abilities && meter[side] >= 100) {
      const ab = S.commander.ability;
      if (ab === 'REINFORCE') {
        const hasWin = winCellsFor(board, me, disabled).length > 0;
        if (!hasWin && playable(board, disabled).length >= 2 && Math.random() < personaProb(S.commander.ai, 0.85, 0.6, 0.4)) fireReinforce(side);
      } else if (ab !== 'FORESIGHT') {
        if (aiUseTargeted(side)) return;       // MINDTRICK / IONMINE / FORCEPUSH end the turn
      }
    }
    const idx = chooseMove(board, me, opp, opts.difficulty, S.commander.ai, disabled);
    if (idx < 0) { resolveBoard(side); return; }
    SFX.tick();
    place(idx);
  }

  function bestErase(bd, opp, dis) {
    // remove the opponent sigil that most reduces their winning chances
    let best = -1, bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (bd[i] !== opp) continue;
      bd[i] = null; const w = winCellsFor(bd, opp, dis).length; bd[i] = opp;
      if (w < bestScore) { bestScore = w; best = i; }
    }
    return best;
  }

  function bestPush(bd, me, opp, dis) {
    let best = null;
    const beforeOpp = winCellsFor(bd, opp, dis).length, beforeMe = winCellsFor(bd, me, dis).length;
    for (const line of [...ROWS, ...COLS]) {
      if (!legalPush(line)) continue;
      for (const dir of [1, -1]) {
        const nb = simPush(bd, line, dir);
        let gain;
        if (lineFor(nb, me)) gain = 100;
        else if (lineFor(nb, opp)) gain = -100;
        else gain = (beforeOpp - winCellsFor(nb, opp, dis).length) * 10 + (winCellsFor(nb, me, dis).length - beforeMe) * 8;
        if (!best || gain > best.gain) best = { line, dir, gain };
      }
    }
    return best;
  }

  function aiUseTargeted(side) {
    const me = side, opp = other(side), persona = sides[side].commander.ai;
    const ab = sides[side].commander.ability;
    if (winCellsFor(board, me, disabled).length > 0) return false;   // don't waste — a win is on the table
    if (ab === 'MINDTRICK') {
      const oppWins = winCellsFor(board, opp, disabled).length;
      const wantFork = oppWins >= 2;
      const wantSnipe = persona === 'aggressive' && Math.random() < 0.3 && board.some(v => v === opp);
      if (wantFork || wantSnipe) {
        const t = bestErase(board, opp, disabled);
        if (t >= 0 && armAbility(side)) return applyAbilityTarget({ cell: t });
      }
    } else if (ab === 'IONMINE') {
      const oppWins = winCellsFor(board, opp, disabled);
      if (oppWins.length >= 2 || (oppWins.length === 1 && persona === 'cunning' && Math.random() < 0.55)) {
        if (armAbility(side)) return applyAbilityTarget({ cell: oppWins[0] });
      }
    } else if (ab === 'FORCEPUSH') {
      const bp = bestPush(board, me, opp, disabled);
      if (bp && bp.gain > 0 && armAbility(side)) return applyAbilityTarget({ line: bp.line, dir: bp.dir });
    }
    return false;
  }

  /* ---------- input ---------- */

  function bindInput() {
    unbindInput();
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', onTouch, { passive: false });
  }
  function unbindInput() {
    window.removeEventListener('keydown', onKey);
    if (canvas) { canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('click', onClick); canvas.removeEventListener('touchstart', onTouch); }
  }

  function onKey(e) {
    const k = e.key.toLowerCase();
    if (KEYCELL[k] !== undefined || k === ' ') e.preventDefault();
    if (k === 'p') { if (targeting) cancelTargeting(); else togglePause(); return; }
    if (k === 'escape') { if (targeting) cancelTargeting(); return; }
    if (state === 'roundover') { if (k === 'r' || k === 'enter' || k === ' ') advance(); return; }
    if (state !== 'playing' || paused) return;
    if (!sides[turn].human) return;            // not your turn (opponent AI is thinking)
    if (targeting) {
      if (KEYCELL[k] !== undefined) return handleTargetDigit(KEYCELL[k]);
      if (targeting.ability === 'FORCEPUSH' && k.startsWith('arrow')) return handlePushArrow(k);
      if (k === 'e') return cancelTargeting();
      return;
    }
    if (KEYCELL[k] !== undefined) { place(KEYCELL[k]); return; }
    if (k === 'e') armAbility(turn);
  }

  function handleTargetDigit(idx) {
    if (targeting.ability === 'FORCEPUSH') { targeting.cell = idx; SFX.ui(); return; }
    applyAbilityTarget({ cell: idx });
  }
  function handlePushArrow(k) {
    const idx = targeting.cell < 0 ? 4 : targeting.cell, row = (idx / 3) | 0, col = idx % 3;
    if (k === 'arrowleft') applyAbilityTarget({ line: ROWS[row], dir: -1 });
    else if (k === 'arrowright') applyAbilityTarget({ line: ROWS[row], dir: 1 });
    else if (k === 'arrowup') applyAbilityTarget({ line: COLS[col], dir: -1 });
    else if (k === 'arrowdown') applyAbilityTarget({ line: COLS[col], dir: 1 });
  }

  function toInternal(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) * (W / r.width), y: (clientY - r.top) * (H / r.height) };
  }
  function hitCell(p) {
    if (p.x < GX || p.x > GX + CONFIG.grid || p.y < GY || p.y > GB) return -1;
    return ((p.y - GY) / CELL | 0) * 3 + ((p.x - GX) / CELL | 0);
  }
  function hitArrow(p) { for (const ar of pushArrows()) if (p.x >= ar.x && p.x <= ar.x + ar.w && p.y >= ar.y && p.y <= ar.y + ar.h) return ar; return null; }
  function hitAbilityButton(p) { const b = abilityBtnRect(); return b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }

  function onMove(e) {
    if (state !== 'playing' || paused || targeting || !sides[turn].human) { hover = -1; return; }
    const p = toInternal(e.clientX, e.clientY); const i = hitCell(p);
    hover = (i >= 0 && board[i] === null && !disabled.has(i)) ? i : -1;
  }
  function onClick(e) { handlePoint(toInternal(e.clientX, e.clientY)); }
  function onTouch(e) { e.preventDefault(); const t = e.changedTouches[0]; handlePoint(toInternal(t.clientX, t.clientY)); }

  function handlePoint(p) {
    if (state === 'roundover') { advance(); return; }
    if (state !== 'playing' || paused || !sides[turn].human) return;
    if (targeting) {
      if (targeting.ability === 'FORCEPUSH') { const ar = hitArrow(p); if (ar) { applyAbilityTarget({ line: ar.line, dir: ar.dir }); return; } }
      const i = hitCell(p); if (i >= 0) handleTargetDigit(i);
      return;
    }
    if (hitAbilityButton(p)) { armAbility(turn); return; }
    const i = hitCell(p); if (i >= 0) place(i);
  }

  /* ---------- geometry helpers ---------- */

  function cellCenter(i) { return { x: GX + (i % 3) * CELL + CELL / 2, y: GY + ((i / 3) | 0) * CELL + CELL / 2 }; }
  function cellRect(i) { return { x: GX + (i % 3) * CELL, y: GY + ((i / 3) | 0) * CELL, w: CELL, h: CELL }; }

  // The 12 shove controls: left/right of each row, top/bottom of each column.
  function pushArrows() {
    const out = [], sz = 40, off = 12;
    for (let r = 0; r < 3; r++) {
      const cy = GY + r * CELL + CELL / 2 - sz / 2;
      out.push({ line: ROWS[r], dir: -1, x: GX - sz - off, y: cy, w: sz, h: sz, kind: 'left' });
      out.push({ line: ROWS[r], dir: 1, x: GX + CONFIG.grid + off, y: cy, w: sz, h: sz, kind: 'right' });
    }
    for (let c = 0; c < 3; c++) {
      const cx = GX + c * CELL + CELL / 2 - sz / 2;
      out.push({ line: COLS[c], dir: -1, x: cx, y: GY - sz - off, w: sz, h: sz, kind: 'up' });
      out.push({ line: COLS[c], dir: 1, x: cx, y: GB + off, w: sz, h: sz, kind: 'down' });
    }
    return out;
  }
  function abilityBtnRect() {
    if (!opts || !opts.abilities || state !== 'playing' || !sides[turn].human || meter[turn] < 100) return null;
    return { x: W / 2 - 150, y: GB + 26, w: 300, h: 40 };
  }

  /* ---------- particles + floats ---------- */

  function spawnBurst(pt, color, n, spd, big) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.7);
      particles.push({ x: pt.x, y: pt.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: (big ? 0.8 : 0.5) + Math.random() * 0.35, size: (big ? 2.6 : 1.7) + Math.random() * 2.2, color });
    }
  }
  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.93; q.vy *= 0.93; q.life -= dt;
      if (q.life <= 0) particles.splice(i, 1);
    }
  }
  function addFloat(x, y, text, color) { floats.push({ x, y, text, color, life: 1.2 }); }
  function updateFloats(dt) {
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.y -= dt * 34; f.life -= dt * 0.9; if (f.life <= 0) floats.splice(i, 1); }
  }
  function driftSpace(dt) { for (const s of stars) { s.x -= s.sp * dt; if (s.x < -2) { s.x = W + 2; s.y = Math.random() * H; } s.tw += s.tws * dt; } }

  /* ===================================================================
   * RENDER
   * =================================================================== */

  function render() {
    const sx = (Math.random() * 2 - 1) * shake, sy = (Math.random() * 2 - 1) * shake;
    ctx.clearRect(0, 0, W, H);
    drawSpace();
    ctx.save();
    ctx.translate(sx, sy);
    drawTable();
    if (state !== 'idle') {
      drawSectors();
      drawWinBeam();
      drawParticles();
      drawFloats();
      drawHUD();
      drawBottom();
      if (state === 'roundover') drawRoundCard();
      if (paused) drawBanner('PAUSED', 'press  P  to resume');
    } else {
      drawParticles();
    }
    ctx.restore();
  }

  function drawSpace() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#05060f'); g.addColorStop(0.5, '#080a1a'); g.addColorStop(1, '#04040c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const n of nebula) {
      const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      rg.addColorStop(0, `rgba(${n.c},0.14)`); rg.addColorStop(1, `rgba(${n.c},0)`);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    for (const s of stars) { ctx.globalAlpha = 0.35 + 0.55 * Math.abs(Math.sin(s.tw)); ctx.fillStyle = '#dfe8ff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  // The holotable: a projector plinth, a translucent light-grid, scanlines and shimmer.
  function drawTable() {
    const tint = (state !== 'idle' && sides) ? sides[turn].commander.color : '#5ec8ff';
    // projector plinth glow beneath the table
    ctx.save();
    const pg = ctx.createRadialGradient(W / 2, GB + 30, 10, W / 2, GB + 30, CONFIG.grid * 0.72);
    pg.addColorStop(0, 'rgba(90,170,255,0.20)'); pg.addColorStop(1, 'rgba(90,170,255,0)');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(W / 2, GB + 28, CONFIG.grid * 0.62, 60, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // faint holographic base panel
    ctx.save();
    ctx.globalAlpha = 0.5;
    const bg = ctx.createLinearGradient(0, GY, 0, GB);
    bg.addColorStop(0, 'rgba(16,28,54,0.5)'); bg.addColorStop(1, 'rgba(8,14,30,0.16)');
    ctx.fillStyle = bg; roundRect(GX - 6, GY - 6, CONFIG.grid + 12, CONFIG.grid + 12, 16); ctx.fill();
    ctx.restore();

    // scanlines + shimmer, clipped to the table
    ctx.save();
    roundRect(GX - 6, GY - 6, CONFIG.grid + 12, CONFIG.grid + 12, 16); ctx.clip();
    ctx.globalAlpha = 0.06; ctx.strokeStyle = tint; ctx.lineWidth = 1;
    const scan = (clock * 60) % 14;
    for (let y = GY - 14 + scan; y < GB + 14; y += 14) { ctx.beginPath(); ctx.moveTo(GX - 8, y); ctx.lineTo(GX + CONFIG.grid + 8, y); ctx.stroke(); }
    // a soft sweeping shimmer band
    const sweep = GY + ((clock * 90) % (CONFIG.grid + 120)) - 60;
    const sg = ctx.createLinearGradient(0, sweep - 40, 0, sweep + 40);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.05)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = sg; ctx.fillRect(GX - 8, sweep - 40, CONFIG.grid + 16, 80);
    ctx.restore();

    // the light-grid lines
    ctx.save();
    ctx.strokeStyle = tint; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.shadowBlur = 16; ctx.shadowColor = tint;
    ctx.globalAlpha = 0.55 + 0.08 * Math.sin(clock * 3);
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(GX + i * CELL, GY + 8); ctx.lineTo(GX + i * CELL, GB - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(GX + 8, GY + i * CELL); ctx.lineTo(GX + CONFIG.grid - 8, GY + i * CELL); ctx.stroke();
    }
    // outer frame + corner ticks
    ctx.globalAlpha = 0.4; ctx.lineWidth = 2;
    roundRect(GX - 6, GY - 6, CONFIG.grid + 12, CONFIG.grid + 12, 16); ctx.stroke();
    ctx.restore();
  }

  function drawSectors() {
    const beam = winLine ? clamp((clock - beamStart) / CONFIG.beamIgnite, 0, 1) : 0;
    for (let i = 0; i < 9; i++) {
      const c = cellCenter(i);
      // targeting highlights
      if (targeting && sides[turn].human) drawTargetHint(i, c);
      // number-key hint in empty, playable sectors
      if (board[i] === null && !disabled.has(i) && state === 'playing') {
        ctx.save();
        ctx.globalAlpha = (hover === i ? 0.5 : 0.16);
        ctx.fillStyle = hover === i ? sides[turn].commander.color : '#8fa0c8';
        ctx.font = '700 30px Orbitron, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(CELLKEY[i], c.x, c.y);
        if (hover === i) { ctx.globalAlpha = 0.5; ctx.strokeStyle = sides[turn].commander.color; ctx.lineWidth = 2; roundRect(cellRect(i).x + 12, cellRect(i).y + 12, CELL - 24, CELL - 24, 12); ctx.stroke(); }
        ctx.restore();
      }
      // foresight hint
      if (foresight && foresight.cell === i && board[i] === null && !disabled.has(i)) {
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.35 * Math.abs(Math.sin(clock * 5));
        ctx.strokeStyle = ABILITIES.FORESIGHT.color; ctx.lineWidth = 3; ctx.shadowBlur = 16; ctx.shadowColor = ABILITIES.FORESIGHT.color;
        roundRect(cellRect(i).x + 10, cellRect(i).y + 10, CELL - 20, CELL - 20, 12); ctx.stroke();
        ctx.restore();
      }
      // dead (ion-mined) sector
      if (disabled.has(i)) { drawMine(i, c); continue; }
      // a deployed sigil
      if (board[i]) {
        const loser = state === 'roundover' && winner !== 'draw' && !(winLine && winLine.includes(i));
        let alpha = 1;
        if (loser) alpha = (1 - beam * 0.75) * (0.6 + 0.4 * Math.abs(Math.sin(clock * 22)));
        drawSigil(i, board[i], alpha);
      }
    }
  }

  function drawSigil(i, mark, alpha) {
    const c = cellCenter(i), col = sides[mark].commander.color, sig = sides[mark].commander.sigil;
    const p = placedAt[i] ? clamp((clock - placedAt[i]) / CONFIG.placeAnim, 0, 1) : 1;
    const ease = 1 - Math.pow(1 - p, 3);
    const scale = 0.5 + 0.5 * ease + (p < 1 ? Math.sin(p * Math.PI) * 0.08 : 0);
    ctx.save();
    ctx.globalAlpha = alpha * (0.2 + 0.8 * p);
    ctx.translate(c.x, c.y); ctx.scale(scale, scale);
    Sigils.draw(ctx, sig, 0, 0, CELL * 0.62, col);
    ctx.restore();
    if (p < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.7; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = col;
      ctx.beginPath(); ctx.arc(c.x, c.y, CELL * 0.18 + p * CELL * 0.32, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawMine(i, c) {
    const p = minedAt[i] ? clamp((clock - minedAt[i]) / 0.4, 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha = 0.9 * p;
    ctx.translate(c.x, c.y);
    ctx.strokeStyle = ABILITIES.IONMINE.color; ctx.lineWidth = 3; ctx.shadowBlur = 14; ctx.shadowColor = ABILITIES.IONMINE.color;
    // a dead-sector hex with a slash
    ctx.beginPath();
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 6, r = CELL * 0.26; const x = Math.cos(a) * r, y = Math.sin(a) * r; k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = 0.5 * p; ctx.beginPath(); ctx.moveTo(-CELL * 0.16, -CELL * 0.16); ctx.lineTo(CELL * 0.16, CELL * 0.16); ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.35 * p; ctx.fillStyle = ABILITIES.IONMINE.color;
    ctx.font = '700 12px Orbitron, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DEAD', 0, CELL * 0.34);
    ctx.restore();
  }

  function drawTargetHint(i, c) {
    const t = targeting;
    let ok = false;
    if (t.ability === 'MINDTRICK') ok = board[i] === other(t.side);
    else if (t.ability === 'IONMINE') ok = board[i] === null && !disabled.has(i);
    if (!ok) return;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(clock * 6));
    ctx.strokeStyle = ABILITIES[t.ability].color; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
    roundRect(cellRect(i).x + 8, cellRect(i).y + 8, CELL - 16, CELL - 16, 12); ctx.stroke();
    ctx.restore();
  }

  function drawWinBeam() {
    if (!winLine || state !== 'roundover' || winner === 'draw') return;
    const p = clamp((clock - beamStart) / CONFIG.beamIgnite, 0, 1);
    const col = sides[winner].commander.color;
    const a = cellCenter(winLine[0]), b = cellCenter(winLine[2]);
    const ex = a.x + (b.x - a.x) * p, ey = a.y + (b.y - a.y) * p;
    ctx.save();
    ctx.lineCap = 'round'; ctx.shadowBlur = 30; ctx.shadowColor = col;
    ctx.strokeStyle = col; ctx.lineWidth = 16; ctx.globalAlpha = 0.85;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.shadowBlur = 8; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.globalAlpha = 0.95;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ex, ey); ctx.stroke();
    // igniting tip spark
    if (p < 1) { ctx.shadowBlur = 24; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ex, ey, 9, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function drawParticles() {
    for (const q of particles) { ctx.globalAlpha = Math.max(0, Math.min(1, q.life)); ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function drawFloats() {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 18px Orbitron, system-ui, sans-serif';
    for (const f of floats) { ctx.globalAlpha = Math.max(0, Math.min(1, f.life)); ctx.fillStyle = f.color; ctx.shadowBlur = 8; ctx.shadowColor = f.color; ctx.fillText(f.text, f.x, f.y); }
    ctx.restore();
  }

  /* ---------- HUD ---------- */

  function drawHUD() {
    hudSide('L', 20);
    hudSide('R', W - 20);
    // centre — round + score
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 15px Orbitron, system-ui, sans-serif'; ctx.fillStyle = '#8fa0c8'; ctx.textBaseline = 'top';
    ctx.fillText('ROUND ' + roundNo + ' · BEST OF ' + (target * 2 - 1), W / 2, 22);
    ctx.font = '800 58px Orbitron, system-ui, sans-serif'; ctx.textBaseline = 'middle';
    ctx.fillStyle = sides.L.commander.color; ctx.globalAlpha = 0.95; ctx.fillText(roundWins.L, W / 2 - 58, 78);
    ctx.fillStyle = sides.R.commander.color; ctx.fillText(roundWins.R, W / 2 + 58, 78);
    ctx.globalAlpha = 0.4; ctx.fillStyle = '#9fb0d8'; ctx.font = '700 30px Orbitron, system-ui, sans-serif'; ctx.fillText('–', W / 2, 80);
    ctx.globalAlpha = 1;
    // turn / thinking indicator
    ctx.font = '700 13px Orbitron, system-ui, sans-serif'; ctx.textBaseline = 'top';
    if (state === 'playing') {
      const cmd = sides[turn].commander;
      const label = sides[turn].human ? cmd.title.toUpperCase() + ' TO DEPLOY' : cmd.title.toUpperCase() + ' IS READING THE TABLE…';
      ctx.globalAlpha = 0.7 + 0.3 * Math.abs(Math.sin(clock * 4)); ctx.fillStyle = cmd.color;
      ctx.fillText(label, W / 2, 118);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function hudSide(side, edge) {
    const S = sides[side], left = side === 'L', active = state === 'playing' && turn === side;
    const px = left ? edge + 34 : edge - 34;
    ctx.save();
    if (active) { ctx.shadowBlur = 18; ctx.shadowColor = S.commander.color; }
    Portraits.draw(ctx, S.commander.face, px, 44, 40, S.commander.color);
    ctx.restore();
    ctx.save();
    ctx.textAlign = left ? 'left' : 'right'; ctx.textBaseline = 'middle';
    const tx = left ? edge + 64 : edge - 64;
    ctx.font = '700 15px Orbitron, system-ui, sans-serif'; ctx.fillStyle = active ? '#ffffff' : '#c7d0e8';
    ctx.fillText(S.commander.title.toUpperCase(), tx, 30);
    ctx.font = '400 11px system-ui, sans-serif'; ctx.fillStyle = '#8fa0c8';
    ctx.fillText(S.commander.name + (side === 'R' && opts.mode === 'ai' ? ' · AI' : ''), tx, 46);
    // round-win pips
    for (let k = 0; k < target; k++) {
      const px2 = left ? tx + k * 16 : tx - k * 16;
      ctx.beginPath(); ctx.arc(px2, 62, 5, 0, Math.PI * 2);
      if (k < roundWins[side]) { ctx.fillStyle = S.commander.color; ctx.shadowBlur = 8; ctx.shadowColor = S.commander.color; ctx.fill(); ctx.shadowBlur = 0; }
      else { ctx.strokeStyle = 'rgba(150,170,220,0.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    // ability meter
    if (opts.abilities) {
      const ab = ABILITIES[S.commander.ability];
      const mw = 132, mh = 7, mx = left ? tx : tx - mw, my = 76;
      ctx.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(mx, my, mw, mh, 4); ctx.fill();
      const ready = meter[side] >= 100;
      ctx.fillStyle = ready ? ab.color : S.commander.color;
      ctx.globalAlpha = ready ? (0.6 + 0.4 * Math.abs(Math.sin(clock * 5))) : 0.85;
      roundRect(mx, my, mw * (meter[side] / 100), mh, 4); ctx.fill(); ctx.globalAlpha = 1;
      ctx.textAlign = left ? 'left' : 'right'; ctx.font = '700 9px Orbitron, system-ui, sans-serif';
      ctx.fillStyle = ready ? ab.color : '#7f8cb4';
      ctx.fillText(ready ? ab.name.toUpperCase() + ' READY' : ab.name.toUpperCase(), left ? mx : mx + mw, my + 15);
    }
    ctx.restore();
  }

  function drawBottom() {
    // Force Push shove-arrows during targeting
    if (targeting && targeting.ability === 'FORCEPUSH' && sides[turn].human) drawPushArrows();
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (targeting && sides[turn].human) {
      const ab = ABILITIES[targeting.ability];
      ctx.font = '700 15px Orbitron, system-ui, sans-serif'; ctx.fillStyle = ab.color; ctx.shadowBlur = 10; ctx.shadowColor = ab.color;
      ctx.fillText(ab.name.toUpperCase() + ' — ' + ab.hint.toUpperCase(), W / 2, GB + 40);
      ctx.shadowBlur = 0; ctx.font = '400 12px system-ui, sans-serif'; ctx.fillStyle = '#8fa0c8';
      ctx.fillText('Esc / E to cancel', W / 2, GB + 62);
    } else if (state === 'playing') {
      // ability button for mouse players
      const b = abilityBtnRect();
      if (b) {
        const ab = ABILITIES[sides[turn].commander.ability];
        ctx.globalAlpha = 0.9 + 0.1 * Math.sin(clock * 5);
        ctx.fillStyle = 'rgba(10,14,28,0.8)'; ctx.strokeStyle = ab.color; ctx.lineWidth = 2; ctx.shadowBlur = 14; ctx.shadowColor = ab.color;
        roundRect(b.x, b.y, b.w, b.h, 20); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        ctx.fillStyle = ab.color; ctx.font = '700 14px Orbitron, system-ui, sans-serif';
        ctx.fillText('✦ ' + ab.name.toUpperCase() + ' — READY  (E)', W / 2, b.y + b.h / 2);
      } else if (sides[turn].human) {
        ctx.font = '400 13px system-ui, sans-serif'; ctx.fillStyle = '#8fa0c8';
        const abName = opts.abilities ? ' · charge your ' + ABILITIES[sides[turn].commander.ability].name : '';
        ctx.fillText('Deploy with 1–9 or click a sector' + abName, W / 2, GB + 44);
      }
    }
    ctx.restore();
  }

  function drawPushArrows() {
    ctx.save();
    for (const ar of pushArrows()) {
      const sel = targeting.cell >= 0 && (ar.line.includes(targeting.cell));
      ctx.globalAlpha = sel ? 0.95 : 0.5; ctx.fillStyle = ABILITIES.FORCEPUSH.color;
      ctx.shadowBlur = sel ? 14 : 6; ctx.shadowColor = ABILITIES.FORCEPUSH.color;
      const cx = ar.x + ar.w / 2, cy = ar.y + ar.h / 2, s = 11;
      ctx.beginPath();
      if (ar.kind === 'left') { ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy); ctx.lineTo(cx + s, cy + s); }
      else if (ar.kind === 'right') { ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy); ctx.lineTo(cx - s, cy + s); }
      else if (ar.kind === 'up') { ctx.moveTo(cx - s, cy + s); ctx.lineTo(cx, cy - s); ctx.lineTo(cx + s, cy + s); }
      else { ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx, cy + s); ctx.lineTo(cx + s, cy - s); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawRoundCard() {
    const p = clamp((clock - roundCardAt) / 0.4, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.55 * p; ctx.fillStyle = 'rgba(4,6,14,1)'; ctx.fillRect(GX - 6, GY - 6, CONFIG.grid + 12, CONFIG.grid + 12);
    ctx.globalAlpha = p; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const cx = W / 2, cy = (GY + GB) / 2;
    let title, sub, col;
    if (winner === 'draw') { title = 'STALEMATE'; col = '#9fb0d8'; sub = 'The front holds — no sector seized.'; }
    else { const c = sides[winner].commander; col = c.color; title = 'SECTOR SEIZED'; sub = c.title + ' takes round ' + roundNo + '.'; }
    ctx.font = '800 52px Orbitron, system-ui, sans-serif'; ctx.fillStyle = '#eaf2ff'; ctx.shadowBlur = 26; ctx.shadowColor = col;
    ctx.fillText(title, cx, cy - 40);
    ctx.shadowBlur = 0; ctx.font = '400 17px system-ui, sans-serif'; ctx.fillStyle = '#c7d0e8';
    ctx.fillText(sub, cx, cy + 6);
    ctx.font = '700 14px Orbitron, system-ui, sans-serif'; ctx.fillStyle = col;
    const prompt = matchPending
      ? 'MATCH POINT — ' + sides[matchPending].commander.title + ' wins the front · Enter'
      : 'press  Enter  /  R  for round ' + (roundNo + 1);
    ctx.globalAlpha = p * (0.7 + 0.3 * Math.abs(Math.sin(clock * 4)));
    ctx.fillText(prompt, cx, cy + 44);
    ctx.restore();
  }

  function drawBanner(t, sub) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,6,14,0.6)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 72px Orbitron, system-ui, sans-serif'; ctx.fillStyle = '#eaf2ff'; ctx.shadowBlur = 24; ctx.shadowColor = '#6aa9ff';
    ctx.fillText(t, W / 2, H / 2 - 20);
    ctx.shadowBlur = 0; ctx.font = '400 20px system-ui, sans-serif'; ctx.fillStyle = '#9fb0d8';
    ctx.fillText(sub, W / 2, H / 2 + 40);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function hexHue(hex) {
    let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16) / 255, g = parseInt(h.slice(2, 4), 16) / 255, b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b); let hh = 0;
    if (max !== min) { const d = max - min; switch (max) { case r: hh = (g - b) / d + (g < b ? 6 : 0); break; case g: hh = (b - r) / d + 2; break; default: hh = (r - g) / d + 4; } hh /= 6; }
    return hh;
  }

  /* ---------- loop ---------- */

  function update(dt) {
    if (sides && !sides[turn].human && !targeting) {
      aiTimer -= dt;
      if (aiTimer <= 0) aiTakeTurn();
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.033, (now - last) / 1000) || 0;
    last = now; clock += dt;
    _humOn = !!(SFX.isEnabled() && state === 'playing' && !paused);
    if (state === 'playing' && !paused) update(dt);
    driftSpace(dt); updateParticles(dt); updateFloats(dt);
    shake *= 0.86;
    render();
  }

  /* ---------- snapshot + debug hooks ---------- */

  function getSnapshot() {
    return {
      state, paused, turn,
      board: board ? board.slice() : new Array(9).fill(null),
      disabled: disabled ? [...disabled] : [],
      winner, winLine: winLine ? winLine.slice() : null,
      round: roundNo || 0, roundWins: roundWins ? { ...roundWins } : { L: 0, R: 0 }, draws: draws || 0, target: target || 2,
      matchWinner,
      abilities: !!(opts && opts.abilities),
      meter: meter ? { ...meter } : { L: 0, R: 0 },
      reinforce: reinforce ? { ...reinforce } : { L: 0, R: 0 },
      foresight: foresight ? { ...foresight } : null,
      targeting: targeting ? { side: targeting.side, ability: targeting.ability, cell: targeting.cell } : null,
      streak, best,
      mode: opts ? opts.mode : null,
      sides: sides ? {
        L: { id: sides.L.commander.id, ai: sides.L.commander.ai, human: sides.L.human, ability: sides.L.commander.ability },
        R: { id: sides.R.commander.id, ai: sides.R.commander.ai, human: sides.R.human, ability: sides.R.commander.ability },
      } : null,
    };
  }

  return {
    attach, start, stop, togglePause, advance,
    armAbility, applyAbilityTarget, cancelTargeting,
    getState: () => state, isPaused: () => paused, getBest, getStreak, getSnapshot,
    // Pure rules re-exposed for a test rig (no engine state is touched).
    __debug: { winnerOf, lineFor, playable, isDraw, winCellsFor, minimax, chooseMove, simPush, LINES, ROWS, COLS, KEYCELL, CELLKEY },
  };
})();
