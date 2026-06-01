(() => {
  "use strict";

  const COLS = 10;
  const ROWS = 20;
  const CELL = 30;
  const NEXT_CELL = 24;
  const EMPTY = 0;
  const STORAGE_KEY = "neon-tetris-high-score";

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const nextCanvas = document.getElementById("next");
  const nextCtx = nextCanvas.getContext("2d");

  const ui = {
    score: document.getElementById("score"),
    level: document.getElementById("level"),
    lines: document.getElementById("lines"),
    highScore: document.getElementById("high-score"),
    overlay: document.getElementById("overlay"),
    overlayKicker: document.getElementById("overlay-kicker"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayCopy: document.getElementById("overlay-copy"),
    overlayButton: document.getElementById("overlay-button"),
    startButton: document.getElementById("start-button"),
    pauseButton: document.getElementById("pause-button"),
    touchButtons: document.querySelectorAll(".touch-btn"),
  };

  const COLORS = {
    I: "#25e7ff",
    O: "#ffe35a",
    T: "#bf6bff",
    S: "#55ff82",
    Z: "#ff4d6d",
    J: "#4f86ff",
    L: "#ff9f43",
  };

  const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [
      [1, 1],
      [1, 1],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  };

  const SCORE_TABLE = [0, 100, 300, 500, 800];
  const TYPES = Object.keys(SHAPES);

  let board;
  let active;
  let next;
  let score;
  let lines;
  let level;
  let highScore = Number(localStorage.getItem(STORAGE_KEY) || 0);
  let state = "start";
  let lastTime = 0;
  let dropCounter = 0;
  let animationFrame = 0;

  function createBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));
  }

  function cloneMatrix(matrix) {
    return matrix.map((row) => [...row]);
  }

  function randomPiece() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    return {
      type,
      matrix: cloneMatrix(SHAPES[type]),
      color: COLORS[type],
      x: Math.floor((COLS - SHAPES[type][0].length) / 2),
      y: -1,
    };
  }

  function resetGame() {
    if (Number.isFinite(score)) updateBest();
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    active = randomPiece();
    next = randomPiece();
    state = "playing";
    dropCounter = 0;
    lastTime = performance.now();
    ui.pauseButton.disabled = false;
    ui.startButton.textContent = "Restart";
    hideOverlay();
    updateUi();
    draw();
  }

  function dropInterval() {
    return Math.max(90, 900 - (level - 1) * 75);
  }

  function rotate(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        rotated[x][rows - 1 - y] = matrix[y][x];
      }
    }

    return rotated;
  }

  function collides(piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;

        const boardX = piece.x + x + offsetX;
        const boardY = piece.y + y + offsetY;

        if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return true;
        if (boardY >= 0 && board[boardY][boardX] !== EMPTY) return true;
      }
    }

    return false;
  }

  function mergePiece() {
    active.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        const boardY = active.y + y;
        const boardX = active.x + x;
        if (boardY >= 0) board[boardY][boardX] = active.type;
      });
    });
  }

  function clearLines() {
    let cleared = 0;

    for (let y = ROWS - 1; y >= 0; y -= 1) {
      if (board[y].every(Boolean)) {
        board.splice(y, 1);
        board.unshift(Array(COLS).fill(EMPTY));
        cleared += 1;
        y += 1;
      }
    }

    if (cleared > 0) {
      score += SCORE_TABLE[cleared] * level;
      lines += cleared;
      level = Math.floor(lines / 10) + 1;
      updateBest();
      updateUi();
    }
  }

  function spawnPiece() {
    active = next;
    active.x = Math.floor((COLS - active.matrix[0].length) / 2);
    active.y = -1;
    next = randomPiece();

    if (collides(active)) {
      gameOver();
    }
  }

  function move(dx) {
    if (state !== "playing") return;
    if (!collides(active, dx, 0)) {
      active.x += dx;
      draw();
    }
  }

  function stepDown(awardPoints = false) {
    if (state !== "playing") return;

    if (!collides(active, 0, 1)) {
      active.y += 1;
      if (awardPoints) {
        score += 1;
        updateUi();
      }
    } else {
      lockPiece();
    }

    dropCounter = 0;
    draw();
  }

  function softDrop() {
    stepDown(true);
  }

  function hardDrop() {
    if (state !== "playing") return;

    let distance = 0;
    while (!collides(active, 0, 1)) {
      active.y += 1;
      distance += 1;
    }

    score += distance * 2;
    lockPiece();
    updateUi();
    draw();
  }

  function rotatePiece() {
    if (state !== "playing" || active.type === "O") return;

    const rotated = rotate(active.matrix);
    const kicks = [0, -1, 1, -2, 2];

    for (const kick of kicks) {
      if (!collides(active, kick, 0, rotated)) {
        active.matrix = rotated;
        active.x += kick;
        draw();
        return;
      }
    }
  }

  function lockPiece() {
    mergePiece();
    clearLines();
    spawnPiece();
  }

  function getGhostPiece() {
    const ghost = {
      ...active,
      matrix: active.matrix,
    };

    while (!collides(ghost, 0, 1)) {
      ghost.y += 1;
    }

    return ghost;
  }

  function drawCell(context, x, y, size, color, alpha = 1) {
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 12;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);

    const gradient = context.createLinearGradient(x * size, y * size, (x + 1) * size, (y + 1) * size);
    gradient.addColorStop(0, "rgba(255,255,255,0.35)");
    gradient.addColorStop(0.45, "rgba(255,255,255,0.04)");
    gradient.addColorStop(1, "rgba(0,0,0,0.35)");
    context.fillStyle = gradient;
    context.shadowBlur = 0;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
    context.restore();
  }

  function drawGrid() {
    ctx.fillStyle = "#050811";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(139, 230, 255, 0.13)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= COLS; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * CELL + 0.5, 0);
      ctx.lineTo(x * CELL + 0.5, ROWS * CELL);
      ctx.stroke();
    }

    for (let y = 0; y <= ROWS; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL + 0.5);
      ctx.lineTo(COLS * CELL, y * CELL + 0.5);
      ctx.stroke();
    }
  }

  function drawMatrix(context, matrix, offsetX, offsetY, size, color, alpha = 1, outline = false) {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (!value) return;
        const drawX = offsetX + x;
        const drawY = offsetY + y;
        if (drawY < 0) return;

        if (outline) {
          context.save();
          context.globalAlpha = alpha;
          context.strokeStyle = color;
          context.lineWidth = 2;
          context.shadowColor = color;
          context.shadowBlur = 9;
          context.strokeRect(drawX * size + 4, drawY * size + 4, size - 8, size - 8);
          context.restore();
        } else {
          drawCell(context, drawX, drawY, size, color, alpha);
        }
      });
    });
  }

  function drawBoard() {
    board.forEach((row, y) => {
      row.forEach((type, x) => {
        if (type !== EMPTY) drawCell(ctx, x, y, CELL, COLORS[type]);
      });
    });
  }

  function drawNext() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillStyle = "rgba(5, 8, 17, 0.88)";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!next) return;

    const width = next.matrix[0].length;
    const height = next.matrix.length;
    const offsetX = Math.floor((nextCanvas.width / NEXT_CELL - width) / 2);
    const offsetY = Math.floor((nextCanvas.height / NEXT_CELL - height) / 2);
    drawMatrix(nextCtx, next.matrix, offsetX, offsetY, NEXT_CELL, next.color);
  }

  function draw() {
    drawGrid();
    drawBoard();

    if (active && state !== "start") {
      const ghost = getGhostPiece();
      drawMatrix(ctx, ghost.matrix, ghost.x, ghost.y, CELL, active.color, 0.55, true);
      drawMatrix(ctx, active.matrix, active.x, active.y, CELL, active.color);
    }

    drawNext();
  }

  function updateUi() {
    ui.score.textContent = score.toLocaleString();
    ui.level.textContent = level.toLocaleString();
    ui.lines.textContent = lines.toLocaleString();
    ui.highScore.textContent = highScore.toLocaleString();
  }

  function updateBest() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(STORAGE_KEY, String(highScore));
    }
  }

  function showOverlay(kicker, title, copy, actionText) {
    ui.overlayKicker.textContent = kicker;
    ui.overlayTitle.textContent = title;
    ui.overlayCopy.textContent = copy;
    ui.overlayButton.textContent = actionText;
    ui.overlay.classList.add("visible");
  }

  function hideOverlay() {
    ui.overlay.classList.remove("visible");
  }

  function setPaused(paused) {
    if (paused && state === "playing") {
      state = "paused";
      ui.pauseButton.textContent = "Resume";
      showOverlay("Paused", "Paused", "Take a breath, then return to the stack.", "Resume");
    } else if (!paused && state === "paused") {
      state = "playing";
      ui.pauseButton.textContent = "Pause";
      hideOverlay();
      lastTime = performance.now();
    }
  }

  function gameOver() {
    state = "gameover";
    updateBest();
    updateUi();
    ui.pauseButton.disabled = true;
    ui.pauseButton.textContent = "Pause";
    showOverlay("Game Over", "Final Score", score.toLocaleString(), "Play Again");
  }

  function gameLoop(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    if (state === "playing") {
      dropCounter += deltaTime;
      if (dropCounter > dropInterval()) {
        stepDown(false);
      }
    }

    animationFrame = requestAnimationFrame(gameLoop);
  }

  function handleAction(action) {
    if (state === "start" || state === "gameover") {
      resetGame();
      return;
    }

    if (state === "paused") {
      if (action === "pause" || action === "start") setPaused(false);
      return;
    }

    switch (action) {
      case "left":
        move(-1);
        break;
      case "right":
        move(1);
        break;
      case "rotate":
        rotatePiece();
        break;
      case "soft":
        softDrop();
        break;
      case "hard":
        hardDrop();
        break;
      case "pause":
        setPaused(true);
        break;
      default:
        break;
    }
  }

  function bindKeyboard() {
    document.addEventListener("keydown", (event) => {
      const actions = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "rotate",
        ArrowDown: "soft",
        " ": "hard",
        Escape: "pause",
        KeyP: "pause",
      };

      const action = actions[event.key] || actions[event.code];
      if (!action) return;

      event.preventDefault();
      handleAction(action);
    });
  }

  function bindTouchControls() {
    const repeaters = new Map();

    ui.touchButtons.forEach((button) => {
      const action = button.dataset.action;
      const isRepeating = action === "left" || action === "right" || action === "soft";

      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        handleAction(action);

        if (isRepeating) {
          const delay = action === "soft" ? 70 : 115;
          repeaters.set(button, window.setInterval(() => handleAction(action), delay));
        }
      });

      const stop = () => {
        window.clearInterval(repeaters.get(button));
        repeaters.delete(button);
      };

      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("pointerleave", stop);
    });
  }

  function bindButtons() {
    ui.startButton.addEventListener("click", resetGame);
    ui.overlayButton.addEventListener("click", () => {
      if (state === "paused") {
        setPaused(false);
      } else {
        resetGame();
      }
    });
    ui.pauseButton.addEventListener("click", () => {
      if (state === "playing") setPaused(true);
      else if (state === "paused") setPaused(false);
    });
  }

  function init() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    next = randomPiece();
    updateUi();
    showOverlay("Ready", "Neon Tetris", "Stack blocks, clear lines, chase the glow.", "Start");
    drawGrid();
    drawNext();
    bindKeyboard();
    bindTouchControls();
    bindButtons();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(gameLoop);
  }

  init();
})();
