const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const hud = {
  round: document.getElementById("round"),
  timer: document.getElementById("timer"),
  team: document.getElementById("team"),
  objective: document.getElementById("objective"),
  health: document.getElementById("health"),
  ammo: document.getElementById("ammo"),
  scriptLine: document.getElementById("script-line"),
};

const scoreboard = document.getElementById("scoreboard");
const scoreboardBody = document.getElementById("scoreboard-body");

const gameState = {
  round: 1,
  timeRemaining: 105,
  isPaused: false,
  objective: "Secure the uplink",
  player: {
    x: 120,
    y: 270,
    radius: 14,
    speed: 2.4,
    health: 100,
    ammo: 12,
    reserve: 48,
  },
  reticle: { x: 0, y: 0 },
  scriptIndex: 0,
  teams: ["Alpha", "Echo"],
  scriptedLines: [
    "Echo squad reports hostile activity in the shipping bay.",
    "Alpha team, secure the uplink and hold the choke point.",
    "Fallback route opened: vent access near the control room.",
    "Echo lead: enemy sniper spotted on the catwalk.",
    "Uplink sync at 90%. Hold for extraction!",
  ],
  bots: [
    { name: "RecoilKid", team: "Alpha", kills: 3, deaths: 1, ping: 28 },
    { name: "Sierra-6", team: "Alpha", kills: 2, deaths: 2, ping: 32 },
    { name: "GlassFox", team: "Echo", kills: 4, deaths: 3, ping: 38 },
    { name: "NovaRail", team: "Echo", kills: 1, deaths: 4, ping: 52 },
  ],
  enemies: Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    x: 640 + Math.random() * 220,
    y: 140 + Math.random() * 260,
    radius: 12,
    health: 60,
    direction: Math.random() * Math.PI * 2,
  })),
  mapZones: [
    { x: 80, y: 90, w: 260, h: 120, label: "Control" },
    { x: 360, y: 70, w: 200, h: 150, label: "Bridge" },
    { x: 120, y: 320, w: 280, h: 160, label: "Bay" },
    { x: 460, y: 280, w: 180, h: 190, label: "Uplink" },
  ],
};

