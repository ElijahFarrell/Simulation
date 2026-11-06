"use client";

import { useEffect, useRef } from "react";
import { teamTiming } from "@/engine/ai-behavior";
import type { HeatCell } from "@/engine/analysis";
import { MAP_SIZE } from "@/engine/constants";
import { clampToMap } from "@/engine/geometry";
import { circleAt, departDelay, positionAt } from "@/engine/movement";
import type { Circle, SectorInfo, Team, Timing, Vec, ZonePhase } from "@/engine/types";
import { drawMap } from "@/components/lab/canvas-draw";

type MapCanvasProps = {
  zone: ZonePhase;
  teams: Team[];
  destination: Vec | null;
  sectors: SectorInfo[];
  pull: Circle | null;
  heatmap: HeatCell[] | null;
  showDensity: boolean;
  showPull: boolean;
  animateFrom: Team[] | null;
  playerTiming: Timing;
  route: Vec[] | null;
  hidePlayer: boolean;
  island: HTMLImageElement | null;
  disabled: boolean;
  onPick: (point: Vec) => void;
  onAnimationDone: () => void;
};

export function MapCanvas({ disabled, onPick, onAnimationDone, ...scene }: MapCanvasProps) {
  const { animateFrom, destination, route, zone } = scene;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onAnimationDone);
  const kickRef = useRef<() => void>(() => {});
  const sceneRef = useRef(scene);

  useEffect(() => {
    doneRef.current = onAnimationDone;
  }, [onAnimationDone]);

  useEffect(() => {
    sceneRef.current = scene;
    kickRef.current();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let frame = 0;
    let finished = false;

    const paint = (now: number) => {
      const size = canvas.clientWidth;
      const scene = sceneRef.current;
      if (size <= 0) return;
      const totalSec = scene.zone.waitSec + scene.zone.shrinkSec;
      const duration = Math.min(12_000, Math.max(4_500, totalSec * 70));
      const raw = !scene.animateFrom || reduce ? 1 : Math.min(1, (now - started) / duration);
      const timeSec = raw * totalSec;
      const playing = Boolean(scene.animateFrom) && raw < 1;
      const shown = playing && scene.animateFrom
        ? teamsAt(scene.teams, scene.animateFrom, scene.zone, scene.playerTiming, timeSec)
        : scene.teams;
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
        zone: scene.zone,
        teams: shown,
        destination: scene.destination,
        sectors: scene.sectors,
        pull: scene.pull,
        heatmap: scene.heatmap,
        showDensity: scene.showDensity,
        showPull: scene.showPull,
        island: scene.island,
        storm: playing ? circleAt(scene.zone, timeSec) : null,
        clock: playing ? { timeSec } : null,
        route: scene.route,
        hidePlayer: scene.hidePlayer,
      });
      if (playing) {
        frame = requestAnimationFrame(paint);
        return;
      }
      if (scene.animateFrom && !finished) {
        finished = true;
        doneRef.current();
      }
    };

    kickRef.current = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    };
    const observer = new ResizeObserver(() => kickRef.current());
    observer.observe(canvas);
    frame = requestAnimationFrame(paint);
    return () => {
      finished = true;
      kickRef.current = () => {};
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [animateFrom]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none"
      aria-label={
        route
          ? `Zone ${zone.index} map. Tap to add a drop or loot stop.`
          : destination
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

function teamsAt(
  teams: Team[],
  starts: Team[],
  zone: ZonePhase,
  playerTiming: Timing,
  timeSec: number,
): Team[] {
  return teams.map((team, index) => {
    const start = starts[index];
    if (!start || team.eliminated) return team;
    return {
      ...team,
      pos: positionAt(start.pos, team.pos, departDelay(teamTiming(team, playerTiming), zone), timeSec),
    };
  });
}
