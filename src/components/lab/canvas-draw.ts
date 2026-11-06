import type { HeatCell } from "@/engine/analysis";
import { HEAT_STEPS, MAP_SIZE, SECTOR_COUNT } from "@/engine/constants";
import { pointFromNorth } from "@/engine/geometry";
import { playerOf } from "@/engine/teams";
import type { Circle, SectorInfo, Team, Vec, ZonePhase } from "@/engine/types";

const SECTOR_FILL = {
  dead: "rgba(52, 211, 153, 0.22)",
  stacked: "rgba(248, 113, 113, 0.3)",
  normal: "rgba(255, 255, 255, 0.035)",
} as const;

const SECTOR_FILL_ISLAND = {
  dead: "rgba(52, 211, 153, 0.16)",
  stacked: "rgba(248, 113, 113, 0.2)",
  normal: "rgba(255, 255, 255, 0.02)",
} as const;

function worldToScreen(point: Vec, size: number): Vec {
  return {
    x: (point.x / MAP_SIZE) * size,
    y: ((MAP_SIZE - point.y) / MAP_SIZE) * size,
  };
}

export function drawMap(ctx: CanvasRenderingContext2D, size: number, scene: MapScene): void {
  ctx.clearRect(0, 0, size, size);
  if (scene.island) {
    ctx.drawImage(scene.island, 0, 0, size, size);
  } else {
    ctx.fillStyle = "#10141c";
    ctx.fillRect(0, 0, size, size);
    drawGrid(ctx, size);
  }
  if (scene.heatmap) drawHeat(ctx, size, scene.zone.to, scene.heatmap);
  if (scene.showDensity) drawSectors(ctx, size, scene.zone.to, scene.sectors, Boolean(scene.island));
  drawRing(ctx, size, scene.storm ?? scene.zone.from, "rgba(255,255,255,0.85)", 2, false);
  drawRing(ctx, size, scene.zone.to, "#8eb7ff", 2, true);
  if (scene.showPull && scene.pull) drawRing(ctx, size, scene.pull, "#9bd7ff", 1.5, false, true);
  drawCompass(ctx, size, scene.zone.to);
  drawTeams(ctx, size, scene.teams, scene.hidePlayer);
  if (scene.route && scene.route.length > 0) drawRoute(ctx, size, scene.route);
  if (scene.destination && !scene.hidePlayer) drawPin(ctx, size, playerOf(scene.teams), scene.destination);
  if (scene.clock) drawClock(ctx, size, scene.clock, scene.zone.waitSec);
}

type MapScene = {
  zone: ZonePhase;
  teams: Team[];
  destination: Vec | null;
  sectors: SectorInfo[];
  pull: Circle | null;
  heatmap: HeatCell[] | null;
  showDensity: boolean;
  showPull: boolean;
  island: CanvasImageSource | null;
  storm: Circle | null;
  clock: { timeSec: number } | null;
  route: Vec[] | null;
  hidePlayer: boolean;
};

function drawGrid(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  const step = size / 10;
  for (let i = 1; i < 10; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRing(
  ctx: CanvasRenderingContext2D,
  size: number,
  circle: Circle,
  stroke: string,
  width: number,
  fill: boolean,
  dashed = false,
): void {
  const center = worldToScreen(circle.center, size);
  const radius = (circle.radius / MAP_SIZE) * size;
  ctx.save();
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = "rgba(90, 140, 255, 0.08)";
    ctx.fill();
  }
  const scale = size / 640;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width * scale;
  if (dashed) ctx.setLineDash([5 * scale, 6 * scale]);
  ctx.stroke();
  ctx.restore();
}

function drawClock(
  ctx: CanvasRenderingContext2D,
  size: number,
  clock: { timeSec: number },
  waitSec: number,
): void {
  const closing = clock.timeSec >= waitSec;
  const label = closing ? "Storm is closing" : "Waiting to leave";
  const scale = size / 640;
  ctx.save();
  ctx.font = `${Math.round(13 * scale)}px ui-sans-serif, system-ui, sans-serif`;
  const pad = 16 * scale;
  const width = ctx.measureText(label).width + pad;
  const bar = 24 * scale;
  ctx.fillStyle = "rgba(16, 20, 28, 0.82)";
  ctx.fillRect(12 * scale, size - bar - 12 * scale, width, bar);
  ctx.fillStyle = closing ? "#fecaca" : "#e2e8f0";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 20 * scale, size - bar / 2 - 12 * scale);
  ctx.restore();
}