const keys = new Set();
let mouseDown = false;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const updateHud = () => {
  hud.round.textContent = `Round ${gameState.round}`;
  const minutes = Math.floor(gameState.timeRemaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(gameState.timeRemaining % 60)
    .toString()
    .padStart(2, "0");
  hud.timer.textContent = `${minutes}:${seconds}`;
  hud.team.textContent = gameState.teams[0];
  hud.objective.textContent = `Objective: ${gameState.objective}`;
  hud.health.textContent = `Health: ${gameState.player.health}`;
  hud.ammo.textContent = `Ammo: ${gameState.player.ammo} / ${gameState.player.reserve}`;
  hud.scriptLine.textContent =
    gameState.scriptedLines[gameState.scriptIndex] ?? "Stay alert.";
};

const updateScoreboard = () => {
  scoreboardBody.innerHTML = "";
  const rows = [
    { name: "You", team: "Alpha", kills: 5, deaths: 1, ping: 12 },
    ...gameState.bots,
  ];
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.team}</td>
      <td>${row.kills}</td>
      <td>${row.deaths}</td>
      <td>${row.ping} ms</td>
    `;
    scoreboardBody.appendChild(tr);
  });
};

const reload = () => {
  if (gameState.player.ammo >= 12 || gameState.player.reserve === 0) {
    return;
  }
  const needed = 12 - gameState.player.ammo;
  const toLoad = Math.min(needed, gameState.player.reserve);
  gameState.player.ammo += toLoad;
  gameState.player.reserve -= toLoad;
  updateHud();
};

const fire = () => {
  if (gameState.player.ammo === 0) {
    return;
  }
  gameState.player.ammo -= 1;
  gameState.enemies.forEach((enemy) => {
    const dx = enemy.x - gameState.reticle.x;
    const dy = enemy.y - gameState.reticle.y;
    const distance = Math.hypot(dx, dy);
    if (distance < enemy.radius + 12) {
      enemy.health -= 20;
    }
  });
  gameState.enemies = gameState.enemies.filter((enemy) => enemy.health > 0);
  updateHud();
};

const cycleScript = () => {
  gameState.scriptIndex = (gameState.scriptIndex + 1) % gameState.scriptedLines.length;
  updateHud();
};

const updateTimer = () => {
  if (gameState.timeRemaining > 0) {
    gameState.timeRemaining -= 1;
  } else {
    gameState.round += 1;
    gameState.timeRemaining = 105;
    gameState.objective =
      gameState.round % 2 === 0 ? "Secure the uplink" : "Defuse the relay";
    cycleScript();
  }
  updateHud();
};

const updatePlayer = () => {
  const { player } = gameState;
  if (keys.has("KeyW")) player.y -= player.speed;
  if (keys.has("KeyS")) player.y += player.speed;
  if (keys.has("KeyA")) player.x -= player.speed;
  if (keys.has("KeyD")) player.x += player.speed;
  player.x = clamp(player.x, 40, canvas.width - 40);
  player.y = clamp(player.y, 40, canvas.height - 40);
};

const updateEnemies = () => {
  gameState.enemies.forEach((enemy) => {
    enemy.x += Math.cos(enemy.direction) * 0.6;
    enemy.y += Math.sin(enemy.direction) * 0.6;
    if (enemy.x < 420 || enemy.x > canvas.width - 40) {
      enemy.direction = Math.PI - enemy.direction;
    }
    if (enemy.y < 40 || enemy.y > canvas.height - 40) {
      enemy.direction = -enemy.direction;
    }
  });
};

const drawMap = () => {
  ctx.fillStyle = "#0f121a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  gameState.mapZones.forEach((zone) => {
    ctx.fillStyle = "rgba(24, 32, 44, 0.8)";
    ctx.strokeStyle = "rgba(80, 98, 120, 0.6)";
    ctx.lineWidth = 2;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
    ctx.fillStyle = "rgba(200, 215, 236, 0.7)";
    ctx.font = "12px sans-serif";
    ctx.fillText(zone.label, zone.x + 12, zone.y + 20);
  });

  ctx.strokeStyle = "rgba(100, 130, 170, 0.3)";
  ctx.lineWidth = 1;
  for (let x = 40; x < canvas.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 40);
    ctx.lineTo(x, canvas.height - 40);
    ctx.stroke();
  }
  for (let y = 40; y < canvas.height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(canvas.width - 40, y);
    ctx.stroke();
  }
};

const drawPlayer = () => {
  const { player } = gameState;
  ctx.fillStyle = "#4cc3ff";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c2f4ff";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(76, 195, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(gameState.reticle.x, gameState.reticle.y);
  ctx.stroke();
};

const drawEnemies = () => {
  ctx.fillStyle = "#ff5c5c";
  gameState.enemies.forEach((enemy) => {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 120, 120, 0.6)";
    ctx.stroke();
  });
};

const drawObjective = () => {
  ctx.strokeStyle = "rgba(255, 208, 88, 0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(480, 300, 120, 120);
  ctx.fillStyle = "rgba(255, 208, 88, 0.2)";
  ctx.fillRect(480, 300, 120, 120);
  ctx.fillStyle = "#ffd058";
  ctx.font = "14px sans-serif";
  ctx.fillText("Uplink", 492, 324);
};

const drawReticle = () => {
  const { x, y } = gameState.reticle;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y + 10);
  ctx.stroke();
};

const render = () => {
  drawMap();
  drawObjective();
  drawEnemies();
  drawPlayer();
  drawReticle();
  requestAnimationFrame(render);
};

const update = () => {
  if (!gameState.isPaused) {
    updatePlayer();
    updateEnemies();
  }
  requestAnimationFrame(update);
};

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  gameState.reticle.x = event.clientX - rect.left;
  gameState.reticle.y = event.clientY - rect.top;
});

canvas.addEventListener("mousedown", () => {
  mouseDown = true;
  fire();
});

canvas.addEventListener("mouseup", () => {
  mouseDown = false;
});

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") {
    reload();
  }
  if (event.code === "Space") {
    cycleScript();
  }
  if (event.code === "Tab") {
    event.preventDefault();
    scoreboard.classList.add("active");
    scoreboard.setAttribute("aria-hidden", "false");
  }
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "Tab") {
    scoreboard.classList.remove("active");
    scoreboard.setAttribute("aria-hidden", "true");
  }
});

setInterval(updateTimer, 1000);
updateScoreboard();
updateHud();
render();
update();

setInterval(() => {
  if (mouseDown) {
    fire();
  }
}, 250);
