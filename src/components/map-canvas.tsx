"use client";

import { useEffect, useRef } from "react";
import type { HeatCell } from "@/engine/analysis";
import { MAP_SIZE } from "@/engine/constants";
import { clampToMap, lerpVec } from "@/engine/geometry";
import type { Circle, SectorInfo, Team, Vec, ZonePhase } from "@/engine/types";
import { drawMap } from "@/lib/canvas-draw";

type MapCanvasProps = {
  zone: ZonePhase;
  teams: Team[];
  destination: Vec | null;
  sectors: SectorInfo[];
  pull: Circle | null;
  heatmap: HeatCell[] | null;
  showDensity: boolean;
  showPull: boolean;
  disabled: boolean;
  animateFrom: Team[] | null;
  onPick: (point: Vec) => void;
  onAnimationDone: () => void;
};

export function MapCanvas({
  zone,
  teams,
  destination,
  sectors,
  pull,
  heatmap,
  showDensity,
  showPull,
  disabled,
  animateFrom,
  onPick,
  onAnimationDone,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onAnimationDone);

  useEffect(() => {
    doneRef.current = onAnimationDone;
  }, [onAnimationDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let frame = 0;
    let finished = false;

    const paint = (now: number) => {
      const size = canvas.clientWidth;
      const player = teams.find((team) => team.isPlayer);
      if (size <= 0 || !player) return;
      const raw = !animateFrom || reduce ? 1 : Math.min(1, (now - started) / 900);
      const eased = 1 - (1 - raw) ** 3;
      const shown = movingTeams(teams, animateFrom, raw >= 1 ? 1 : eased);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const pixels = Math.floor(size * dpr);
      if (canvas.width !== pixels || canvas.height !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMap(ctx, size, {
        zone,
        teams: shown,
        player: shown.find((team) => team.isPlayer) ?? player,
        destination,
        sectors,
        pull,
        heatmap,
        showDensity,
        showPull,
      });
      if (animateFrom && raw < 1) {
        frame = requestAnimationFrame(paint);
        return;
      }
      if (animateFrom && !finished) {
        finished = true;
        doneRef.current();
      }
    };

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    });
    observer.observe(canvas);
    frame = requestAnimationFrame(paint);
    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [animateFrom, destination, heatmap, pull, sectors, showDensity, showPull, teams, zone]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      aria-label={
        destination
          ? `Zone ${zone.index} map. Rotate pin is set.`
          : `Zone ${zone.index} map. Click to choose where you rotate.`
      }
      onPointerDown={(event) => {
        if (disabled) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        onPick(
          clampToMap({
            x: ((event.clientX - rect.left) / rect.width) * MAP_SIZE,
            y: (1 - (event.clientY - rect.top) / rect.height) * MAP_SIZE,
          }),
        );
      }}
    />
  );
}

function movingTeams(teams: Team[], animateFrom: Team[] | null, progress: number): Team[] {
  if (!animateFrom || progress >= 1) return teams;
  return teams.map((team, index) => {
    const start = animateFrom[index];
    if (!start) return team;
    return { ...team, pos: lerpVec(start.pos, team.pos, progress) };
  });
}
