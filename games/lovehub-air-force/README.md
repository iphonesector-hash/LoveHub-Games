# LoveHub Air Force

Premium standalone vertical arcade shoot 'em up for the LoveHub Games Hub.

## Features
- Mobile-first drag movement (touch/mouse) + keyboard support
- Auto-firing primary weapons, 5 weapon types (Cannon, Spread, Laser, Missile, Burst)
- 8 enemy archetypes with dynamic formations (Vee, Arc, Spiral, ...)
- 3 levels: City, Storm, Nebula — each with a multi-phase boss
- Love Energy currency, Hangar upgrade progression, persistent save (localStorage)
- Procedural WebAudio music + SFX (no external assets)
- EN / FA (RTL) localization
- Public embedding API on `window.LoveHubAirForce`

## Tech
HTML5 Canvas 2D renderer, TypeScript ES modules, React + TanStack Start shell, Tailwind v4 styling.

## Structure
```
src/game/           engine (core loop, enemies, weapons, systems, effects, render)
src/components/game UI shell, HUD, menus
src/routes/         app routes mounting the game
src/styles.css      cosmic theme
```

## Public API
```js
const api = window.LoveHubAirForce;
api.start(1); api.pause(); api.resume();
api.getScore(); api.getProgress();
api.on(e => console.log(e)); // { type: 'hud' | 'runEnd', payload }
api.setLeaderboard(adapter);
api.destroy();
```

## Run locally
```sh
npm i && npm run dev
```
