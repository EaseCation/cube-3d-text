// src/components/TextSettingsPanel.tsx
import React, { useState } from "react";
import { Form, Input, Slider, Segmented, Flex, InputNumber, Collapse } from "antd";
import { TextOptions } from "../types/text";
import TextSettingsMaterialPanel from "./TextSettingsMaterialPanel.tsx";
import TextSettingsMaterialPresets from "./TextSettingsMaterialPresets.tsx";
import { useLanguage } from "../language.tsx";
import TextSettingsOverlayPanel from "./TextSettingsOverlayPanel.tsx";
import { useFonts } from "../contexts/FontContext";
import { builtinFontsLicence, builtinFontsMap } from "../utils/fonts.ts";
import FontSelector from "./FontSelector.tsx";
import Position3DControl from "./Position3DControl.tsx";

interface TextSettingsPanelProps {
    text: string;
    textOptions: TextOptions;
    fontId?: string; // 新增：该文本的字体ID，undefined表示使用全局字体
    globalFontId: string; // 新增：全局字体ID
    onTextChange: (text: string) => void;
    onTextOptionsChange: (options: TextOptions) => void;
    onFontChange: (fontId: string | undefined) => void; // 新增：字体变更回调
}

const TextSettingsPanel: React.FC<TextSettingsPanelProps> = ({
    text,
    textOptions,
    fontId,
    globalFontId,
    onTextChange,
    onTextOptionsChange,
    onFontChange,
}) => {
    const { gLang } = useLanguage();
    const { fontsMap, deleteFont } = useFonts();
    const [materialType, setMaterialType] = useState<'preset' | 'custom'>('preset');
    
    // 当前显示的字体值：使用文本自己的字体或显示为"全局"
    const displayFontValue = fontId || 'global';
    
    // 字体变更处理
    const handleFontChange = (value: string) => {
        if (value === 'global') {
            // 选择使用全局字体
            onFontChange(undefined);
        } else {
            // 选择特定字体
            onFontChange(value);
        }
    };

    return (
        <>
            <Form.Item label={gLang('content')}>
                <Input value={text} onChange={(e) => onTextChange(e.target.value)} />
            </Form.Item>
            
            {/* 新增：字体选择 */}
            <Form.Item label={gLang('textFont')} layout="vertical">
                <FontSelector
                    value={displayFontValue}
                    onChange={handleFontChange}
                    fontsMap={fontsMap}
                    builtinFontsMap={builtinFontsMap}
                    builtinFontsLicence={builtinFontsLicence}
                    showUploadButton={false}
                    onDeleteFont={deleteFont}
                    allowGlobalFont={true}
                    globalFontId={globalFontId}
                />
            </Form.Item>

            <Form.Item label={gLang('position3D')}>
                <Position3DControl
                    x={textOptions.x}
                    y={textOptions.y}
                    z={textOptions.z}
                    onPositionChange={(position) =>
                        onTextOptionsChange({
                            ...textOptions,
                            x: position.x,
                            y: position.y,
                            z: position.z
                        })
                    }
                    xRange={[-50, 50]}
                    yRange={[-20, 20]}
                    zRange={[-20, 20]}
                    step={0.1}
                />
            </Form.Item>
            <Form.Item label={gLang('upDownRotate')}>
                <Flex gap={'small'}>
                    <Slider
                        style={{ flex: 1 }}
                        min={-90}
                        max={90}
                        step={1}
                        value={textOptions.rotY}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, rotY: val })}
                    />
                    <InputNumber
                        style={{ width: 64 }}
                        variant="filled"
                        min={-90}
                        max={90}
                        step={1}
                        value={textOptions.rotY}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, rotY: val ?? 0 })}
                    />
                </Flex>
            </Form.Item>
            <Form.Item label={gLang('leftRightRotate')}>
                <Flex gap={'small'}>
                    <Slider
                        style={{ flex: 1 }}
                        min={-180}
                        max={180}
                        step={1}
                        value={textOptions.rotX}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, rotX: val })}
                    />
                    <InputNumber
                        style={{ width: 64 }}
                        variant="filled"
                        min={-180}
                        max={180}
                        step={1}
                        value={textOptions.rotX}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, rotX: val ?? 0 })}
                    />
                </Flex>
            </Form.Item>
            <Form.Item label={gLang('planeRotate')}>
                <Flex gap={'small'}>
                    <Slider
                        style={{ flex: 1 }}
                        min={-180}
                        max={180}
                        step={1}
                        value={textOptions.rotZ}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, rotZ: val })}
                    />
                    <InputNumber
                        style={{ width: 64 }}
                        variant="filled"
                        min={-180}
                        max={180}
                        step={1}
                        value={textOptions.rotZ}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, rotZ: val ?? 0 })}
                    />
                </Flex>
            </Form.Item>
            <Form.Item label={gLang('fontSize')}>
                <Flex gap={'small'}>
                    <Slider
                        style={{ flex: 1 }}
                        min={1}
                        max={20}
                        step={0.1}
                        value={textOptions.size}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, size: val })}
                    />
                    <InputNumber
                        style={{ width: 64 }}
                        variant="filled"
                        min={1}
                        max={20}
                        step={0.1}
                        value={textOptions.size}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, size: val ?? 1 })}
                    />
                </Flex>
            </Form.Item>
            <Form.Item label={gLang('spacing')}>
                <Flex gap={'small'}>
                    <Slider
                        style={{ flex: 1 }}
                        min={0}
                        max={5}
                        step={0.1}
                        value={textOptions.letterSpacing}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, letterSpacing: val })}
                    />
                    <InputNumber
                        style={{ width: 64 }}
                        variant="filled"
                        min={0}
                        max={5}
                        step={0.1}
                        value={textOptions.letterSpacing}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, letterSpacing: val ?? 0 })}
                    />
                </Flex>
            </Form.Item>
            <Form.Item label={gLang('spacingWidth')}>
                <Flex gap={'small'}>
                    <Slider
                        style={{ flex: 1 }}
                        min={-0.2}
                        max={1}
                        step={0.05}
                        value={textOptions.spacingWidth}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, spacingWidth: val })}
                    />
                    <InputNumber
                        style={{ width: 64 }}
                        variant="filled"
                        min={-0.2}
                        max={1}
                        step={0.05}
                        value={textOptions.spacingWidth}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, spacingWidth: val ?? 0 })}
                    />
                </Flex>
            </Form.Item>
            <Form.Item label={gLang('thickness')}>
                <Flex gap={'small'}>
                    <Slider
                        style={{ flex: 1 }}
                        min={1}
                        max={10}
                        step={1}
                        value={textOptions.depth}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, depth: val })}
                    />
                    <InputNumber
                        style={{ width: 64 }}
                        variant="filled"
                        min={1}
                        max={10}
                        step={1}
                        value={textOptions.depth}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, depth: val ?? 1 })}
                    />
                </Flex>
            </Form.Item>
            <Form.Item label={gLang('outlineSize')}>
                <Flex gap={'small'}>
                    <Slider
                        style={{ flex: 1 }}
                        min={0}
                        max={1.0}
                        step={0.05}
                        value={textOptions.outlineWidth}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, outlineWidth: val })}
                    />
                    <InputNumber
                        style={{ width: 64 }}
                        variant="filled"
                        min={0}
                        max={1}
                        step={0.05}
                        value={textOptions.outlineWidth}
                        onChange={(val) => onTextOptionsChange({ ...textOptions, outlineWidth: val ?? 0 })}
                    />
                </Flex>
            </Form.Item>
            <Collapse
                defaultActiveKey={['texture']}
                ghost
                size="small"
                style={{ marginLeft: -8, marginRight: -8 }}
                items={[
                    {
                        key: 'texture',
                        label: gLang('texture'),
                        children: (
                            <Flex gap={'small'} vertical>
                                <Segmented value={materialType} options={[{label: gLang('preset'), value: 'preset'}, {label: gLang('custom'), value: 'custom'}]} block onChange={setMaterialType} />
                                {(materialType === 'preset') ? (
                                    <TextSettingsMaterialPresets
                                        materials={textOptions.materials}
                                        onMaterialsChange={(materials) => onTextOptionsChange({...textOptions, materials})}
                                    />
                                ) : (
                                    <TextSettingsMaterialPanel
                                        materials={textOptions.materials}
                                        onMaterialsChange={(materials) => onTextOptionsChange({...textOptions, materials})}
                                    />
                                )}
                            </Flex>
                        )
                    },
                    {
                        key: 'overlay',
                        label: gLang('overlay.title'),
                        children: (
                            <TextSettingsOverlayPanel
                                overlay={textOptions.overlay}
                                setOverlay={(overlay) => onTextOptionsChange({...textOptions, overlay})}
                            />
                        )
                    }
                ]}
            />
        </>
    );
};

export default TextSettingsPanel;