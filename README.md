# Holo Gambit

## What this is

A modern, space-fantasy take on **tic-tac-toe**: two commanders face off across a
glowing **holotable** — a 3×3 grid of contested sectors projected in light. Each
turn you deploy your **sigil** to a sector, and aligning three in a row — row,
column, or diagonal — seizes the front and wins the round. It's tic-tac-toe at
the core, dressed as a hologram-table duel between rival fleets.

Before the match you pick a **commander** — eight original archetypes, each with
a different colour, a unique canvas-drawn **sigil** used as their mark on the grid
instead of X and O, a stylized portrait, one signature **ability** you charge over
the match, and an AI temperament that flavours how they play as the opponent.

It plays the way a modern arcade game should: sigils that warp and materialize in,
a saber-style beam that ignites down the winning three, particle bursts and screen
shake, a translucent holotable with scanlines and shimmer, a starfield behind it,
and crisp round, stalemate, and match-win cards — all with no images, no fonts,
and no network calls. Every pixel is drawn at runtime with canvas primitives, and
every sound is generated live from oscillators.

Take on the AI at three skill levels, or play a friend at one keyboard. The AI's
top tier plays perfect minimax — at classic rules it cannot be beaten, only drawn.

## What this is not

- **Not a Star Wars product.** No affiliation with, endorsement by, or assets
  from Lucasfilm or Disney. Every commander is an original archetype — no
  trademarked name, character, or likeness is used. See the trademark note in
  `LICENSE`.
- **Not online, and nothing to install.** One folder, one browser, no accounts,
  and no data leaves the machine. Only your best win streak is kept, in the
  browser's own local storage.
- **Not networked multiplayer.** Two players share one keyboard (hotseat), or you
  duel the built-in AI opponent.
- **Not solved-and-boring.** Classic tic-tac-toe draws itself between two perfect
  players — so Holo Gambit layers on commanders, board-bending abilities, and
  best-of match play to make every match a real fight. (You can switch the
  abilities off for a pure classic duel any time.)

## At a glance

| | |
|---|---|
| **Type** | Turn-based grid duel (tic-tac-toe, reimagined as a holotable battle) |
| **Players** | 2 hotseat, or 1 vs. the AI |
| **Commanders** | 8 original archetypes, each with a unique sigil + ability |
| **Abilities** | 5 — Mind Trick, Force Push, Ion Mine, Foresight, Reinforcements |
| **AI difficulty** | Padawan / Knight / Master (Master is perfect minimax) |
| **Match length** | Best of 3 or best of 5 rounds |
| **Feel** | Materializing sigils, an igniting win-beam, holotable shimmer, particles, screen shake |
| **Audio** | Fully synthesized (WebAudio) — holotable hum, sigil blip, ability whoosh, win chord |
| **Persistence** | Best win streak saved in `localStorage` |
| **Tech** | Vanilla HTML/CSS/JS + canvas. No build, no dependencies, no assets |
| **Port** | 8133 |

## Features

- **Eight commanders, eight ways to play.** The Starborn reads the currents with
  Foresight; the Iron Warden and the Bulwark heave whole lines aside with Force
  Push; the Tactician and the Duelist strike a sigil from your grasp with Mind
  Trick; the Sunwarden and the Corsair flood the front with Reinforcements; and
  the Void Serpent seals sectors shut with an Ion Mine. Each has an original name,
  title, bio, colour, portrait, and a hand-drawn sigil used as their grid mark.
- **A real, sharp, beatable AI.** **Master** plays perfect minimax — at classic
  rules it never loses, so the best you can do is force the draw, and Master vs.
  Master is always a stalemate. **Knight** is strong with the occasional slip, and
  **Padawan** makes real, human mistakes. Each commander's temperament
  (aggressive / defensive / cunning) breaks ties and drives when they spend an
  ability.
- **Abilities that visibly bend the board.** Charge the meter by deploying sigils
  and winning rounds, then unleash one: **Mind Trick** erases an enemy sigil,
  **Force Push** shoves a whole row or column one sector over (the far sigil
  topples off), **Ion Mine** kills a sector for the round, **Foresight** lights up
  your strongest move, and **Reinforcements** lets you deploy two sigils in one
  turn. Every one is a legal, deterministic board transform — powerful, but fair.
- **Match play, not one-and-done.** Best of 3 or best of 5, with round-win pips,
  a running score, an alternating opening player, a between-rounds beat, and a
  match-win screen. Your longest win streak against the AI is saved between
  sessions.
- **Modern arcade juice.** Sigils warp and flash into their sector; the winning
  three ignite a saber-style beam while the losing sigils flicker out; abilities
  throw particle bursts and shake the table; a translucent holotable shimmers with
  scanlines over a drifting starfield; and a turn indicator always shows whose
  move it is.
- **Drawn and synthesized from nothing.** Starfield, nebulae, the holotable and
  its projector glow, every sigil, the portraits, the win-beam, particles, and HUD
  are all canvas primitives; the holotable hum, sigil blip, ability whoosh, round
  chord, stalemate tone, and match fanfare are all generated live. No image, audio,
  or font file ships with the game.

## How to use it

1. Open the game and choose **Solo vs AI** or **Two Players**.
2. In solo, pick a **skill** — Padawan, Knight, or Master.
3. Choose a **match length** (best of 3 or 5) and whether **abilities** are on or
   off (off is pure classic tic-tac-toe).
4. Pick a **commander** for each side. Read each one's sigil, ability, and
   temperament — they play very differently.
5. Press **Project & Duel**. Deploy your sigil each turn; align three in a row to
   seize the round; win the majority of rounds to take the match.

**Controls**

- **Deploy a sigil** — number keys `1`–`9` (numpad layout, so `7 8 9` is the top
  row and `1 2 3` the bottom), or click / tap a sector.
- **Fire your ability** — `E`, or click the READY banner. Then aim it:
  - *Mind Trick / Ion Mine* — press the sector's number or click it.
  - *Force Push* — pick a sector (number or click), then an **arrow key** to shove
    its row (←/→) or column (↑/↓); or click one of the glowing shove-arrows around
    the grid.
  - *Foresight / Reinforcements* — fire and no aiming is needed.
  - Cancel targeting with `Esc` or `E`.
- **Advance rounds** — `Enter` or `R` (or click) on the between-rounds card.
- **Pause** — `P`.
- **Two players** — the board is shared; each player acts on their own turn, with
  their own sigil and ability.

## Run it locally

From the repository folder:

```
python -m http.server 8133
```

Then open **http://localhost:8133**. Any static file server works — or just open
`index.html` directly in a browser. There is no build step and nothing to install.

## Project structure

```
holo-gambit/
├── index.html          Title / commander select, the match stage, the result card
├── css/
│   └── style.css        Dark holotable-console theme — glows, panels, sigil accents
├── js/
│   ├── data.js          Config + the 8 commanders and their 5 abilities
│   ├── portraits.js     Original stylized portraits and sigil glyphs, canvas paths
│   ├── audio.js         Synthesized sound — holotable hum, blips, win chord (WebAudio)
│   ├── engine.js        Board state, win/draw detection, the minimax AI, abilities, render, loop
│   └── ui.js            Menu, commander pickers, and the flow between screens
├── README.md
└── LICENSE
```

Adding a commander means appending one object to `COMMANDERS` in `js/data.js` (and
one portrait drawer plus one sigil drawer in `js/portraits.js`). Nothing else in
the engine has to change.

## License

Dual-licensed — MIT for the code, CC BY-NC-SA 4.0 for the written game content.
See [LICENSE](LICENSE), including the trademark note on "Star Wars".
