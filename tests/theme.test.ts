import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { theme as antdTheme } from "antd";
import { languageConfig } from "../src/language.tsx";
import {
    applyTheme,
    createAppThemeConfig,
    getInitialTheme,
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

function installBrowserMock(options: {
    storedTheme?: string;
    prefersDark?: boolean;
    workspace?: string;
} = {}) {
    const values = new Map<string, string>();
    if (options.storedTheme !== undefined) {
        values.set(THEME_STORAGE_KEY, options.storedTheme);
    }
    if (options.workspace !== undefined) {
        values.set("workspace", options.workspace);
    }

    const documentElement = {
        dataset: {} as Record<string, string>,
        style: { colorScheme: "" }
    };
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");

    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            localStorage: {
                getItem: (key: string) => values.get(key) ?? null,
                setItem: (key: string, value: string) => values.set(key, value),
                removeItem: (key: string) => values.delete(key)
            },
            matchMedia: () => ({ matches: options.prefersDark ?? false })
        }
    });
    Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: { documentElement }
    });

    return {
        documentElement,
        values,
        restore: () => {
            if (previousWindow) {
                Object.defineProperty(globalThis, "window", previousWindow);
            } else {
                delete (globalThis as { window?: unknown }).window;
            }
            if (previousDocument) {
                Object.defineProperty(globalThis, "document", previousDocument);
            } else {
                delete (globalThis as { document?: unknown }).document;
            }
        }
    };
}

function collectTranslationPaths(value: unknown, prefix = ""): string[] {
    if (typeof value === "string") return [prefix];
    if (!value || typeof value !== "object") return [];

    return Object.entries(value).flatMap(([key, child]) =>
        collectTranslationPaths(child, prefix ? `${prefix}.${key}` : key)
    );
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

test("theme initialization reads saved and system preferences through browser APIs", () => {
    for (const scenario of [
        { storedTheme: "dark", prefersDark: false, expected: "dark" },
        { storedTheme: "light", prefersDark: true, expected: "light" },
        { storedTheme: undefined, prefersDark: true, expected: "dark" },
        { storedTheme: "invalid", prefersDark: false, expected: "light" }
    ] as const) {
        const browser = installBrowserMock(scenario);
        try {
            assert.equal(getInitialTheme(), scenario.expected);
        } finally {
            browser.restore();
        }
    }
});

test("applying and toggling themes updates only theme browser state", () => {
    const browser = installBrowserMock({ workspace: "workspace-sentinel" });
    try {
        for (let index = 0; index < 100; index += 1) {
            const mode = index % 2 === 0 ? "dark" : "light";
            applyTheme(mode);
            assert.equal(browser.documentElement.dataset.theme, mode);
            assert.equal(browser.documentElement.style.colorScheme, mode);
            assert.equal(browser.values.get(THEME_STORAGE_KEY), mode);
            assert.equal(browser.values.get("workspace"), "workspace-sentinel");
        }
    } finally {
        browser.restore();
    }
});

test("light and dark themes keep body, secondary, elevated, and primary text readable", () => {
    for (const mode of ["light", "dark"] as const) {
        const token = antdTheme.getDesignToken(createAppThemeConfig(mode));

        assert.ok(
            contrastRatio(token.colorText, token.colorBgContainer) >= 7,
            `${mode} body text should meet enhanced contrast`
        );
        assert.ok(
            contrastRatio(token.colorTextSecondary, token.colorBgContainer) >= 4.5,
            `${mode} secondary text should meet normal contrast`
        );
        assert.ok(
            contrastRatio(token.colorText, token.colorBgElevated) >= 7,
            `${mode} modal and dropdown text should meet enhanced contrast`
        );
        assert.ok(
            contrastRatio(token.colorTextLightSolid, token.colorPrimary) >= 4.5,
            `${mode} primary button text should meet normal contrast`
        );
    }
});

test("all supported languages contain the same theme labels", () => {
    const translations = languageConfig as Record<string, unknown>;
    const expectedPaths = collectTranslationPaths(translations.zh_CN).sort();

    for (const language of ["en_US", "ja_JP"]) {
        assert.deepEqual(
            collectTranslationPaths(translations[language]).sort(),
            expectedPaths,
            `${language} should have the same translation keys as zh_CN`
        );
    }

    for (const language of ["zh_CN", "en_US", "ja_JP"]) {
        const entries = translations[language] as Record<string, string>;
        assert.ok(entries.switchToDarkMode.trim());
        assert.ok(entries.switchToLightMode.trim());
        assert.notEqual(entries.switchToDarkMode, entries.switchToLightMode);
    }
});

test("dark CSS defines every light theme surface token and avoids a black preview stage", async () => {
    const css = await readFile(new URL("../src/index.css", import.meta.url), "utf8");
    const lightBlock = css.match(/:root\s*\{([^}]*)\}/s)?.[1] ?? "";
    const darkBlock = css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/s)?.[1] ?? "";
    const variables = (block: string) => [...block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)]
        .map(([, name, value]) => [name, value.trim()] as const);
    const lightVariables = new Map(variables(lightBlock));
    const darkVariables = new Map(variables(darkBlock));

    assert.deepEqual([...darkVariables.keys()].sort(), [...lightVariables.keys()].sort());
    assert.equal(lightVariables.get("stage-tile-a"), "#f5f5f5");
    assert.equal(lightVariables.get("stage-tile-b"), "#f5f5f5");
    assert.equal(lightVariables.get("stage-grid"), "transparent");
    assert.equal(lightVariables.get("toolbar-background"), "transparent");
    assert.equal(lightVariables.get("toolbar-shadow"), "none");
    assert.equal(lightVariables.get("toolbar-backdrop-filter"), "none");
    assert.equal(lightVariables.get("material-preview-border"), "rgba(0, 0, 0, 0.1)");
    assert.doesNotMatch(darkVariables.get("stage-tile-a") ?? "", /^#(?:000|000000)$/i);
    assert.doesNotMatch(darkVariables.get("stage-tile-b") ?? "", /^#(?:000|000000)$/i);
    assert.equal(darkVariables.get("icon-filter"), "invert(1)");
    assert.match(css, /\.settings-sidebar,\s*\.mobile-settings/);
    assert.match(css, /\.ant-collapse\.settings-card/);
    assert.match(css, /\.canvas-stage/);
});

test("screenshot rendering stays transparent and independent from the UI theme", async () => {
    const [appSource, canvasSource, sceneSource, workspaceTypeSource] = await Promise.all([
        readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
        readFile(new URL("../src/components/ThreeCanvas.tsx", import.meta.url), "utf8"),
        readFile(new URL("../src/components/ThreeScene.tsx", import.meta.url), "utf8"),
        readFile(new URL("../src/types/text.d.ts", import.meta.url), "utf8")
    ]);

    assert.match(canvasSource, /alpha:\s*true/);
    assert.match(canvasSource, /preserveDrawingBuffer:\s*true/);
    assert.match(canvasSource, /style=\{\{\s*background:\s*"transparent"\s*\}\}/);
    assert.match(canvasSource, /gl\.domElement\.toDataURL\("image\/png"\)/);
    assert.match(sceneSource, /scene\.background\s*=\s*null/);
    assert.doesNotMatch(canvasSource, /data-theme|ThemeMode|themeMode/);
    assert.match(appSource, /className="mobile-settings"/);
    assert.match(appSource, /aria-label=\{gLang\(isDarkMode/);
    assert.doesNotMatch(workspaceTypeSource, /ThemeMode|themeMode|theme:/);
});
