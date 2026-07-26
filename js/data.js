/* Holo Gambit — game configuration, the roster of commanders, and the abilities.
 *
 * Every commander here is an original archetype. None reproduce a trademarked
 * name, character, or likeness — they evoke the space-fantasy genre the way the
 * rest of the game does. See LICENSE for the trademark note.
 *
 * The core game is tic-tac-toe: two commanders take turns deploying a sigil to a
 * 3x3 grid of contested sectors, and three in a row (row, column, or diagonal)
 * seizes the round. Each commander carries exactly one signature ability
 * (MINDTRICK / FORCEPUSH / IONMINE / FORESIGHT / REINFORCE), charged over the
 * match by deploying sigils and winning rounds.
 */
const CONFIG = {
  W: 820,                 // internal render width  (canvas scales to fit)
  H: 968,                 // internal render height
  grid: 630,              // holotable side length (a 3x3 of 210px sectors)
  hudTop: 208,            // y where the holotable begins (top HUD band above)
  chargePerPlace: 20,     // ability meter gained when you deploy a sigil
  chargeOnRoundWin: 34,   // extra meter for seizing a round (carries between rounds)
  aiThinkMin: 0.5,        // seconds the opponent "reads the table" before moving
  aiThinkMax: 0.95,
  placeAnim: 0.42,        // seconds a sigil takes to materialize in
  beamIgnite: 0.55,       // seconds the winning beam takes to ignite down the line
};

/* Signature abilities — the tic-tac-toe analogue of the siblings' Force / ability
 * meter. `target` tells the engine what the ability needs aimed at it:
 *   enemy  → an enemy-held sector        empty → an empty sector
 *   line   → a row or column + direction  none  → fires instantly, no target
 * One per commander; several are shared across commanders. */
const ABILITIES = {
  MINDTRICK: {
    key: 'MINDTRICK', name: 'Mind Trick', color: '#7ad7ff', target: 'enemy', ends: true,
    blurb: 'Erase one enemy sigil from the grid.',
    hint: 'pick an enemy sector to erase',
  },
  FORCEPUSH: {
    key: 'FORCEPUSH', name: 'Force Push', color: '#ff5a5a', target: 'line', ends: true,
    blurb: 'Shove a row or column one sector over.',
    hint: 'pick a sector, then an arrow to shove its row / column',
  },
  IONMINE: {
    key: 'IONMINE', name: 'Ion Mine', color: '#ffc23c', target: 'empty', ends: true,
    blurb: 'Kill a sector for the rest of the round.',
    hint: 'pick an empty sector to disable',
  },
  FORESIGHT: {
    key: 'FORESIGHT', name: 'Foresight', color: '#49ff6a', target: 'none', ends: false,
    blurb: 'Light up your strongest next move.',
    hint: '',
  },
  REINFORCE: {
    key: 'REINFORCE', name: 'Reinforcements', color: '#c08bff', target: 'none', ends: false,
    blurb: 'Deploy two sigils in a single turn.',
    hint: '',
  },
};

/* Each commander: a sigil colour, a canvas-drawn sigil (their mark on the grid,
 * instead of X and O), a canvas-drawn portrait, one signature ability, and an AI
 * temperament (aggressive / defensive / cunning) that flavours how they play as
 * the opponent — it never weakens Master's perfect placement, only breaks ties
 * and drives when the commander spends its ability. */
const COMMANDERS = [
  {
    id: 'starborn', name: 'Aurex Vane', title: 'The Starborn', face: 'starborn', sigil: 'starbird',
    color: '#3ba7ff', ability: 'FORESIGHT', ai: 'defensive',
    bio: 'A luminous idealist who reads three moves ahead.',
  },
  {
    id: 'warden', name: 'Dregan Kol', title: 'The Iron Warden', face: 'warden', sigil: 'cog',
    color: '#ff4d4d', ability: 'FORCEPUSH', ai: 'aggressive',
    bio: 'A siege-marshal who takes ground flank by flank.',
  },
  {
    id: 'tactician', name: 'Sabaan V-35', title: 'The Tactician', face: 'tactician', sigil: 'ring',
    color: '#35d6c4', ability: 'MINDTRICK', ai: 'cunning',
    bio: 'A cold, exact droid that unmakes your best sigil.',
  },
  {
    id: 'sunwarden', name: 'Mira Sol', title: 'The Sunwarden', face: 'sunwarden', sigil: 'sunburst',
    color: '#ffb42e', ability: 'REINFORCE', ai: 'aggressive',
    bio: 'A sun-zealot who never sends one when two will do.',
  },
  {
    id: 'voidsnake', name: 'Kessa Rue', title: 'The Void Serpent', face: 'voidsnake', sigil: 'serpent',
    color: '#a86bff', ability: 'IONMINE', ai: 'cunning',
    bio: 'A smuggler who wins by sealing the board shut.',
  },
  {
    id: 'bulwark', name: 'Torvald Grimm', title: 'The Bulwark', face: 'bulwark', sigil: 'helm',
    color: '#49ff6a', ability: 'FORCEPUSH', ai: 'defensive',
    bio: 'An old guard who heaves your whole line back.',
  },
  {
    id: 'duelist', name: 'Rhian Ashe', title: 'The Duelist', face: 'duelist', sigil: 'sabers',
    color: '#ff2d6b', ability: 'MINDTRICK', ai: 'aggressive',
    bio: 'An exiled blade-master who duels every round.',
  },
  {
    id: 'corsair', name: 'Nyra Talon', title: 'The Corsair', face: 'corsair', sigil: 'delta',
    color: '#ff7a3c', ability: 'REINFORCE', ai: 'cunning',
    bio: 'A privateer, gone before you find the fork.',
  },
];

const COMMANDER_BY_ID = Object.fromEntries(COMMANDERS.map(c => [c.id, c]));
