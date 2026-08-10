import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { builtinFontsMap } from "../utils/fonts";
import customFontsStore from "../utils/localForageInstance";
import { useMessage } from "./MessageContext";
import { useLanguage } from "../language";
import { convertTTFtoFaceTypeJson, ConvertResult } from "../utils/ttfConverter";

interface FontContextType {
  fontsMap: Record<string, string>;
  customFonts: Record<string, string>;
  setCustomFonts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  uploadFont: (file: File) => Promise<string | undefined>;
  deleteFont: (fontName: string) => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

const loadStoredCustomFonts = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem("customFonts");
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid custom font index");
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([name, url]) =>
          name.trim().length > 0 &&
          typeof url === "string" &&
          url.startsWith("custom:")
      )
    );
  } catch (error) {
    console.warn("Invalid custom font cache was cleared:", error);
    localStorage.removeItem("customFonts");
    return {};
  }
};

export const FontProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { gLang } = useLanguage();
  const messageApi = useMessage();
  
  // 从localStorage加载自定义字体信息
  const [customFonts, setCustomFonts] = useState<Record<string, string>>(loadStoredCustomFonts);
  
  const fontsMap = {
    ...builtinFontsMap,
    ...customFonts,
  };
  
  // 自定义字体变化后仅持久化；字体映射直接由当前状态派生。
  useEffect(() => {
    localStorage.setItem("customFonts", JSON.stringify(customFonts));
  }, [customFonts]);

  useEffect(() => {
    let active = true;
    const entries = Object.entries(customFonts);

    void Promise.all(
      entries.map(async ([fontName, fontUrl]) => {
        const storedFont = await customFontsStore.getItem(fontUrl.slice("custom:".length));
        return storedFont ? undefined : fontName;
      })
    ).then(missingNames => {
      if (!active) return;
      const missingFonts = new Set(missingNames.filter((name): name is string => Boolean(name)));
      if (missingFonts.size === 0) return;

      console.warn("Missing custom font data was removed:", [...missingFonts]);
      setCustomFonts(prev => Object.fromEntries(
        Object.entries(prev).filter(([fontName]) => !missingFonts.has(fontName))
      ));
    }).catch(error => {
      console.error("Custom font cache validation failed:", error);
    });

    return () => {
      active = false;
    };
  }, [customFonts]);
  
  // 上传TTF字体并转换为Three.js支持的JSON格式
  const uploadFont = async (file: File): Promise<string | undefined> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data: ConvertResult = await convertTTFtoFaceTypeJson(arrayBuffer);
      const fontName = data.fullName;
      if (!fontName.trim()) {
        messageApi?.warning(gLang("customFont.nameEmpty"));
        return undefined;
      }
      
      const fontKey = `font-${fontName.trim()}`;
      await customFontsStore.setItem(fontKey, data.data);
      
      const newFontName = fontName.trim();
      setCustomFonts(prev => ({
        ...prev,
        [newFontName]: 'custom:' + fontKey,
      }));
      
      messageApi?.success(gLang('customFont.success'));
      return newFontName;
    } catch (error) {
      console.error("Font load failed:", error);
      messageApi?.error(gLang('customFont.failed'));
      return undefined;
    }
  };
  
  // 删除自定义字体
  const deleteFont = (fontName: string) => {
    if (builtinFontsMap[fontName]) return; // 内置字体不可删除

    const fontUrl = customFonts[fontName];
    
    setCustomFonts(prev => {
      const newFonts = { ...prev };
      delete newFonts[fontName];
      return newFonts;
    });

    if (fontUrl?.startsWith("custom:")) {
      void customFontsStore.removeItem(fontUrl.slice("custom:".length)).catch(error => {
        console.error("Font cleanup failed:", error);
      });
    }
  };
  
  const value = {
    fontsMap,
    customFonts,
    setCustomFonts,
    uploadFont,
    deleteFont,
  };
  
  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
};

export const useFonts = () => {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error("useFonts must be used within a FontProvider");
  }
  return context;
};
