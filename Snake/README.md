# LoveHub Snake 3D — Sector Edition

Premium **playable 3D Snake** built with **Three.js (WebGL)** for the LoveHub ecosystem.

This is a **standalone** repository. It does not depend on the LoveHub SPA shell to run.

## Play locally

```bash
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080`

## Controls

| Input | Action |
|-------|--------|
| Arrow keys / WASD | Steer |
| Space / Shift | Boost |
| Touch joystick / swipe | Mobile steer |
| P / Pause button | Pause |

## Languages

- English (LTR)
- فارسی (RTL)

Toggle with **EN / فا** on the menu.

## Architecture (Phase 1)

```
Game Engine  →  Game State  →  Input  →  Network (stub)  →  LoveHub Bridge
```

- **Real 3D**: Three.js WebGL, PerspectiveCamera, meshes, lights, shadows
- **Single-player** works offline without network
- **LoveHubBridge** is optional — reads parent/window LoveHub services when embedded
- **GameNetworkService** is a clean stub for future couple multiplayer

## Structure

```
index.html
css/game.css
js/
  main.js
  engine/GameEngine.js
  entities/Snake.js
  entities/Food.js
  worlds/SectorCity.js
  systems/InputSystem.js
  i18n/
  integration/LoveHubBridge.js
  network/GameNetworkService.js
```

## Deploy

- Vercel / Netlify / any static host
- `vercel.json` included

## Relation to LoveHub

Later you can embed or link from LoveHub Games Hub.

Do **not** mix this with other neon/snake demos — this is the flagship 3D title.

## License

Private / LoveHub — Sector
