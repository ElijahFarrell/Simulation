import type { HeatCell } from "@/engine/analysis";
import { MAP_SIZE, SECTOR_COUNT } from "@/engine/constants";
import { pointFromNorth } from "@/engine/geometry";
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

export function worldToScreen(point: Vec, size: number): Vec {
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
  drawTeams(ctx, size, scene.teams);
  if (scene.destination) drawPin(ctx, size, scene.player, scene.destination);
  if (scene.clock) drawClock(ctx, size, scene.clock, scene.zone.waitSec);
}

export type MapScene = {
  zone: ZonePhase;
  teams: Team[];
  player: Team;
  destination: Vec | null;
  sectors: SectorInfo[];
  pull: Circle | null;
  heatmap: HeatCell[] | null;
  showDensity: boolean;
  showPull: boolean;
  island: CanvasImageSource | null;
  storm: Circle | null;
  clock: { timeSec: number } | null;
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
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([5, 6]);
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
  ctx.save();
  ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
  const width = ctx.measureText(label).width + 16;
  ctx.fillStyle = "rgba(16, 20, 28, 0.82)";
  ctx.fillRect(12, size - 36, width, 24);
  ctx.fillStyle = closing ? "#fecaca" : "#e2e8f0";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 20, size - 24);
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
  const cellSize = ((circle.radius * 2) / 16 / MAP_SIZE) * size;
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
  ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
  ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const distance = circle.radius >= 70 ? circle.radius * 0.8 : circle.radius + 26;
  labels.forEach((label, index) => {
    const point = worldToScreen(pointFromNorth(circle.center, (index * Math.PI) / 2, distance), size);
    ctx.fillText(label, point.x, point.y);
  });
  ctx.restore();
}

function drawTeams(ctx: CanvasRenderingContext2D, size: number, teams: readonly Team[]): void {
  for (const team of teams) {
    if (team.isPlayer) continue;
    const screen = worldToScreen(team.pos, size);
    ctx.save();
    ctx.globalAlpha = team.eliminated ? 0.2 : 0.9;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, team.eliminated ? 3 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#94a3b8";
    ctx.fill();
    ctx.restore();
  }
  const player = teams.find((team) => team.isPlayer);
  if (!player) return;
  const screen = worldToScreen(player.pos, size);
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = player.eliminated ? "#fb7185" : "#f5c542";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#1c1403";
  ctx.stroke();
}

function drawPin(ctx: CanvasRenderingContext2D, size: number, player: Team, destination: Vec): void {
  const from = worldToScreen(player.pos, size);
  const to = worldToScreen(destination, size);
  ctx.save();
  ctx.strokeStyle = "rgba(245, 197, 66, 0.85)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
