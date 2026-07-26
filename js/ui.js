/* Holo Gambit — menu, commander selection, and the flow between screens. */
(() => {
  const sel = { mode: 'ai', difficulty: 'knight', matchLen: 3, abilities: true, left: 'starborn', right: 'warden', sound: true };

  const $ = s => document.querySelector(s);
  const el = {
    menu: $('#menu'), game: $('#game'), result: $('#result'),
    pickerL: $('#pickerL'), pickerR: $('#pickerR'), best: $('#bestLine'),
    board: $('#board'), matchLabel: $('#matchLabel'),
    controlsHint: $('#controlsHint'), matchControls: $('#matchControls'),
    start: $('#startBtn'), quit: $('#quitBtn'), pause: $('#pauseBtn'),
    soundChk: $('#soundChk'), soundBtn: $('#soundBtn'),
    rematch: $('#rematchBtn'), toMenu: $('#menuBtn'),
    winPortrait: $('#winPortrait'), winTitle: $('#winTitle'), winSub: $('#winSub'),
    winStats: $('#winStats'), diffSeg: $('#diffSeg'),
  };

  /* ----- draw helpers ----- */
  function portrait(canvas, cmd, dim) {
    canvas.width = dim; canvas.height = dim;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, dim, dim);
    Portraits.draw(ctx, cmd.face, dim / 2, dim / 2, dim * 0.82, cmd.color);
  }
  function sigil(canvas, cmd, dim) {
    canvas.width = dim; canvas.height = dim;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, dim, dim);
    Sigils.draw(ctx, cmd.sigil, dim / 2, dim / 2, dim * 0.82, cmd.color);
  }

  /* ----- commander pickers ----- */
  function buildPicker(side) {
    const host = side === 'L' ? el.pickerL : el.pickerR;
    host.innerHTML = `
      <div class="picker-head">
        <div class="picker-side" data-role="side"></div>
        <canvas class="hero-sigil" data-role="sigil" title="This commander's sigil — their mark on the grid"></canvas>
      </div>
      <div class="hero">
        <canvas data-role="hero"></canvas>
        <div class="hero-info">
          <div class="hero-name" data-role="name"></div>
          <div class="hero-title" data-role="title"></div>
          <div class="hero-bio" data-role="bio"></div>
        </div>
      </div>
      <div class="hero-force" data-role="force"></div>
      <div class="chips" data-role="chips"></div>`;
    const chips = host.querySelector('[data-role=chips]');
    COMMANDERS.forEach(c => {
      const chip = document.createElement('button');
      chip.className = 'chip'; chip.style.color = c.color; chip.title = `${c.name} — ${c.title}`;
      const cv = document.createElement('canvas'); portrait(cv, c, 54); chip.appendChild(cv);
      chip.addEventListener('click', () => { sel[side === 'L' ? 'left' : 'right'] = c.id; SFX.ui(); renderPicker(side); });
      chips.appendChild(chip);
    });
    renderPicker(side);
  }

  function renderPicker(side) {
    const host = side === 'L' ? el.pickerL : el.pickerR;
    const c = COMMANDER_BY_ID[side === 'L' ? sel.left : sel.right];
    host.querySelector('[data-role=side]').innerHTML =
      side === 'L' ? 'Left · <b>You</b>' : (sel.mode === 'ai' ? 'Right · <b>Opponent AI</b>' : 'Right · <b>Player 2</b>');
    portrait(host.querySelector('[data-role=hero]'), c, 92);
    sigil(host.querySelector('[data-role=sigil]'), c, 58);
    host.querySelector('[data-role=name]').textContent = c.name;
    const t = host.querySelector('[data-role=title]'); t.textContent = c.title; t.style.color = c.color;
    host.querySelector('[data-role=bio]').textContent = c.bio;
    const ab = ABILITIES[c.ability];
    host.querySelector('[data-role=force]').innerHTML =
      `<b style="color:${ab.color}">✦ ${ab.name}</b> — ${ab.blurb}` +
      `<span class="temperament"> · ${c.ai}</span>`;
    host.querySelectorAll('.chip').forEach((chip, i) => chip.classList.toggle('sel', COMMANDERS[i].id === c.id));
  }

  /* ----- segmented controls ----- */
  function wireSeg(segId, key, dataKey, cast, after) {
    const seg = $('#' + segId);
    seg.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        seg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        sel[key] = cast ? cast(btn.dataset[dataKey]) : btn.dataset[dataKey];
        SFX.ui(); after && after();
      });
    });
  }

  function updateModeUI() {
    el.diffSeg.classList.toggle('disabled', sel.mode !== 'ai');
    renderPicker('R');
    el.controlsHint.innerHTML = controlsHTML();
  }

  function controlsHTML() {
    const two = sel.mode === '2p';
    let s = `Deploy: <kbd>1</kbd>–<kbd>9</kbd> (numpad layout) or click a sector`;
    if (sel.abilities) s += ` &nbsp;·&nbsp; Ability: <kbd>E</kbd>`;
    s += ` &nbsp;·&nbsp; <kbd>P</kbd> pause &nbsp;·&nbsp; <kbd>Enter</kbd> next round`;
    if (two) s += ` &nbsp;·&nbsp; players share the board, each on their turn`;
    return s;
  }

  /* ----- flow ----- */
  function startGame() {
    SFX.init(); SFX.setEnabled(sel.sound);
    el.menu.classList.add('hidden'); el.game.classList.remove('hidden'); el.result.classList.add('hidden');
    const L = COMMANDER_BY_ID[sel.left], R = COMMANDER_BY_ID[sel.right];
    el.matchLabel.textContent =
      `${L.title} vs ${R.title} · best of ${sel.matchLen}` +
      (sel.mode === 'ai' ? ` · ${sel.difficulty}` : ' · hotseat') +
      (sel.abilities ? ' · abilities' : ' · classic');
    el.matchControls.innerHTML = controlsHTML();
    Game.start({ mode: sel.mode, left: sel.left, right: sel.right, difficulty: sel.difficulty, matchLen: sel.matchLen, abilities: sel.abilities }, onEnd);
    el.pause.textContent = 'Pause';
  }

  function onEnd(res) {
    portrait(el.winPortrait, res.commander, 140);
    const humanWon = res.mode === 'ai' && res.winner === 'L';
    const humanLost = res.mode === 'ai' && res.winner === 'R';
    el.winTitle.textContent = humanLost ? 'Front Lost' : (res.commander.title + ' Wins');
    el.winTitle.style.color = res.commander.color;
    if (res.mode === 'ai') {
      el.winSub.textContent = humanWon
        ? `${res.commander.name} seizes the front ${res.roundWins.L}–${res.roundWins.R}. The holotable is yours.`
        : `${res.commander.name} holds the front ${res.roundWins.R}–${res.roundWins.L}. Regroup and try again.`;
    } else {
      el.winSub.textContent = `${res.commander.name} takes the front ${Math.max(res.roundWins.L, res.roundWins.R)}–${Math.min(res.roundWins.L, res.roundWins.R)}.`;
    }
    const streakBlock = res.mode === 'ai'
      ? `<div><span>${res.streak}</span><label>Win streak</label></div><div><span>${res.best}</span><label>Best streak</label></div>`
      : '';
    el.winStats.innerHTML =
      `<div><span>${res.roundWins.L}–${res.roundWins.R}</span><label>Rounds</label></div>` +
      `<div><span>${res.draws}</span><label>Stalemates</label></div>` + streakBlock;
    setTimeout(() => el.result.classList.remove('hidden'), humanLost ? 700 : 950);
  }

  function toMenu() {
    Game.stop();
    el.result.classList.add('hidden'); el.game.classList.add('hidden'); el.menu.classList.remove('hidden');
    refreshBest();
  }
  function refreshBest() {
    const b = Game.getBest();
    el.best.textContent = b > 0 ? `Best win streak vs the AI · ${b}` : 'No matches won yet · set the first streak';
  }

  /* ----- init ----- */
  function init() {
    Game.attach(el.board);
    buildPicker('L'); buildPicker('R');
    wireSeg('modeSeg', 'mode', 'mode', null, updateModeUI);
    wireSeg('diffSeg', 'difficulty', 'diff');
    wireSeg('lenSeg', 'matchLen', 'len', v => parseInt(v, 10));
    wireSeg('abilSeg', 'abilities', 'abil', v => v === 'on', updateModeUI);
    updateModeUI(); refreshBest();

    el.start.addEventListener('click', startGame);
    el.rematch.addEventListener('click', startGame);
    el.toMenu.addEventListener('click', toMenu);
    el.quit.addEventListener('click', toMenu);
    el.pause.addEventListener('click', () => { Game.togglePause(); el.pause.textContent = Game.isPaused() ? 'Resume' : 'Pause'; });
    el.soundChk.addEventListener('change', () => { sel.sound = el.soundChk.checked; SFX.setEnabled(sel.sound); });
    el.soundBtn.addEventListener('click', () => {
      sel.sound = !sel.sound; SFX.setEnabled(sel.sound);
      el.soundBtn.style.opacity = sel.sound ? '1' : '0.4'; el.soundChk.checked = sel.sound;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