function drawSectors(
  ctx: CanvasRenderingContext2D,
  size: number,
  circle: Circle,
  sectors: readonly SectorInfo[],
  onIsland: boolean,
): void {
  const center = worldToScreen(circle.center, size);
  const scale = size / MAP_SIZE;
  const inner = circle.radius * 0.48 * scale;
  const outer = circle.radius * 1.02 * scale;
  const slice = (Math.PI * 2) / SECTOR_COUNT;
  for (const sector of sectors) {
    const start = -Math.PI / 2 + sector.index * slice;
    ctx.beginPath();
    ctx.arc(center.x, center.y, outer, start, start + slice);
    ctx.arc(center.x, center.y, inner, start + slice, start, true);
    ctx.closePath();
    ctx.fillStyle = onIsland ? SECTOR_FILL_ISLAND[sector.label] : SECTOR_FILL[sector.label];
    ctx.fill();
  }
}

function drawHeat(
  ctx: CanvasRenderingContext2D,
  size: number,
  circle: Circle,
  cells: readonly HeatCell[],
): void {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const cell of cells) {
    min = Math.min(min, cell.distance);
    max = Math.max(max, cell.distance);
  }
  const span = Math.max(1, max - min);
  const cellSize = ((circle.radius * 2) / HEAT_STEPS / MAP_SIZE) * size;
  for (const cell of cells) {
    const t = (cell.distance - min) / span;
    const screen = worldToScreen(cell, size);
    const red = Math.round(50 + 190 * t);
    const green = Math.round(170 - 110 * t);
    ctx.fillStyle = `rgba(${red}, ${green}, 90, 0.33)`;
    ctx.fillRect(screen.x - cellSize / 2, screen.y - cellSize / 2, cellSize, cellSize);
  }
}

function drawCompass(ctx: CanvasRenderingContext2D, size: number, circle: Circle): void {
  const labels = ["N", "E", "S", "W"] as const;
  ctx.save();
  ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
  ctx.font = `${Math.round(Math.max(12, size * 0.02))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const distance = circle.radius >= 70 ? circle.radius * 0.8 : circle.radius + 26;
  labels.forEach((label, index) => {
    const point = worldToScreen(pointFromNorth(circle.center, (index * Math.PI) / 2, distance), size);
    ctx.fillText(label, point.x, point.y);
  });
  ctx.restore();
}

function drawRoute(ctx: CanvasRenderingContext2D, size: number, points: readonly Vec[]): void {
  const scale = size / 640;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 225, 74, 0.95)";
  ctx.lineWidth = 2.5 * scale;
  ctx.setLineDash([6 * scale, 5 * scale]);
  ctx.beginPath();
  points.forEach((point, index) => {
    const screen = worldToScreen(point, size);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.stroke();
  ctx.restore();
  points.forEach((point, index) => {
    const screen = worldToScreen(point, size);
    const radius = index === 0 ? Math.max(8, size * 0.02) : Math.max(5, size * 0.012);
    drawDot(ctx, screen.x, screen.y, radius, {
      fill: index === 0 ? "#ffe14a" : "#fff4b0",
      halo: "rgba(250, 204, 21, 0.7)",
      alpha: 1,
    });
  });
}

function drawTeams(
  ctx: CanvasRenderingContext2D,
  size: number,
  teams: readonly Team[],
  hidePlayer: boolean,
): void {
  const otherRadius = Math.max(5, size * 0.012);
  const youRadius = Math.max(8, size * 0.02);
  for (const team of teams) {
    if (team.isPlayer) continue;
    const screen = worldToScreen(team.pos, size);
    drawDot(ctx, screen.x, screen.y, team.eliminated ? otherRadius * 0.6 : otherRadius, {
      fill: "#f8fbff",
      halo: team.eliminated ? "rgba(148, 163, 184, 0.25)" : "rgba(56, 189, 248, 0.9)",
      alpha: team.eliminated ? 0.35 : 1,
    });
  }
  if (hidePlayer) return;
  const player = playerOf(teams);
  const screen = worldToScreen(player.pos, size);
  drawDot(ctx, screen.x, screen.y, youRadius, {
    fill: player.eliminated ? "#fb7185" : "#ffe14a",
    halo: player.eliminated ? "rgba(251, 113, 133, 0.45)" : "rgba(250, 204, 21, 0.7)",
    alpha: 1,
  });
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  paint: { fill: string; halo: string; alpha: number },
): void {
  ctx.save();
  ctx.globalAlpha = paint.alpha;
  ctx.beginPath();
  ctx.arc(x, y, radius + Math.max(2, radius * 0.55), 0, Math.PI * 2);
  ctx.fillStyle = paint.halo;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = paint.fill;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, radius * 0.28);
  ctx.strokeStyle = "#0b1020";
  ctx.stroke();
  ctx.restore();
}

function drawPin(ctx: CanvasRenderingContext2D, size: number, player: Team, destination: Vec): void {
  const from = worldToScreen(player.pos, size);
  const to = worldToScreen(destination, size);
  const scale = size / 640;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 225, 74, 0.95)";
  ctx.lineWidth = 2 * scale;
  ctx.setLineDash([5 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(to.x, to.y, 7 * scale, 0, Math.PI * 2);
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();
  ctx.restore();
}
