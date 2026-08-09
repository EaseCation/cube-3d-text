import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { TextMaterials } from '../types/text';
import { materialLoader } from '../utils/materialLoader';

// 创建材质上下文的类型
interface MaterialContextType {
  isLoading: boolean;
  error: string | null;
  collections: string[];
  loadedMaterials: Map<string, TextMaterials>;
  loadMaterials: () => Promise<void>;
  clearMaterialCache: () => void;
}

// 创建默认值
const defaultContextValue: MaterialContextType = {
  isLoading: false,
  error: null,
  collections: [],
  loadedMaterials: new Map(),
  loadMaterials: async () => {},
  clearMaterialCache: () => {}
};

// 创建上下文
const MaterialContext = createContext<MaterialContextType>(defaultContextValue);

// 创建上下文提供者组件
export const MaterialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<{
    isLoading: boolean;
    error: string | null;
    collections: string[];
    loadedMaterials: Map<string, TextMaterials>;
  }>({
    isLoading: true,
    error: null,
    collections: [],
    loadedMaterials: new Map()
  });

  // materialLoader 自身负责缓存和并发去重，因此回调不依赖 React 状态。
  const loadMaterials = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // 加载材质索引
      const loadedCollections = await materialLoader.loadIndex();
      
      // 加载所有材质
      const materials = await materialLoader.loadAllMaterials();
      
      setState({
        isLoading: false,
        error: null,
        collections: loadedCollections,
        loadedMaterials: materials
      });
    } catch (err) {
      console.error("无法加载JSON材质:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: "cannotLoadMaterialFile"
      }));
    }
  }, []);

  // 清除材质缓存 - 同样使用 useCallback 确保引用稳定
  const clearMaterialCache = useCallback(() => {
    materialLoader.clearCache();
    setState({
      isLoading: false,
      error: null,
      collections: [],
      loadedMaterials: new Map()
    });
  }, []);

  // 组件首次加载时尝试加载材质
  useEffect(() => {
    let active = true;

    materialLoader.loadIndex()
      .then(async (collections) => ({
        collections,
        loadedMaterials: await materialLoader.loadAllMaterials()
      }))
      .then(({ collections, loadedMaterials }) => {
        if (!active) return;
        setState({
          isLoading: false,
          error: null,
          collections,
          loadedMaterials
        });
      })
      .catch((err) => {
        console.error("无法加载JSON材质:", err);
        if (!active) return;
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: "cannotLoadMaterialFile"
        }));
      });

    return () => {
      active = false;
    };
  }, []);

  // 构建上下文值
  const value = {
    isLoading: state.isLoading,
    error: state.error,
    collections: state.collections,
    loadedMaterials: state.loadedMaterials,
    loadMaterials,
    clearMaterialCache
  };

  return (
    <MaterialContext.Provider value={value}>
      {children}
    </MaterialContext.Provider>
  );
};

// 创建自定义钩子，用于在组件中访问材质上下文
export const useMaterials = () => useContext(MaterialContext);

export default MaterialContext;
