import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { theme as antdTheme } from "antd";
import {
    createAppThemeConfig,
    resolveThemePreference,
    THEME_STORAGE_KEY
} from "../src/utils/theme.ts";

interface RgbColor {
    red: number;
    green: number;
    blue: number;
    alpha: number;
}

function parseColor(color: string): RgbColor {
    const hexMatch = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
    if (hexMatch) {
        return {
            red: parseInt(hexMatch[1], 16),
            green: parseInt(hexMatch[2], 16),
            blue: parseInt(hexMatch[3], 16),
            alpha: 1
        };
    }

    const rgbaMatch = color.match(
        /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/
    );
    assert.ok(rgbaMatch, `Unsupported color format: ${color}`);
    return {
        red: Number(rgbaMatch[1]),
        green: Number(rgbaMatch[2]),
        blue: Number(rgbaMatch[3]),
        alpha: rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4])
    };
}

function composite(foreground: RgbColor, background: RgbColor): RgbColor {
    return {
        red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
        green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
        blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
        alpha: 1
    };
}

function luminance(color: RgbColor): number {
    const channel = (value: number) => {
        const normalized = value / 255;
        return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    };

    return (
        0.2126 * channel(color.red) +
        0.7152 * channel(color.green) +
        0.0722 * channel(color.blue)
    );
}

function contrastRatio(foreground: string, background: string): number {
    const backgroundColor = parseColor(background);
    const foregroundColor = composite(parseColor(foreground), backgroundColor);
    const lighter = Math.max(luminance(foregroundColor), luminance(backgroundColor));
    const darker = Math.min(luminance(foregroundColor), luminance(backgroundColor));
    return (lighter + 0.05) / (darker + 0.05);
}

test("theme preference uses an explicit saved choice before the system setting", () => {
    assert.equal(resolveThemePreference("light", true), "light");
    assert.equal(resolveThemePreference("dark", false), "dark");
});

test("theme preference follows the system when no valid choice is saved", () => {
    assert.equal(resolveThemePreference(null, true), "dark");
    assert.equal(resolveThemePreference(null, false), "light");
    assert.equal(resolveThemePreference("unexpected", true), "dark");
    assert.equal(THEME_STORAGE_KEY, "cube-3d-text-theme");
});

test("dark theme keeps normal and primary button text readable", () => {
    const token = antdTheme.getDesignToken(createAppThemeConfig("dark"));

    assert.ok(
        contrastRatio(token.colorText, token.colorBgContainer) >= 7,
        "Dark mode body text should meet enhanced contrast"
    );
    assert.ok(
        contrastRatio(token.colorTextLightSolid, token.colorPrimary) >= 4.5,
        "Dark mode primary button text should meet normal contrast"
    );
});

test("screenshot rendering stays transparent and independent from the UI theme", async () => {
    const [canvasSource, sceneSource] = await Promise.all([
        readFile(new URL("../src/components/ThreeCanvas.tsx", import.meta.url), "utf8"),
        readFile(new URL("../src/components/ThreeScene.tsx", import.meta.url), "utf8")
    ]);

    assert.match(canvasSource, /alpha:\s*true/);
    assert.match(canvasSource, /preserveDrawingBuffer:\s*true/);
    assert.match(canvasSource, /style=\{\{\s*background:\s*"transparent"\s*\}\}/);
    assert.match(canvasSource, /gl\.domElement\.toDataURL\("image\/png"\)/);
    assert.match(sceneSource, /scene\.background\s*=\s*null/);
    assert.doesNotMatch(canvasSource, /data-theme|ThemeMode|themeMode/);
});
