import React, { CSSProperties } from "react";
import { Card, Flex, Button, ConfigProvider, Spin, Alert, Typography } from "antd";
import {
    TextMaterials,
    TextMaterialGradientOption,
    TextMaterialImageOption,
    TextMaterialColorOption,
} from "../types/text";
import { CheckSquareTwoTone, ReloadOutlined } from "@ant-design/icons";
import { useMaterials } from "../contexts/MaterialContext";
import { useLanguage } from "../language";

const { Text } = Typography;

interface TextSettingsMaterialPresetsProps {
    materials: TextMaterials;
    onMaterialsChange: (materials: TextMaterials) => void;
}

const TextSettingsMaterialPresets: React.FC<TextSettingsMaterialPresetsProps> = ({
    materials,
    onMaterialsChange,
}) => {
    const { gLang } = useLanguage();

    // 使用材质上下文替代本地状态
    const {
        isLoading,
        error,
        collections,
        loadedMaterials,
        loadMaterials
    } = useMaterials();

    const renderPreview = (material: TextMaterials) : CSSProperties => {
        const style: CSSProperties = {};
        switch (material.front.mode) {
            case "color": {
                style.backgroundColor = (material.front as TextMaterialColorOption).color;
                break;
            }
            case "gradient": {
                    const {colorGradualStart, colorGradualEnd} = material.front as TextMaterialGradientOption;
                    style.background = `linear-gradient(180deg, ${colorGradualStart}, ${colorGradualEnd})`;
                break;
            }
            case "image": {
                // 检查是否为字符串或已加载的图像对象
                const imageSource = typeof (material.front as TextMaterialImageOption).image === 'string'
                    ? (material.front as TextMaterialImageOption).image
                    : URL.createObjectURL((material.front as TextMaterialImageOption).image as unknown as Blob | File);
                    
                style.backgroundImage = `url(${imageSource})`;
                style.backgroundSize = 'auto 100%';
                style.imageRendering = 'pixelated';
                break;
            }
        }
        switch (material.down.mode) {
            case "color": {
                // Inner shadow with color
                style.boxShadow = `0 -2px 0 0 ${(material.down as TextMaterialColorOption).color} inset`;
                break;
            }
            case "gradient": {
                const { colorGradualStart } = material.down as TextMaterialGradientOption;
                // Inner shadow with gradient end color
                style.boxShadow = `0 -2px 0 0 ${colorGradualStart} inset`;
                break;
            }
        }
        return style;
    };

    type TwoToneColor = string | [string, string];

    const iconColor = (materials: TextMaterials): TwoToneColor => {
        const colors: TwoToneColor = ['white', 'rgba(255, 255, 255, .1)'];
        switch (materials.down.mode) {
            case "color":
                colors[0] = (materials.down as TextMaterialColorOption).color;
                break;
            case "gradient":
                colors[0] = (materials.down as TextMaterialGradientOption).colorGradualEnd;
                break;
        }
        return colors;
    }

    // 检查材质是否选中的函数
    const isMaterialSelected = (material: TextMaterials) => {
        return JSON.stringify(material) === JSON.stringify(materials);
    };

    // 渲染材质列表
    const renderMaterialsList = () => {
        // 使用JSON加载的材质
        return collections.map((collection) => {
            const material = loadedMaterials.get(collection);
            if (!material) return null;
            
            return (
                <ConfigProvider
                    key={collection}
                    theme={{
                        token: {
                            colorPrimary: iconColor(material)[0],
                        }
                    }}
                >
                    <Button
                        block
                        type={isMaterialSelected(material) ? 'primary' : undefined}
                        ghost={isMaterialSelected(material)}
                        onClick={() => onMaterialsChange(material)}
                        style={renderPreview(material)}
                    >
                        {isMaterialSelected(material) && <CheckSquareTwoTone twoToneColor={iconColor(material)}/>}
                    </Button>
                </ConfigProvider>
            );
        });
    };

    return (
        <Card size={'small'} title={gLang('materialPresets')}>
            {isLoading ? (
                <Flex justify="center" align="center" style={{ padding: '20px' }}>
                    <Spin tip={gLang('loadingMaterials')}>
                        <div style={{ minHeight: '60px' }} />
                    </Spin>
                </Flex>
            ) : error ? (
                <Alert
                    message={gLang('loadingNotice')}
                    description={
                        <Flex vertical gap="small">
                            <Text>{gLang(error || 'cannotLoadMaterialFile')}</Text>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={loadMaterials}
                            >
                                {gLang('retryLoad')}
                            </Button>
                        </Flex>
                    }
                    type="warning"
                    showIcon
                />
            ) : (
                <Flex gap={'small'} vertical>
                    {renderMaterialsList()}
                </Flex>
            )}
        </Card>
    );
};

export default TextSettingsMaterialPresets;
