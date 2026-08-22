export const AI_TYPES = {
  explorer:   { speed: 1.0, aggression: 0.15, size: 1.0, color: [0x60ff90, 0x40c070], name: 'Explorer' },
  hunter:     { speed: 1.15, aggression: 0.7, size: 1.05, color: [0xff6b9d, 0xe05080], name: 'Hunter' },
  collector:  { speed: 0.95, aggression: 0.1, size: 0.95, color: [0x40e0ff, 0x20b0d0], name: 'Collector' },
  aggressive: { speed: 1.2, aggression: 0.85, size: 1.1, color: [0xff6060, 0xd04040], name: 'Raider' },
  defensive:  { speed: 0.9, aggression: 0.2, size: 1.15, color: [0xa0a0ff, 0x7070e0], name: 'Guardian' },
  giant:      { speed: 0.75, aggression: 0.5, size: 1.8, color: [0xffb040, 0xe09030], name: 'Titan' },
  speedster:  { speed: 1.45, aggression: 0.4, size: 0.7, color: [0xffe060, 0xd0c040], name: 'Flash' },
  elite:      { speed: 1.25, aggression: 0.9, size: 1.5, color: [0xc060ff, 0xa040e0], name: 'Elite' },
};

export function pickAIType(biasList) {
  const keys = biasList?.length ? biasList : Object.keys(AI_TYPES);
  const r = Math.random();
  if (r < 0.035) return 'elite';
  if (r < 0.07) return 'giant';
  return keys[(Math.random() * keys.length) | 0];
}

export const AI_NAMES = ['Nova','Rex','Echo','Blitz','Kai','Vex','Orion','Nyx','Ash','Pixel','Drift','Spark','Rogue','Zen','Flux','Hex','Lyra','Bolt','Shade','Prism'];
