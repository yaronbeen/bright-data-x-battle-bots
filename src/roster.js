/**
 * BattleBots roster — iconic bots with metadata and local images.
 */

export const ROSTER = [
  { id: 'minotaur', name: 'Minotaur', team: 'RioBotz', weapon: 'Drum spinner', country: 'Brazil', image: '/img/minotaur.png' },
  { id: 'hydra', name: 'Hydra', team: 'Team Whyachi', weapon: 'Hydraulic flipper', country: 'USA', image: '/img/hydra.jpg' },
  { id: 'witch-doctor', name: 'Witch Doctor', team: 'Team Witch Doctor', weapon: 'Vertical spinner', country: 'USA', image: '/img/witch-doctor.png' },
  { id: 'bite-force', name: 'Bite Force', team: 'Aptyx Designs', weapon: 'Vertical spinner', country: 'USA', image: '/img/bite-force.jpg' },
  { id: 'tombstone', name: 'Tombstone', team: 'Hardcore Robotics', weapon: 'Horizontal spinner', country: 'USA', image: '/img/tombstone.png' },
  { id: 'end-game', name: 'End Game', team: 'Team End Game', weapon: 'Vertical spinner', country: 'New Zealand', image: '/img/end-game.png' },
  { id: 'sawblaze', name: 'SawBlaze', team: 'Team SawBlaze', weapon: 'Hammer saw', country: 'USA', image: '/img/sawblaze.png' },
  { id: 'cobalt', name: 'Cobalt', team: 'Team Carbide', weapon: 'Vertical spinner', country: 'UK', image: '/img/cobalt.png' },
  { id: 'hypershock', name: 'HyperShock', team: 'Team HyperShock', weapon: 'Vertical spinner', country: 'USA', image: '/img/hypershock.png' },
  { id: 'whiplash', name: 'Whiplash', team: 'Team Fast Electric Robots', weapon: 'Vertical spinner/lifter', country: 'USA', image: '/img/whiplash.jpg' },
];

export function getBot(id) {
  return ROSTER.find((b) => b.id === id) || null;
}
