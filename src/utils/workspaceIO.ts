import { WorkspaceData } from "../types/text";
import { MessageInstance } from "antd/es/message/interface";
import { builtinOverlayRenderers } from "./overlay";

/**
 * 当前工作区数据版本
 * 版本历史：
 * 1: 初始版本
 */
export const CURRENT_WORKSPACE_VERSION = 1;

/**
 * 带版本信息的工作区数据
 */
export interface VersionedWorkspaceData {
  version: number;
  data: WorkspaceData;
}

/**
 * 生成有效的文件名
 */
export function generateValidFileName(workspace: WorkspaceData): string {
  // 获取所有文本内容并合并为一个字符串
  const allText = workspace.texts.map(t => t.content).join('-');
  
  // 如果没有文本内容，使用默认名称
  if (!allText.trim()) {
    return 'cube-3d-text-project';
  }
  
  // 处理文件名：移除特殊字符，替换空格和换行
  // 取前20个字符避免文件名过长
  const fileName = allText
    .trim()
    .replace(/[\r\n]+/g, '-')  // 将换行符替换为连字符
    .replace(/[\\/:*?"<>|]/g, '') // 移除Windows文件名不允许的字符
    .replace(/\s+/g, '-')      // 将空格替换为连字符
    .substring(0, 30);         // 限制长度
  
  return fileName || 'cube-3d-text-project';
}

/**
 * 导出工作区数据到文件
 */
export function exportWorkspace(workspace: WorkspaceData): void {
  // 添加版本信息
  const versionedData: VersionedWorkspaceData = {
    version: CURRENT_WORKSPACE_VERSION,
    data: workspace
  };

  // 将工作区数据转换为 JSON 字符串，使用自定义 replacer 处理 overlay
  const jsonString = JSON.stringify(versionedData, workspaceReplacer, 2);

  // 创建 Blob 对象
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // 创建一个临时的<a>元素用于下载
  const a = document.createElement('a');
  a.href = url;
  a.download = `${generateValidFileName(workspace)}.json`;

  // 模拟点击下载
  document.body.appendChild(a);
  a.click();

  // 清理
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * JSON 序列化时的 replacer 函数
 * 将 overlay 对象转换为字符串（仅保存 name）
 */
export function workspaceReplacer(key: string, value: unknown): unknown {
  // 将 overlay 对象序列化为字符串（只保存 name）
  if (key === 'overlay' && value && typeof value === 'object' && 'name' in value) {
    return (value as { name: string }).name;
  }
  return value;
}

/**
 * 恢复 overlay 字段为完整的 OverlayRendererInfo 对象
 * 支持三种情况：
 * 1. overlay 为字符串 - 根据 name 从预设列表查找
 * 2. overlay 为对象但缺少 renderer - 根据 name 从预设列表查找
 * 3. overlay 为 undefined - 保持不变
 */
function restoreOverlayField(opts: { overlay?: unknown }): void {
  if (!opts.overlay) {
    return; // undefined 或 null，不需要处理
  }

  let overlayName: string | undefined;

  // 情况1：overlay 是字符串
  if (typeof opts.overlay === 'string') {
    overlayName = opts.overlay;
  }
  // 情况2：overlay 是对象（旧格式导出的残缺对象）
  else if (typeof opts.overlay === 'object' && 'name' in opts.overlay) {
    overlayName = (opts.overlay as { name?: string }).name;
  }

  // 根据 name 从预设列表查找完整对象
  if (overlayName) {
    const foundOverlay = builtinOverlayRenderers.find(o => o.name === overlayName);
    if (foundOverlay) {
      opts.overlay = foundOverlay;
    } else {
      console.warn(`未找到预设 overlay: ${overlayName}`);
      opts.overlay = undefined; // 找不到则清除
    }
  } else {
    opts.overlay = undefined; // 无效格式则清除
  }
}

/**
 * 版本转换函数类型
 */
type VersionUpgrader = (oldData: unknown) => WorkspaceData;

/**
 * 版本转换映射表
 * 每个键是源版本，对应的函数用于将该版本升级到下一个版本
 */
const versionUpgraders: Record<number, VersionUpgrader> = {
  // v0 (无版本号) 到 v1 的转换
  0: (oldData: unknown) => {
    // 假设旧数据没有版本号，直接是 WorkspaceData
    // 修复缺失的字段
    const workspaceData = oldData as WorkspaceData;
    workspaceData.texts.forEach((text) => {
      if (!text.opts.z) {
        text.opts.z = 0;
      }
      // 恢复 overlay 完整对象
      restoreOverlayField(text.opts);
    });
    return workspaceData;
  }

  // 当添加新版本时，在这里添加更多的升级函数
  // 1: (v1Data) => { /* v1 到 v2 的转换 */ }
};

/**
 * 将任何版本的数据升级到最新版本
 */
export function upgradeToLatest(jsonData: string, messageApi?: MessageInstance | null): WorkspaceData {
  try {
    const data = JSON.parse(jsonData);
    
    // 检查是否为带版本的数据格式
    let currentVersion: number;
    let workspaceData: WorkspaceData;
    
    // 类型保护检查
    if (data && typeof data === 'object' && 'version' in data && 'data' in data) {
      // 有版本信息的新格式
      currentVersion = (data as VersionedWorkspaceData).version;
      workspaceData = (data as VersionedWorkspaceData).data;
    } else {
      // 无版本信息的旧格式，视为版本0
      currentVersion = 0;
      workspaceData = data as WorkspaceData;
    }
    
    // 如果版本已经是最新，仍需要恢复 overlay 字段（因为导出时被序列化为字符串）
    if (currentVersion >= CURRENT_WORKSPACE_VERSION) {
      // 恢复所有文本的 overlay 字段
      workspaceData.texts.forEach((text) => {
        restoreOverlayField(text.opts);
      });
      return workspaceData;
    }
    
    // 依次应用每个版本的升级转换
    while (currentVersion < CURRENT_WORKSPACE_VERSION) {
      if (versionUpgraders[currentVersion]) {
        workspaceData = versionUpgraders[currentVersion](workspaceData);
        currentVersion++;
      } else {
        // 没有找到对应的升级函数，中断升级
        const warnMsg = `找不到从版本 ${currentVersion} 升级到 ${currentVersion + 1} 的转换函数`;
        console.warn(warnMsg);
        messageApi?.warning(warnMsg);
        break;
      }
    }
    
    return workspaceData;
  } catch (e) {
    const errorMsg = '无效的JSON数据格式' + e;
    messageApi?.error(errorMsg);
    throw e;
  }
}

/**
 * 从JSON文件导入工作区数据
 */
export function importWorkspaceFromFile(
  file: File,
  messageApi?: MessageInstance | null,
  gLang?: (key: string) => string
): Promise<WorkspaceData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const jsonData = event.target?.result as string;
        const workspace = upgradeToLatest(jsonData, messageApi);
        resolve(workspace);
        messageApi?.success(gLang?.('projectImportSuccess') || 'Project imported successfully');
      } catch (error) {
        const errorMsg = gLang?.('importProjectFailed') || 'Failed to import file';
        messageApi?.error(errorMsg);
        reject(error);
      }
    };

    reader.onerror = () => {
      const errorMsg = gLang?.('readProjectFileFailed') || 'Failed to read file';
      messageApi?.error(errorMsg);
      reject(new Error(errorMsg));
    };
    
    reader.readAsText(file);
  });
}

/**
 * 保存工作区数据到 localStorage
 */
export function saveWorkspaceToLocalStorage(workspace: WorkspaceData, messageApi?: MessageInstance | null): void {
  try {
    const versionedData: VersionedWorkspaceData = {
      version: CURRENT_WORKSPACE_VERSION,
      data: workspace
    };
    // 使用与 exportWorkspace 相同的 replacer 处理 overlay
    const jsonString = JSON.stringify(versionedData, workspaceReplacer);
    localStorage.setItem('workspace', jsonString);
  } catch (e) {
    const errorMsg = '保存工作区到本地存储失败';
    console.error(errorMsg, e);
    messageApi?.error(errorMsg);
  }
}

/**
 * 从 localStorage 加载工作区数据
 */
export function loadWorkspaceFromLocalStorage(messageApi?: MessageInstance | null): WorkspaceData | null {
  const workspaceStr = localStorage.getItem('workspace');
  if (!workspaceStr) {
    return null;
  }
  
  try {
    return upgradeToLatest(workspaceStr, messageApi);
  } catch (e) {
    const errorMsg = '加载本地工作区失败';
    console.error(errorMsg, e);
    messageApi?.error(errorMsg);
    return null;
  }
}
