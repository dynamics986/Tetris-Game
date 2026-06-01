# Neon Tetris

A complete, static, browser-based Tetris game with a modern dark neon interface. The project is built with plain HTML, CSS, and JavaScript, so it can be opened locally or deployed instantly to GitHub Pages without any build step or backend.

## Features

- Standard 10x20 Tetris board with visible grid lines
- All 7 classic tetrominoes: I, O, T, S, Z, J, and L
- Keyboard controls for desktop play
- Touch controls for phones and tablets
- Next piece preview
- Ghost piece landing preview
- Line clearing, scoring, levels, and increasing game speed
- Start, pause, resume, and game over states
- Local high score saved with `localStorage`
- Responsive layout designed for desktop and mobile screens
- Fully static files, ready for GitHub Pages

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move left | Left arrow | Left button |
| Move right | Right arrow | Right button |
| Rotate | Up arrow | Rotate button |
| Soft drop | Down arrow | Down button |
| Hard drop | Spacebar | Drop button |
| Pause / resume | `P` or `Esc` | Pause button |

## Scoring

| Clear | Points |
| --- | ---: |
| Single | 100 x level |
| Double | 300 x level |
| Triple | 500 x level |
| Tetris | 800 x level |

Soft drops award 1 point per cell. Hard drops award 2 points per cell.

## Project Structure

```text
.
├── index.html
├── style.css
├── script.js
└── README.md
```

## Run Locally

Open `index.html` directly in your browser, or serve the folder with any static file server:

```bash
python3 -m http.server 8080
```

Then visit:

```text
http://localhost:8080
```

## Deploy to GitHub Pages

1. Push these files to a GitHub repository.
2. Open the repository settings.
3. Go to **Pages**.
4. Select the branch and folder that contain `index.html`.
5. Save the settings and open the published Pages URL.

No install, build, framework, database, or server-side runtime is required.
