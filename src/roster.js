/**
 * BattleBots roster — 30 iconic bots with metadata and local images.
 */

export const ROSTER = [
  // ── Original 10 (with downloaded images) ──
  { id: 'minotaur', name: 'Minotaur', team: 'RioBotz', weapon: 'Drum spinner', country: 'Brazil', image: '/img/minotaur.png' },
  { id: 'hydra', name: 'Hydra', team: 'Team Whyachi', weapon: 'Hydraulic flipper', country: 'USA', image: '/img/hydra.jpg' },
  { id: 'witch-doctor', name: 'Witch Doctor', team: 'Team Witch Doctor', weapon: 'Vertical disc', country: 'USA', image: '/img/witch-doctor.png' },
  { id: 'bite-force', name: 'Bite Force', team: 'Aptyx Designs', weapon: 'Vertical disc', country: 'USA', image: '/img/bite-force.jpg' },
  { id: 'tombstone', name: 'Tombstone', team: 'Hardcore Robotics', weapon: 'Horizontal bar', country: 'USA', image: '/img/tombstone.png' },
  { id: 'end-game', name: 'End Game', team: 'Team End Game', weapon: 'Vertical disc', country: 'New Zealand', image: '/img/end-game.png' },
  { id: 'sawblaze', name: 'SawBlaze', team: 'Team SawBlaze', weapon: 'Hammer saw', country: 'USA', image: '/img/sawblaze.png' },
  { id: 'cobalt', name: 'Cobalt', team: 'Team Carbide', weapon: 'Vertical bar', country: 'UK', image: '/img/cobalt.png' },
  { id: 'hypershock', name: 'HyperShock', team: 'Team HyperShock', weapon: 'Vertical disc', country: 'USA', image: '/img/hypershock.png' },
  { id: 'whiplash', name: 'Whiplash', team: 'Team Fast Electric Robots', weapon: 'Vertical disc/lifter', country: 'USA', image: '/img/whiplash.jpg' },

  // ── 20 additional bots ──
  { id: 'ribbot', name: 'Ribbot', team: 'Team Ribbot', weapon: 'Vertical disc', country: 'USA', image: null },
  { id: 'huge', name: 'Huge', team: 'Team Huge', weapon: 'Vertical bar', country: 'USA', image: null },
  { id: 'riptide', name: 'Riptide', team: 'Team Riptide', weapon: 'Vertical disc', country: 'USA', image: null },
  { id: 'tantrum', name: 'Tantrum', team: 'Seems Reasonable Robotics', weapon: 'Puncher', country: 'USA', image: null },
  { id: 'copperhead', name: 'Copperhead', team: 'Team Copperhead', weapon: 'Drum spinner', country: 'USA', image: null },
  { id: 'blip', name: 'Blip', team: 'Seems Reasonable Robotics', weapon: 'Pneumatic flipper', country: 'USA', image: null },
  { id: 'black-dragon', name: 'Black Dragon', team: 'Team Black Dragon', weapon: 'Drum spinner', country: 'Brazil', image: null },
  { id: 'mammoth', name: 'Mammoth', team: 'Team Mammoth', weapon: 'Rotary lifter', country: 'USA', image: null },
  { id: 'lock-jaw', name: 'Lock-Jaw', team: 'Mutant Robots', weapon: 'Vertical disc/lifter', country: 'USA', image: null },
  { id: 'rotator', name: 'Rotator', team: 'Team Rotator', weapon: 'Horizontal/vertical disc', country: 'USA', image: null },
  { id: 'captain-shrederator', name: 'Captain Shrederator', team: 'Team Shrederator', weapon: 'Full-body spinner', country: 'USA', image: null },
  { id: 'bronco', name: 'Bronco', team: 'Inertia Labs', weapon: 'Pneumatic flipper', country: 'USA', image: null },
  { id: 'skorpios', name: 'Skorpios', team: 'Team Skorpios', weapon: 'Overhead saw', country: 'USA', image: null },
  { id: 'valkyrie', name: 'Valkyrie', team: 'Team Valkyrie', weapon: 'Horizontal disc', country: 'USA', image: null },
  { id: 'uppercut', name: 'Uppercut', team: 'Team Uppercut', weapon: 'Vertical disc', country: 'USA', image: null },
  { id: 'gruff', name: 'Gruff', team: 'Team Gruff', weapon: 'Flamethrower/lifter', country: 'USA', image: null },
  { id: 'shatter', name: 'Shatter', team: 'Team Shatter', weapon: 'Hammer', country: 'USA', image: null },
  { id: 'kraken', name: 'Kraken', team: 'Team Kraken', weapon: 'Crushing jaw', country: 'USA', image: null },
  { id: 'jackpot', name: 'Jackpot', team: 'Team Jackpot', weapon: 'Vertical disc', country: 'USA', image: null },
  { id: 'madcatter', name: 'MadCatter', team: 'Team MadCatter', weapon: 'Vertical disc', country: 'USA', image: null },
];

export function getBot(id) {
  return ROSTER.find((b) => b.id === id) || null;
}
