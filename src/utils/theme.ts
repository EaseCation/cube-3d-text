import { theme as antdTheme } from "antd";
import type { ThemeConfig } from "antd";

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "cube-3d-text-theme";

export function resolveThemePreference(
    storedTheme: string | null,
    prefersDark: boolean
): ThemeMode {
    if (storedTheme === "light" || storedTheme === "dark") {
        return storedTheme;
    }

    return prefersDark ? "dark" : "light";
}

export function getInitialTheme(): ThemeMode {
    return resolveThemePreference(
        window.localStorage.getItem(THEME_STORAGE_KEY),
        window.matchMedia("(prefers-color-scheme: dark)").matches
    );
}

export function applyTheme(theme: ThemeMode): void {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function createAppThemeConfig(themeMode: ThemeMode): ThemeConfig {
    const isDarkMode = themeMode === "dark";

    return {
        algorithm: isDarkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
            colorPrimary: isDarkMode ? "#d6dbe3" : "#333333",
            colorTextLightSolid: isDarkMode ? "#11151b" : "#ffffff",
            colorBgLayout: isDarkMode ? "#14181f" : "#f5f5f5",
        },
        components: {
            Button: {
                primaryShadow: isDarkMode
                    ? "0 2px 0 rgba(0, 0, 0, 0.32)"
                    : "0 2px 0 rgba(0, 0, 0, 0.08)"
            },
            Dropdown: {
                controlItemBgActive: isDarkMode
                    ? "rgba(255, 255, 255, 0.16)"
                    : "rgba(0, 0, 0, 0.12)",
                controlItemBgActiveHover: isDarkMode
                    ? "rgba(255, 255, 255, 0.22)"
                    : "rgba(0, 0, 0, 0.2)",
            },
            Select: {
                optionSelectedBg: isDarkMode
                    ? "rgba(255, 255, 255, 0.16)"
                    : "rgba(0, 0, 0, 0.12)",
            },
            Form: {
                itemMarginBottom: 12
            },
        },
    };
}
