import {
  TextMaterials,
  TextMaterialImageOption,
  TextMaterialOption
} from "../types/text";

// 材质数据版本
export enum MaterialVersion {
  V1 = 1,  // 初始版本
  LATEST = V1  // 当前最新版本
}

// 材质数据接口，包含版本号
export interface SerializedMaterial {
  version: MaterialVersion;
  material: TextMaterials;
}

const materialFaces: Array<keyof TextMaterials> = [
  "front",
  "back",
  "up",
  "down",
  "left",
  "right",
  "outline"
];

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isMaterialOption = (value: unknown): value is TextMaterialOption => {
  if (!value || typeof value !== "object" || !("mode" in value)) return false;
  const option = value as Record<string, unknown>;

  switch (option.mode) {
    case "color":
      return typeof option.color === "string";
    case "gradient":
      return typeof option.colorGradualStart === "string" &&
        typeof option.colorGradualEnd === "string" &&
        isFiniteNumber(option.repeat) &&
        isFiniteNumber(option.offset);
    case "image":
      return typeof option.image === "string" &&
        isFiniteNumber(option.repeatX) &&
        isFiniteNumber(option.repeatY) &&
        isFiniteNumber(option.offsetX) &&
        isFiniteNumber(option.offsetY);
    default:
      return false;
  }
};

export const isTextMaterials = (value: unknown): value is TextMaterials => {
  if (!value || typeof value !== "object") return false;
  const material = value as Record<string, unknown>;
  return materialFaces.every((face) => isMaterialOption(material[face]));
};

export const isSerializedMaterial = (value: unknown): value is SerializedMaterial => {
  if (!value || typeof value !== "object") return false;
  const serialized = value as Record<string, unknown>;
  return isFiniteNumber(serialized.version) && isTextMaterials(serialized.material);
};

/**
 * 将图片URL转换为Base64编码
 * @param imageUrl 图片URL
 * @returns Promise<string> 返回Base64编码后的图片字符串
 */
export async function imageToBase64(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      // 转换为base64，默认为PNG格式
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    
    img.onerror = () => {
      reject(new Error(`图片加载失败: ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
}

/**
 * 序列化材质对象，将图片转为Base64
 * @param material 材质对象
 * @param name 材质名称
 * @param description 材质描述(可选)
 * @returns Promise<SerializedMaterial> 序列化后的材质对象
 */
export async function serializeMaterial(
  material: TextMaterials
): Promise<SerializedMaterial> {
  // 创建材质的深拷贝
  const serializedMaterial: TextMaterials = JSON.parse(JSON.stringify(material));
  
  // 转换所有的图片URL为Base64
  for (const face of Object.keys(serializedMaterial) as Array<keyof TextMaterials>) {
    const materialOption = serializedMaterial[face];
    
    if (materialOption.mode === 'image') {
      const imageOption = materialOption as TextMaterialImageOption;
      
      // 如果图片已经是Base64格式，则跳过
      if (typeof imageOption.image === 'string' && 
          (imageOption.image as string).startsWith('data:image')) {
        continue;
      }
      
      try {
        // 将图片URL转为Base64
        const base64Image = await imageToBase64(imageOption.image as string);
        imageOption.image = base64Image;
      } catch (error) {
        console.error(`无法转换图片 ${face}:`, error);
      }
    }
  }
  
  return {
    version: MaterialVersion.LATEST,
    material: serializedMaterial
  };
}

/**
 * 反序列化材质对象
 * @param serializedData 序列化后的材质数据
 * @returns TextMaterials 反序列化后的材质对象
 */
export function deserializeMaterial(serializedData: SerializedMaterial): TextMaterials {
  // 检查版本并进行必要的升级
  const upgradedData = upgradeMaterialToLatest(serializedData);
  
  // 返回材质对象
  return upgradedData.material;
}

/**
 * 将旧版本的材质数据升级到最新版本
 * @param serializedData 序列化后的材质数据
 * @returns SerializedMaterial 升级后的材质数据
 */
export function upgradeMaterialToLatest(serializedData: SerializedMaterial): SerializedMaterial {
  const data = { ...serializedData };
  
  switch (data.version) {
    case MaterialVersion.V1:
      // 已经是最新版本，不需要升级
      break;
      
    // 如果添加新版本，则在这里添加升级逻辑
    // case MaterialVersion.V2:
    //   data = upgradeFromV2ToV3(data);
    //   break;
      
    default:
      console.warn(`未知的材质数据版本: ${data.version}，尝试以当前版本解析`);
      data.version = MaterialVersion.LATEST;
  }
  
  return data;
}
