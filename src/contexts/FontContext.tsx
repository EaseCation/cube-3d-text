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

export const FontProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { gLang } = useLanguage();
  const messageApi = useMessage();
  
  // 从localStorage加载自定义字体信息
  const [customFonts, setCustomFonts] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem("customFonts");
    return stored ? JSON.parse(stored) : {};
  });
  
  const fontsMap = {
    ...builtinFontsMap,
    ...customFonts,
  };
  
  // 自定义字体变化后仅持久化；字体映射直接由当前状态派生。
  useEffect(() => {
    localStorage.setItem("customFonts", JSON.stringify(customFonts));
  }, [customFonts]);
  
  // 上传TTF字体并转换为Three.js支持的JSON格式
  const uploadFont = async (file: File): Promise<string | undefined> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data: ConvertResult = await convertTTFtoFaceTypeJson(arrayBuffer);
      const fontName = data.names.fullName.en ?? "";
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
    
    setCustomFonts(prev => {
      const newFonts = { ...prev };
      delete newFonts[fontName];
      return newFonts;
    });
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
