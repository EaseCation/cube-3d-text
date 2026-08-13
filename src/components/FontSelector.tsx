import { FC } from "react";
import { Select, Button, Tooltip, Flex, Tag, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useLanguage } from "../language";
import { FontLicenceInfo } from "../utils/fonts";

const { Text } = Typography;

interface FontSelectorProps {
  value: string;
  onChange: (value: string) => void;
  fontsMap: Record<string, string>;
  builtinFontsMap: Record<string, string>;
  builtinFontsLicence: Record<string, FontLicenceInfo>;
  onUploadClick?: () => void;
  onDeleteFont?: (fontName: string) => void;
  showUploadButton?: boolean;
  allowGlobalFont?: boolean;
  globalFontId?: string;
}

const FontSelector: FC<FontSelectorProps> = ({
  value,
  onChange,
  fontsMap,
  builtinFontsMap,
  builtinFontsLicence,
  onUploadClick,
  onDeleteFont,
  showUploadButton = true,
  allowGlobalFont = false,
  globalFontId,
}) => {
  const { gLang } = useLanguage();
  
  // 构建字体选项
  let fontOptions = Object.keys(fontsMap).map((fontName) => {
    const licenseInfo: FontLicenceInfo | undefined = builtinFontsLicence[fontName];
    return {
      label: (
        <Flex justify="space-between" align="center">
          <Flex gap="small" align="center">
            <span>{fontName}</span>
            {licenseInfo && (
              <Tooltip title={<div dangerouslySetInnerHTML={{ __html: gLang(licenseInfo.tagTooltip) }} />}>
                <Tag color={licenseInfo.tagColor}>{gLang(licenseInfo.tag)}</Tag>
              </Tooltip>
            )}
          </Flex>
          {!builtinFontsMap[fontName] && onDeleteFont && (
            <Button
              size="small"
              type="text"
              icon={<DeleteOutlined style={{ opacity: 0.5 }} />}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFont(fontName);
              }}
            />
          )}
        </Flex>
      ),
      value: fontName,
    };
  });
  
  // 如果允许使用全局字体，添加一个特殊选项
  if (allowGlobalFont && globalFontId) {
    fontOptions = [
      {
        label: (
          <Flex gap="small" align="center">
            <Text type="secondary">{gLang('useGlobalFont')}</Text>
          </Flex>
        ),
        value: 'global',
      },
      ...fontOptions
    ];
  }

  return (
    <Select
      style={{ width: "100%" }}
      value={value}
      onChange={onChange}
      popupRender={menu => (
        <>
          {menu}
          {showUploadButton && onUploadClick && (
            <Button size="small" type="dashed" block onClick={onUploadClick} style={{ marginTop: 8 }}>
              {gLang("customFont.upload")}
            </Button>
          )}
        </>
      )}
      options={fontOptions}
    />
  );
};

export default FontSelector;
