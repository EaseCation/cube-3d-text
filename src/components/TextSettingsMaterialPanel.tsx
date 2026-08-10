import React, { useState, useRef } from "react";
import { Form, Select, Slider, Collapse, Space, Upload, Button, Flex, Modal, Input, Tooltip, message } from "antd";
import { UploadOutlined, ShareAltOutlined } from "@ant-design/icons";
import ColorPickerPopover from "./ColorPickerPopover";
import {
    TextMaterials,
    TextMaterialOption,
    TextMaterialGradientOption,
    TextMaterialImageOption,
    TextMaterialColorOption,
} from "../types/text";
import { useLanguage } from "../language";
import {
    serializeMaterial,
    SerializedMaterial,
    deserializeMaterial,
    isSerializedMaterial
} from "../utils/materialSerializer";

const { Option } = Select;

interface TextSettingsMaterialPanelProps {
    materials: TextMaterials;
    onMaterialsChange: (materials: TextMaterials) => void;
}

const TextSettingsMaterialPanel: React.FC<TextSettingsMaterialPanelProps> = ({
                                                                                 materials,
                                                                                 onMaterialsChange,
                                                                             }) => {
    const [materialConfigs, setMaterialConfigs] = useState<{
        [key in keyof TextMaterials]: {
            gradient?: TextMaterialGradientOption;
            image?: TextMaterialImageOption;
            color?: TextMaterialColorOption;
        };
    }>({
        front: {},
        back: {},
        up: {},
        down: {},
        left: {},
        right: {},
        outline: {},
    });

    const { gLang } = useLanguage();

    const faceLabels: { [key in keyof TextMaterials]: string } = {
        front: gLang("front"),
        back: gLang("back"),
        up: gLang("up"),
        down: gLang("down"),
        left: gLang("left"),
        right: gLang("right"),
        outline: gLang("outline"),
    };

    const [isExportModalVisible, setIsExportModalVisible] = useState(false);
    const [exportFileName, setExportFileName] = useState("material");
    const [exportData, setExportData] = useState<SerializedMaterial | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleModeChange = (face: keyof TextMaterials, mode: TextMaterialOption["mode"]) => {
        const currentMaterial = materials[face];

        setMaterialConfigs((prevConfigs) => ({
            ...prevConfigs,
            [face]: {
                ...prevConfigs[face],
                [currentMaterial.mode]: currentMaterial,
            },
        }));

        let newMaterialOption: TextMaterialOption;
        if (materialConfigs[face] && materialConfigs[face][mode]) {
            newMaterialOption = materialConfigs[face][mode]!;
        } else {
            switch (mode) {
                case "gradient":
                    newMaterialOption = {
                        mode: "gradient",
                        colorGradualStart: "#ffffff",
                        colorGradualEnd: "#000000",
                        repeat: 1,
                        offset: 0,
                    } as TextMaterialGradientOption;
                    break;
                case "image":
                    newMaterialOption = {
                        mode: "image",
                        image: "",
                        repeatX: 0.1,
                        repeatY: 0.1,
                        offsetX: 0,
                        offsetY: 0,
                    } as TextMaterialImageOption;
                    break;
                case "color":
                default:
                    newMaterialOption = {
                        mode: "color",
                        color: "#ffffff",
                    } as TextMaterialColorOption;
                    break;
            }
        }

        const updatedMaterials = {
            ...materials,
            [face]: newMaterialOption,
        };
        onMaterialsChange(updatedMaterials);
    };

    const handleOptionChange = (
        face: keyof TextMaterials,
        option: Partial<TextMaterialOption>
    ) => {
        const currentMaterial = materials[face];
        const updatedMaterial = { ...currentMaterial, ...option } as TextMaterialOption;
        const updatedMaterials = {
            ...materials,
            [face]: updatedMaterial,
        };
        onMaterialsChange(updatedMaterials);
    };

    const renderModeOptions = (face: keyof TextMaterials) => {
        const currentMaterial = materials[face];
        return (
            <>
                <Form.Item label={gLang('mode')} key={`${face}-mode`}>
                    <Select
                        value={currentMaterial.mode}
                        onChange={(value) => handleModeChange(face, value)}
                        style={{ width: 150 }}
                    >
                        <Option value="color">{gLang('color')}</Option>
                        <Option value="gradient">{gLang('gradient')}</Option>
                        <Option value="image">{gLang('image')}</Option>
                    </Select>
                </Form.Item>

                {currentMaterial.mode === "color" && (
                    <Form.Item label={gLang('color')} key={`${face}-color`}>
                        <ColorPickerPopover
                            color={(currentMaterial as TextMaterialColorOption).color}
                            onChange={(color) =>
                                handleOptionChange(face, { color } as TextMaterialColorOption)
                            }
                            label={gLang('selectColor', { side: faceLabels[face] })}
                        />
                    </Form.Item>
                )}

                {currentMaterial.mode === "gradient" && (
                    <>
                        <Form.Item label={gLang('color')} key={`${face}-gradient-start`}>
                            <Space>
                                <ColorPickerPopover
                                    color={(currentMaterial as TextMaterialGradientOption).colorGradualStart}
                                    onChange={(color) =>
                                        handleOptionChange(face, { colorGradualStart: color })
                                    }
                                    label={gLang('selectColorStart', { side: faceLabels[face] })}
                                />
                                <ColorPickerPopover
                                    color={(currentMaterial as TextMaterialGradientOption).colorGradualEnd}
                                    onChange={(color) =>
                                        handleOptionChange(face, { colorGradualEnd: color })
                                    }
                                    label={gLang('selectColorEnd', { side: faceLabels[face] })}
                                />
                            </Space>
                        </Form.Item>
                        <Form.Item label={gLang('repeat')} key={`${face}-gradient-repeat`}>
                            <Slider
                                min={0.1}
                                max={10}
                                step={0.1}
                                value={(currentMaterial as TextMaterialGradientOption).repeat}
                                onChange={(value) =>
                                    handleOptionChange(face, { repeat: value })
                                }
                            />
                        </Form.Item>
                        <Form.Item label={gLang('offset')} key={`${face}-gradient-offset`}>
                            <Slider
                                min={0}
                                max={10}
                                step={0.1}
                                value={(currentMaterial as TextMaterialGradientOption).offset}
                                onChange={(value) =>
                                    handleOptionChange(face, { offset: value })
                                }
                            />
                        </Form.Item>
                    </>
                )}

                {currentMaterial.mode === "image" && (
                    <>
                        <Form.Item label={gLang('image')} key={`${face}-image-upload`}>
                            <Flex vertical gap={'small'}>
                                <Upload
                                    accept="image/*"
                                    showUploadList={false}
                                    beforeUpload={(file) => {
                                        const reader = new FileReader();
                                        reader.onload = (e) => {
                                            handleOptionChange(face, { image: e.target?.result as string });
                                        };
                                        reader.readAsDataURL(file);
                                        return false;
                                    }}
                                    onChange={(info) => {
                                        if (info.file.status === 'done') {
                                            const reader = new FileReader();
                                            reader.onload = (e) => {
                                                handleOptionChange(face, { image: e.target?.result as string });
                                            };
                                            if (info.file.originFileObj instanceof Blob) {
                                                reader.readAsDataURL(info.file.originFileObj);
                                            }
                                        }
                                    }}
                                >
                                    <Button icon={<UploadOutlined />}>{gLang('upload')}</Button>
                                </Upload>
                                {materials[face].mode === "image" && materials[face].image && (
                                    <img
                                        src={materials[face].image}
                                        alt="preview"
                                        style={{
                                            maxWidth: '100%',
                                            width: 'auto',
                                            height: 'auto',
                                            imageRendering: 'pixelated',
                                        }}
                                    />
                                )}
                            </Flex>
                        </Form.Item>
                        <Form.Item label={gLang('repeatX')} key={`${face}-image-repeat-x`}>
                            <Slider
                                min={0.005}
                                max={2}
                                step={0.005}
                                value={(currentMaterial as TextMaterialImageOption).repeatX}
                                onChange={(value) =>
                                    handleOptionChange(face, { repeatX: value })
                                }
                            />
                        </Form.Item>
                        <Form.Item label={gLang('repeatY')} key={`${face}-image-repeat-y`}>
                            <Slider
                                min={0.005}
                                max={2}
                                step={0.005}
                                value={(currentMaterial as TextMaterialImageOption).repeatY}
                                onChange={(value) =>
                                    handleOptionChange(face, { repeatY: value })
                                }
                            />
                        </Form.Item>
                        <Form.Item label={gLang('offsetX')} key={`${face}-image-offset-x`}>
                            <Slider
                                min={0}
                                max={10}
                                step={0.01}
                                value={(currentMaterial as TextMaterialImageOption).offsetX}
                                onChange={(value) =>
                                    handleOptionChange(face, { offsetX: value })
                                }
                            />
                        </Form.Item>
                        <Form.Item label={gLang('offsetY')} key={`${face}-image-offset-y`}>
                            <Slider
                                min={0}
                                max={10}
                                step={0.01}
                                value={(currentMaterial as TextMaterialImageOption).offsetY}
                                onChange={(value) =>
                                    handleOptionChange(face, { offsetY: value })
                                }
                            />
                        </Form.Item>
                    </>
                )}
            </>
        );
    };

    const renderExtraPreview = (material: TextMaterialOption) => {
        switch (material.mode) {
            case "color": {
                return (
                    <div style={{
                        backgroundColor: (material as TextMaterialColorOption).color,
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        boxShadow: "0 0 0 1px var(--material-preview-border)"
                    }}/>
                );
            }
            case "gradient": {
                const {colorGradualStart, colorGradualEnd} = material as TextMaterialGradientOption;
                return (
                    <div style={{
                        background: `linear-gradient(180deg, ${colorGradualStart}, ${colorGradualEnd})`,
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        boxShadow: "0 0 0 1px var(--material-preview-border)"
                    }} />
                );
            }
            case "image": {
                return (
                    <img
                        src={(material as TextMaterialImageOption).image}
                        alt="preview"
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: 3,
                            boxShadow: "0 0 0 1px var(--material-preview-border)"
                        }}
                    />
                );
            }
        }
    };

    const exportMaterial = async () => {
        const output = await serializeMaterial(materials);
        setExportData(output);
        setExportFileName("material");
        setIsExportModalVisible(true);
    }

    const handleExportConfirm = () => {
        const fileName = exportFileName.endsWith('.json') ? exportFileName : `${exportFileName}.json`;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportModalVisible(false);
    }

    const importMaterial = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target?.result as string);

                if (!isSerializedMaterial(jsonData)) {
                    message.error(gLang('invalidMaterialFile'));
                    return;
                }

                const importedMaterials = deserializeMaterial(jsonData);
                onMaterialsChange(importedMaterials);
                message.success(gLang('materialImported'));
            } catch (error) {
                console.error("导入材质失败:", error);
                message.error(gLang('importMaterialFailed'));
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        };

        reader.onerror = () => {
            message.error(gLang('readFileFailed'));
        };

        reader.readAsText(file);
    }

    return (
        <>
            <Flex vertical gap={'small'}>
                <Collapse
                    accordion
                    items={(Object.keys(materials) as Array<keyof TextMaterials>).map((face) => ({
                        key: face,
                        label: faceLabels[face],
                        extra: renderExtraPreview(materials[face]),
                        children: (
                            <Form layout="vertical">
                                {renderModeOptions(face)}
                            </Form>
                        )
                    }))}
                />
                <Flex gap={0} justify={'end'}>
                    <Tooltip title={gLang('exportMaterial')}>
                        <Button
                            onClick={exportMaterial}
                            type="text"
                            icon={<img className="material-action-icon" width={16} style={{ opacity: 0.45 }} src="/icon/export.svg"></img>}
                        >
                        </Button>
                    </Tooltip>
                    <Tooltip title={gLang('importMaterial')}>
                        <Button
                            onClick={importMaterial}
                            type="text"
                            icon={<img className="material-action-icon" width={16} style={{ opacity: 0.45 }} src="/icon/import.svg"></img>}
                        >
                        </Button>
                    </Tooltip>
                    <Tooltip title={gLang('shareMaterial')}>
                        <a href="https://github.com/EaseCation/cube-3d-text/blob/main/CONTRIBUTING.md" target="_blank">
                            <Button
                                type="text"
                                icon={<span style={{ opacity: 0.45 }}><ShareAltOutlined /></span>}
                            >
                            </Button>
                        </a>
                    </Tooltip>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".json"
                        onChange={handleFileChange}
                    />
                </Flex>
            </Flex>
            <Modal
                title={gLang('exportMaterial')}
                width={400}
                open={isExportModalVisible}
                onOk={handleExportConfirm}
                onCancel={() => setIsExportModalVisible(false)}
            >
                <Form layout="vertical">
                    <Form.Item label={gLang('fileName')}>
                        <Input
                            value={exportFileName}
                            onChange={(e) => setExportFileName(e.target.value)}
                            suffix=".json"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default TextSettingsMaterialPanel;
