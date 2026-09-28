import { Text3DData } from "../types/text";
import { builtinFontsMap } from "./fonts";
import { materialLoader } from "./materialLoader";

export interface TitleLineSpec {
  text: string;
  fontId?: string;
  presetId?: string;
  size?: number;
  depth?: number;
  outlineWidth?: number;
  letterSpacing?: number;
  x?: number;
  y?: number;
  z?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
}

export interface TitleRenderSpec {
  version: 1;
  width?: number;
  height?: number;
  padding?: number;
  lines: TitleLineSpec[];
}

export interface TitleRenderCapabilities {
  version: 1;
  fonts: string[];
  materialPresets: Array<{ id: string; kind: "texture" | "gradient" | "color"; colors: string[] }>;
  defaults: { width: number; height: number; padding: number; fontId: string; presetId: string };
}

export interface TitleRenderResult {
  width: number;
  height: number;
  fileName: string;
  downloadUrl: string;
}

export interface Cube3DTextAPI {
  getCapabilities: () => Promise<TitleRenderCapabilities>;
  renderTitle: (spec: TitleRenderSpec) => Promise<TitleRenderResult>;
}

declare global {
  interface Window {
    cube3DText?: Cube3DTextAPI;
  }
}

export const TITLE_DEFAULTS = {
  width: 1200,
  height: 600,
  padding: 0.08,
  fontId: "Fusion Pixel 10px",
  presetId: "gradient_blue",
} as const;

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function numberAt(value: unknown, path: string, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${path} must be a number between ${min} and ${max}`);
  }
  return value;
}

export async function getTitleCapabilities(): Promise<TitleRenderCapabilities> {
  const presets = await materialLoader.loadAllMaterials();
  return {
    version: 1,
    fonts: Object.keys(builtinFontsMap),
    materialPresets: [...presets].map(([id, material]) => {
      const colors = [material.front, material.up, material.outline].flatMap((face) => {
        if (face.mode === "color") return [face.color];
        if (face.mode === "gradient") return [face.colorGradualStart, face.colorGradualEnd];
        return [];
      });
      return {
        id,
        kind: material.front.mode === "image" ? "texture" : material.front.mode,
        colors: [...new Set(colors)].slice(0, 4),
      };
    }),
    defaults: TITLE_DEFAULTS,
  };
}

export async function prepareTitle(spec: unknown): Promise<{
  width: number;
  height: number;
  padding: number;
  texts: Text3DData[];
}> {
  const input = objectAt(spec, "spec");
  if (input.version !== 1) throw new Error("spec.version must be 1");
  const width = numberAt(input.width, "spec.width", TITLE_DEFAULTS.width, 256, 4096);
  const height = numberAt(input.height, "spec.height", TITLE_DEFAULTS.height, 256, 4096);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width * height > 8_000_000) {
    throw new Error("spec dimensions must be whole pixels and at most 8 megapixels");
  }
  const padding = numberAt(input.padding, "spec.padding", TITLE_DEFAULTS.padding, 0, 0.4);
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > 6) {
    throw new Error("spec.lines must contain 1 to 6 lines");
  }

  const presets = await materialLoader.loadIndex();
  const lines = input.lines.map((raw, index) => {
    const line = objectAt(raw, `spec.lines[${index}]`);
    if (typeof line.text !== "string" || !line.text.trim() || line.text.length > 80) {
      throw new Error(`spec.lines[${index}].text must contain 1 to 80 characters`);
    }
    const fontId = line.fontId === undefined ? TITLE_DEFAULTS.fontId : line.fontId;
    const presetId = line.presetId === undefined ? TITLE_DEFAULTS.presetId : line.presetId;
    if (typeof fontId !== "string" || !(fontId in builtinFontsMap)) {
      throw new Error(`spec.lines[${index}].fontId is not an available built-in font`);
    }
    if (typeof presetId !== "string" || !presets.includes(presetId)) {
      throw new Error(`spec.lines[${index}].presetId is not an available material preset`);
    }
    const size = numberAt(line.size, `spec.lines[${index}].size`, 10, 1, 50);
    return {
      text: line.text,
      fontId,
      presetId,
      size,
      depth: numberAt(line.depth, `spec.lines[${index}].depth`, 3, 0.1, 20),
      outlineWidth: numberAt(line.outlineWidth, `spec.lines[${index}].outlineWidth`, 0.4, 0, 3),
      letterSpacing: numberAt(line.letterSpacing, `spec.lines[${index}].letterSpacing`, 1, 0, 5),
      x: numberAt(line.x, `spec.lines[${index}].x`, 0, -100, 100),
      y: line.y === undefined ? undefined : numberAt(line.y, `spec.lines[${index}].y`, 0, -100, 100),
      z: numberAt(line.z, `spec.lines[${index}].z`, 0, -100, 100),
      rotX: numberAt(line.rotX, `spec.lines[${index}].rotX`, 0, -180, 180),
      rotY: numberAt(line.rotY, `spec.lines[${index}].rotY`, 0, -180, 180),
      rotZ: numberAt(line.rotZ, `spec.lines[${index}].rotZ`, 0, -180, 180),
    };
  });

  const uniquePresets = [...new Set(lines.map((line) => line.presetId))];
  const materials = new Map(await Promise.all(uniquePresets.map(async (id) => [id, await materialLoader.loadMaterial(id)] as const)));
  const totalHeight = lines.reduce((sum, line) => sum + line.size * 1.25, 0);
  let cursor = totalHeight / 2;
  const texts: Text3DData[] = lines.map((line) => {
    const y = line.y ?? cursor - line.size * 0.625;
    cursor -= line.size * 1.25;
    return {
      content: line.text,
      fontId: line.fontId,
      opts: {
        size: line.size,
        depth: line.depth,
        outlineWidth: line.outlineWidth,
        letterSpacing: line.letterSpacing,
        spacingWidth: 0.2,
        x: line.x,
        y,
        z: line.z,
        rotX: line.rotX,
        rotY: line.rotY,
        rotZ: line.rotZ,
        materials: materials.get(line.presetId)!,
      },
      position: [0, 0, 0],
      rotation: [0, 0, 0],
    };
  });
  return { width, height, padding, texts };
}
