import { isLandColor, type LandMask } from "@/engine/land";

const GRID = 128;

export function landMaskFromImage(image: CanvasImageSource): LandMask {
  const canvas = document.createElement("canvas");
  canvas.width = GRID;
  canvas.height = GRID;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { grid: GRID, cells: new Uint8Array(GRID * GRID) };
  ctx.drawImage(image, 0, 0, GRID, GRID);
  const pixels = ctx.getImageData(0, 0, GRID, GRID).data;
  const cells = new Uint8Array(GRID * GRID);
  for (let index = 0; index < cells.length; index += 1) {
    const offset = index * 4;
    const red = pixels[offset] ?? 0;
    const green = pixels[offset + 1] ?? 0;
    const blue = pixels[offset + 2] ?? 0;
    cells[index] = isLandColor(red, green, blue) ? 1 : 0;
  }
  return { grid: GRID, cells };
}
