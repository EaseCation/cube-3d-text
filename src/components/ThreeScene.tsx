import React, { Suspense, useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import Text3D from "./Text3D";
import { Text3DData } from "../types/text";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { useThree } from "@react-three/fiber";
import { useMessage } from "../contexts/MessageContext";
import { useLanguage } from "../language";
import customFontsStore from "../utils/localForageInstance.ts";

interface ThreeSceneProps {
    texts: Text3DData[];
    globalFontId: string;
    fontsMap: Record<string, string>;
    globalTextureYOffset: number;
}

const cachedFonts : {[id: string]: Font} = {}

export interface ThreeSceneHandle {
    groupRef: React.RefObject<THREE.Group | null>;
}

const ThreeScene = forwardRef<ThreeSceneHandle, ThreeSceneProps>(({ texts, globalFontId, fontsMap, globalTextureYOffset }, ref) => {

    const groupRef = useRef<THREE.Group>(null);

    useImperativeHandle(ref, () => ({
        groupRef
    }));

    const { gLang } = useLanguage();

    const messageApi = useMessage();

    // 存储加载的字体，key是fontId
    const [loadedFonts, setLoadedFonts] = useState<Record<string, Font>>({});

    useEffect(() => {
        // 收集需要加载的所有字体ID
        const fontsToLoad = new Set<string>();
        const fallbackFontId = fontsMap["Minecraft Ten"]
            ? "Minecraft Ten"
            : Object.keys(fontsMap).find(fontId => typeof fontsMap[fontId] === "string");
        const effectiveGlobalFontId = fontsMap[globalFontId] ? globalFontId : fallbackFontId;
        if (fallbackFontId) fontsToLoad.add(fallbackFontId);
        if (effectiveGlobalFontId) fontsToLoad.add(effectiveGlobalFontId);
        
        // 收集每个文本的特定字体
        texts.forEach(text => {
            if (text.fontId && fontsMap[text.fontId]) {
                fontsToLoad.add(text.fontId);
            }
        });
        
        // 开始加载每个需要的字体
        const fontLoader = new FontLoader();
        
        fontsToLoad.forEach(fontId => {
            const fontUrl = fontsMap[fontId];
            if (!fontUrl) return;
            
            // 如果字体已缓存，直接使用
            if (cachedFonts[fontUrl]) {
                setLoadedFonts(prev => ({
                    ...prev,
                    [fontId]: cachedFonts[fontUrl]
                }));
                return;
            }
            
            // 加载自定义字体或网络字体
            if (fontUrl.startsWith("custom:")) {
                // 从本地存储加载字体
                customFontsStore.getItem(fontUrl.replace("custom:", "")).then(fontData => {
                    if (!fontData || typeof fontData !== "string") {
                        return;
                    }
                    const fontJson = JSON.parse(fontData);
                    const font = fontLoader.parse(fontJson);
                    setLoadedFonts(prev => ({
                        ...prev,
                        [fontId]: font
                    }));
                    cachedFonts[fontUrl] = font;
                }).catch(error => {
                    console.error(`Custom font load failed (${fontId}):`, error);
                    messageApi?.open({
                        key: `loadingFont-${fontId}`,
                        type: 'error',
                        content: gLang('customFont.failed'),
                        duration: 3,
                    });
                });
            } else {
                // 从网络加载字体
                const startTime = Date.now();
                fontLoader.load(
                    fontUrl,
                    (font) => {
                        setLoadedFonts(prev => ({
                            ...prev,
                            [fontId]: font
                        }));
                        cachedFonts[fontUrl] = font;
                        const now = Date.now();
                        if (now - startTime > 1000) {
                            messageApi?.open({
                                key: `loadingFont-${fontId}`,
                                type: 'success',
                                content: gLang('fontSuccess'),
                                duration: 2,
                            });
                        }
                    },
                    (progress) => {
                        const now = Date.now();
                        if (now - startTime > 1000) {
                            messageApi?.open({
                                key: `loadingFont-${fontId}`,
                                type: 'loading',
                                content: gLang('fontLoading') + Math.round(progress.loaded),
                                duration: 60,
                            });
                        }
                    },
                    (error) => {
                        console.error(`Font load failed (${fontId}):`, error);
                        messageApi?.open({
                            key: `loadingFont-${fontId}`,
                            type: 'error',
                            content: gLang('customFont.failed'),
                            duration: 3,
                        });
                    }
                );
            }
        });
    }, [fontsMap, globalFontId, texts, gLang, messageApi]); // 字体映射或需要的字体变化时重新加载

    const { scene } = useThree();

    useEffect(() => {
        // 确保场景背景为透明
        scene.background = null;
    }, [scene]);

    return (
        <>
            {/* 创建文本网格 */}
            <Suspense fallback={<Html>Loading...</Html>}>
                <group ref={groupRef}>
                    {texts.map((text, index) => {
                        // 获取该文本应该使用的字体ID和实例
                        const fallbackFontId = fontsMap["Minecraft Ten"]
                            ? "Minecraft Ten"
                            : Object.keys(fontsMap).find(fontId => typeof fontsMap[fontId] === "string");
                        const effectiveGlobalFontId = fontsMap[globalFontId] ? globalFontId : fallbackFontId;
                        const effectiveFontId = text.fontId && fontsMap[text.fontId]
                            ? text.fontId
                            : effectiveGlobalFontId;
                        const selectedFont = effectiveFontId && loadedFonts[effectiveFontId];
                        const font = selectedFont || (fallbackFontId && loadedFonts[fallbackFontId]);
                        const isTemporaryFallback = Boolean(
                            effectiveFontId &&
                            effectiveFontId !== fallbackFontId &&
                            !selectedFont
                        );
                        
                        // 如果字体还未加载完成，不渲染该文本
                        if (!font) return null;
                        
                        return (
                            <Text3D
                                key={index}
                                content={text.content}
                                opts={text.opts}
                                globalTextureYOffset={globalTextureYOffset}
                                font={font}
                                suppressUnsupportedWarning={isTemporaryFallback}
                                position={[text.opts.x, text.opts.y, text.opts.z]}
                                rotation={[text.opts.rotY * (Math.PI / 180), text.opts.rotX * (Math.PI / 180), text.opts.rotZ * (Math.PI / 180)]}
                            />
                        );
                    })}
                </group>
            </Suspense>
        </>
    );
});

export default ThreeScene;
