import manifest from '../../cube-static-assets.json';

const fontUrl = (filename: keyof typeof manifest.files): string =>
    `${manifest.baseUrl}/${manifest.files[filename].object}`;

export const builtinFontsMap: { [name: string]: string } = {
    "汉仪力量黑(简)": fontUrl("/font/HYLiLiangHeiJ_Regular.json"),
    "锐字太空历险像素简": fontUrl("/font/REEJI-TaikoMagicGB-Flash_Regular.json"),
    "Minecraft Ten": fontUrl("/font/Minecraft_Ten_Regular.json"),
    "Fusion Pixel 8px": fontUrl("/font/Fusion_Pixel_8px_Proportional_zh_hans_Regular.json"),
    "Fusion Pixel 10px": fontUrl("/font/Fusion_Pixel_10px_Proportional_zh_hans_Regular.json"),
    "得意黑": fontUrl("/font/Smiley_Sans_Oblique_Regular.json"),
    "Unifont ASCII": fontUrl("/font/Unifont_ASCII_Regular.json")
};

export const builtinFontsTextureYOffset: { [name: string]: number } = {
    "汉仪力量黑(简)": 0,
    "锐字太空历险像素简": 0,
    "Fusion Pixel 8px": 0,
    "Fusion Pixel 10px": 0,
}

export interface FontLicenceInfo {
    tagColor: string;
    tag: string;
    tagTooltip: string;
}

export const builtinFontsLicence: { [name: string]: FontLicenceInfo } = {
    "汉仪力量黑(简)": {
        tagColor: "orange",
        tag: "fontLicence.netease",
        tagTooltip: "fontLicence.hanyiTooltip",
    },
    "锐字太空历险像素简": {
        tagColor: "orange",
        tag: "fontLicence.netease",
        tagTooltip: "fontLicence.ruiziTooltip",
    },
    "Minecraft Ten": {
        tagColor: "success",
        tag: "fontLicence.sil",
        tagTooltip: "fontLicence.minecraftTenTooltip",
    },
    "Fusion Pixel 8px": {
        tagColor: "success",
        tag: "fontLicence.sil",
        tagTooltip: "fontLicence.fusionPixelTooltip",
    },
    "Fusion Pixel 10px": {
        tagColor: "success",
        tag: "fontLicence.sil",
        tagTooltip: "fontLicence.fusionPixelTooltip",
    },
    "得意黑": {
        tagColor: "success",
        tag: "fontLicence.sil",
        tagTooltip: "fontLicence.smileyTooltip",
    },
    "Unifont ASCII": {
        tagColor: "success",
        tag: "fontLicence.sil",
        tagTooltip: "fontLicence.unifontTooltip",
    }
}
