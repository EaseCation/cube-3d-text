// src/components/ThreeCanvas.tsx
import { forwardRef, useImperativeHandle, useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { CameraOptions, Text3DData } from "../types/text";
import ThreeScene, { ThreeSceneHandle } from "./ThreeScene.tsx";
import { GLTFExporter, OBJExporter, STLExporter, OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useMessage } from "../contexts/MessageContext.tsx";
import { useLanguage } from "../language.tsx";

// 相机配置常量
const CAMERA_CONSTANTS = {
    referenceFOV: 75,        // 参考视场角
    referenceDistance: 55,   // 参考距离
    frustumSize: 30,         // 正交相机视锥大小
    farMultiplier: 3,        // far 裁剪面倍数
    minFar: 2000,            // 最小 far 裁剪面距离
} as const;

// 判断是否为正交相机
function isOrthographicCamera(options: CameraOptions): boolean {
    return options.cameraType === 'orthographic' || options.fov === 0;
}

// 计算相机距离
function calculateCameraDistance(fov: number, isOrthographic: boolean): number {
    if (isOrthographic) {
        return CAMERA_CONSTANTS.referenceDistance;
    }
    return CAMERA_CONSTANTS.referenceDistance * (CAMERA_CONSTANTS.referenceFOV / fov);
}

function configureCamera(
    camera: THREE.Camera,
    size: { width: number; height: number },
    cameraOptions: CameraOptions
) {
    const { fov, cameraType = 'perspective', zoom = 1, userZoomFactor = 1 } = cameraOptions;

    if (cameraType === 'orthographic' || fov === 0) {
        if (!(camera instanceof THREE.OrthographicCamera)) {
            console.warn("当前相机不是 OrthographicCamera，无法设置正交参数");
            return;
        }

        const aspect = size.width / size.height;
        camera.left = -CAMERA_CONSTANTS.frustumSize * aspect;
        camera.right = CAMERA_CONSTANTS.frustumSize * aspect;
        camera.top = CAMERA_CONSTANTS.frustumSize;
        camera.bottom = -CAMERA_CONSTANTS.frustumSize;
        camera.near = 0.1;
        camera.far = CAMERA_CONSTANTS.minFar;
        camera.zoom = zoom * userZoomFactor;
        camera.updateProjectionMatrix();
        return;
    }

    if (!(camera instanceof THREE.PerspectiveCamera)) {
        console.warn("当前相机不是 PerspectiveCamera，无法设置 fov");
        return;
    }

    camera.fov = fov;
    camera.near = 0.1;

    const currentDistance = camera.position.length();
    const baseDistance = calculateCameraDistance(fov, false);
    const targetDistance = baseDistance / userZoomFactor;
    camera.position.multiplyScalar(targetDistance / currentDistance);
    camera.far = Math.max(
        targetDistance * CAMERA_CONSTANTS.farMultiplier,
        CAMERA_CONSTANTS.minFar
    );
    camera.updateProjectionMatrix();
}

export interface ThreeCanvasHandle {
    takeScreenshot: () => void;
    resetCamera: () => void;
    exportScene: (format: "glb" | "gltf" | "obj" | "stl") => void;
}

interface ThreeCanvasProps {
    cameraOptions: CameraOptions;
    setCameraOptions: (opts: CameraOptions) => void;
    texts: Text3DData[];
    globalFontId: string;
    fontsMap: Record<string, string>;
    globalTextureYOffset: number;
}

// 监听用户手动缩放的组件
const UserZoomTracker: React.FC<{
    cameraOptions: CameraOptions;
    setCameraOptions: (opts: CameraOptions) => void;
    orbitRef: React.RefObject<OrbitControlsImpl | null>;
}> = ({ cameraOptions, setCameraOptions, orbitRef }) => {
    const { camera } = useThree();

    useEffect(() => {
        if (!orbitRef.current) return;

        const controls = orbitRef.current;
        let timeoutId: ReturnType<typeof setTimeout>;

        const handleChange = () => {
            // 清除之前的定时器
            clearTimeout(timeoutId);

            // 延迟更新，避免频繁触发
            timeoutId = setTimeout(() => {
                const { fov, cameraType = 'perspective' } = cameraOptions;

                if (cameraType === 'orthographic' || fov === 0) {
                    // 正交相机 - 通过 zoom 属性缩放
                    if (camera instanceof THREE.OrthographicCamera) {
                        const currentZoom = camera.zoom;
                        const baseZoom = cameraOptions.zoom || 1;
                        const userZoomFactor = currentZoom / baseZoom;

                        if (Math.abs(userZoomFactor - (cameraOptions.userZoomFactor || 1)) > 0.01) {
                            setCameraOptions({
                                ...cameraOptions,
                                userZoomFactor
                            });
                        }
                    }
                } else {
                    // 透视相机 - 通过距离计算缩放因子
                    if (camera instanceof THREE.PerspectiveCamera) {
                        const currentDistance = Math.sqrt(
                            camera.position.x ** 2 +
                            camera.position.y ** 2 +
                            camera.position.z ** 2
                        );

                        const baseDistance = calculateCameraDistance(fov, false);
                        const userZoomFactor = baseDistance / currentDistance;

                        if (Math.abs(userZoomFactor - (cameraOptions.userZoomFactor || 1)) > 0.01) {
                            setCameraOptions({
                                ...cameraOptions,
                                userZoomFactor
                            });
                        }
                    }
                }
            }, 300); // 300ms 延迟，避免频繁更新
        };

        controls.addEventListener('change', handleChange);

        return () => {
            controls.removeEventListener('change', handleChange);
            clearTimeout(timeoutId);
        };
    }, [cameraOptions, setCameraOptions, orbitRef, camera]);

    return null;
};

const CameraController: React.FC<{ cameraOptions: CameraOptions }> = ({ cameraOptions }) => {
    const { camera, size } = useThree();

    useEffect(() => {
        configureCamera(camera, size, cameraOptions);
    }, [cameraOptions, camera, size]);

    return null;
};

interface ScreenshotProps {
    orbitRef: React.RefObject<OrbitControlsImpl | null>;
}

interface ScreenBoundingBox {
    minX: number;
    minY: number;
    width: number;
    height: number;
}

interface CanvasToolsProps extends ScreenshotProps {
    canvasRef: React.ForwardedRef<ThreeCanvasHandle>;
    cameraOptions: CameraOptions;
    setCameraOptions: (opts: CameraOptions) => void;
    computeScreenBoundingBox: (
        scene: THREE.Scene,
        camera: THREE.Camera,
        gl: THREE.WebGLRenderer
    ) => ScreenBoundingBox | null;
    onExportScene: (format: "glb" | "gltf" | "obj" | "stl") => void;
}

const CanvasTools: React.FC<CanvasToolsProps> = ({
    canvasRef,
    orbitRef,
    cameraOptions,
    setCameraOptions,
    computeScreenBoundingBox,
    onExportScene,
}) => {
    const { gl, scene, camera } = useThree();
    const messageApi = useMessage();
    const { gLang } = useLanguage();

    useImperativeHandle(canvasRef, () => ({
        takeScreenshot: () => {
            gl.render(scene, camera);
            const bounding = computeScreenBoundingBox(scene, camera, gl);
            if (!bounding) {
                messageApi?.warning(gLang('sceneEmptyCannotScreenshot'));
                return;
            }

            let { minX, minY, width, height } = bounding;
            const dpr = gl.getPixelRatio();
            minX = Math.floor(minX * dpr);
            minY = Math.floor(minY * dpr);
            width = Math.floor(width * dpr);
            height = Math.floor(height * dpr);

            const fullDataURL = gl.domElement.toDataURL("image/png");
            const croppedCanvas = document.createElement("canvas");
            croppedCanvas.width = width;
            croppedCanvas.height = height;
            const ctx = croppedCanvas.getContext("2d")!;

            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, minX, minY, width, height, 0, 0, width, height);
                const croppedDataURL = croppedCanvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = croppedDataURL;
                link.download = "screenshot.png";
                link.click();
            };
            img.src = fullDataURL;
        },

        resetCamera: () => {
            orbitRef.current?.reset();
            setCameraOptions({
                ...cameraOptions,
                userZoomFactor: 1
            });

            const { fov } = cameraOptions;
            const isOrtho = isOrthographicCamera(cameraOptions);
            const initialDistance = calculateCameraDistance(fov, isOrtho);
            const positionScale = initialDistance / CAMERA_CONSTANTS.referenceDistance;
            camera.position.set(0, -20 * positionScale, 50 * positionScale);
            camera.lookAt(0, 0, 0);
            camera.updateProjectionMatrix();
        },

        exportScene: (format) => {
            gl.render(scene, camera);
            onExportScene(format);
        },
    }));

    return null;
};

const ThreeCanvas = forwardRef<ThreeCanvasHandle, ThreeCanvasProps>((props, ref) => {
    const { texts, cameraOptions, setCameraOptions, globalFontId, fontsMap, globalTextureYOffset } = props;
    const orbitRef = useRef<OrbitControlsImpl>(null);
    const threeSceneRef = useRef<ThreeSceneHandle>(null);
    const messageApi = useMessage();
    const { gLang } = useLanguage();

    // 计算场景 boundingBox 的辅助函数
    const computeScreenBoundingBox = (
        scene: THREE.Scene,
        camera: THREE.Camera,
        gl: THREE.WebGLRenderer
    ) => {
        // 1. 获取场景的包围盒
        const box = new THREE.Box3().setFromObject(scene);

        if (box.isEmpty()) {
            // 如果场景中没有可见对象，直接返回 null
            return null;
        }

        // 2. 将 box 的 8 个角点投影到屏幕
        const corners = [
            new THREE.Vector3(box.min.x, box.min.y, box.min.z),
            new THREE.Vector3(box.min.x, box.min.y, box.max.z),
            new THREE.Vector3(box.min.x, box.max.y, box.min.z),
            new THREE.Vector3(box.min.x, box.max.y, box.max.z),
            new THREE.Vector3(box.max.x, box.min.y, box.min.z),
            new THREE.Vector3(box.max.x, box.min.y, box.max.z),
            new THREE.Vector3(box.max.x, box.max.y, box.min.z),
            new THREE.Vector3(box.max.x, box.max.y, box.max.z),
        ];

        const ndcToScreen = (v: THREE.Vector3, width: number, height: number) => {
            // v 是投影后的 NDC 范围：[-1, 1]
            // 转到屏幕坐标 [0, width], [0, height]
            return {
                x: (v.x + 1) * 0.5 * width,
                y: (-v.y + 1) * 0.5 * height, // 注意 Y 轴翻转
            };
        };

        const { width, height } = gl.getSize(new THREE.Vector2());

        // 投影到屏幕坐标
        const screenPositions = corners.map((corner) => {
            const ndcPos = corner.clone().project(camera); // 世界坐标 => NDC
            return ndcToScreen(ndcPos, width, height);
        });

        const xs = screenPositions.map((p) => p.x);
        const ys = screenPositions.map((p) => p.y);

        const minX = Math.max(Math.floor(Math.min(...xs)), 0);
        const maxX = Math.min(Math.ceil(Math.max(...xs)), width);
        const minY = Math.max(Math.floor(Math.min(...ys)), 0);
        const maxY = Math.min(Math.ceil(Math.max(...ys)), height);

        // 如果越界或无效，也返回 null
        if (maxX <= minX || maxY <= minY) return null;

        return {
            minX,
            minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    };

    // ======== 辅助：下载字符串数据为文件 ========
    function downloadTextData(dataString: string, fileName: string, mimeType = "text/plain") {
        const blob = new Blob([dataString], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    }

    // ======== 导出 glb / gltf ========
    async function exportGLTF(format: "glb" | "gltf") {
        if (!threeSceneRef.current?.groupRef.current) {
            console.warn("场景还没准备好，无法导出。");
            return;
        }

        const exporter = new GLTFExporter();
        const group = threeSceneRef.current.groupRef.current;

        try {
            if (format === "glb") {
                // 二进制 .glb
                const glbBuffer = await exporter.parseAsync(group, {
                    binary: true,
                    embedImages: true,
                });
                // 转 Blob 二进制并下载
                if (glbBuffer instanceof ArrayBuffer) {
                    const blob = new Blob([glbBuffer], { type: "application/octet-stream" });
                    const url = URL.createObjectURL(blob);

                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "scene.glb";
                    link.click();
                    URL.revokeObjectURL(url);
                } else {
                    console.error("导出的 glbBuffer 不是 ArrayBuffer 类型");
                }
            } else {
                // 文本 .gltf
                const gltfJson = await exporter.parseAsync(group, {
                    binary: false,
                    embedImages: true,
                });
                // gltfJson 是一个 JSON 对象，转字符串
                const dataStr = JSON.stringify(gltfJson, null, 2);
                downloadTextData(dataStr, "scene.gltf", "application/json");
            }
        } catch (err) {
            console.error(`导出 ${format} 失败:`, err);
            messageApi?.error(gLang('exportFailed'));
        }
    }

    // ======== 导出 .obj ========
    function exportOBJ() {
        if (!threeSceneRef.current?.groupRef.current) {
            console.warn("场景还没准备好，无法导出。");
            return;
        }

        const exporter = new OBJExporter();
        const group = threeSceneRef.current.groupRef.current;
        try {
            // 注意：OBJExporter.parse 返回的是字符串
            const objString = exporter.parse(group);
            downloadTextData(objString, "scene.obj", "text/plain");
        } catch (err) {
            console.error("导出 OBJ 失败:", err);
            messageApi?.error(gLang('exportOBJFailed'));
        }
    }

    // ======== 导出 .stl ========
    function exportSTL() {
        if (!threeSceneRef.current?.groupRef.current) {
            console.warn("场景还没准备好，无法导出。");
            return;
        }

        const exporter = new STLExporter();
        const group = threeSceneRef.current.groupRef.current;
        try {
            /**
             * STLExporter.parse 支持两种：
             *   1) parse(scene, { binary: false }) => 返回 ASCII STL 字符串
             *   2) parse(scene, { binary: true }) => 返回 ArrayBuffer (二进制)
             * 这里示例用 ASCII 文本 STL
             */
            const stlString = exporter.parse(group, { binary: false });
            downloadTextData(stlString, "scene.stl", "model/stl");
        } catch (err) {
            console.error("导出 STL 失败:", err);
            messageApi?.error(gLang('exportSTLFailed'));
        }
    }

    const isOrthographic = isOrthographicCamera(cameraOptions);

    // 计算初始相机位置 - 根据 FOV 调整距离
    const fov = cameraOptions.fov ?? CAMERA_CONSTANTS.referenceFOV; // 使用 ?? 避免 0 被当作 falsy
    const initialDistance = calculateCameraDistance(fov, isOrthographic);
    const initialPosition: [number, number, number] = [
        0,
        -20 * (initialDistance / CAMERA_CONSTANTS.referenceDistance),
        50 * (initialDistance / CAMERA_CONSTANTS.referenceDistance)
    ];

    // 动态计算 far 裁剪面
    const initialFar = isOrthographic
        ? CAMERA_CONSTANTS.minFar
        : Math.max(initialDistance * CAMERA_CONSTANTS.farMultiplier, CAMERA_CONSTANTS.minFar);

    const handleExportScene = (format: "glb" | "gltf" | "obj" | "stl") => {
        switch (format) {
            case "glb":
            case "gltf":
                void exportGLTF(format);
                break;
            case "obj":
                exportOBJ();
                break;
            case "stl":
                exportSTL();
                break;
        }
    };

    return (
        <Canvas
            key={isOrthographic ? 'orthographic' : 'perspective'} // 强制重建 Canvas 以切换相机类型
            // 如果要保证截图含透明背景 + 保留像素，通常要加 preserveDrawingBuffer: true
            orthographic={isOrthographic}
            camera={
                isOrthographic
                    ? {
                        position: initialPosition,
                        zoom: cameraOptions.zoom || 1,
                        near: 0.1,
                        far: CAMERA_CONSTANTS.minFar
                    }
                    : {
                        position: initialPosition,
                        fov: cameraOptions.fov,
                        near: 0.1,
                        far: initialFar
                    }
            }
            gl={{
                alpha: true,             // 允许透明背景
                preserveDrawingBuffer: true, // 截图后可读取
                toneMapping: THREE.NoToneMapping,
                toneMappingExposure: 1,
            }}
            style={{ background: "transparent" }}
        >
            <CanvasTools
                canvasRef={ref}
                orbitRef={orbitRef}
                cameraOptions={cameraOptions}
                setCameraOptions={setCameraOptions}
                computeScreenBoundingBox={computeScreenBoundingBox}
                onExportScene={handleExportScene}
            />
            <CameraController cameraOptions={cameraOptions} />
            <UserZoomTracker
                cameraOptions={cameraOptions}
                setCameraOptions={setCameraOptions}
                orbitRef={orbitRef}
            />
            <ThreeScene
                ref={threeSceneRef}
                texts={texts}
                globalFontId={globalFontId}
                fontsMap={fontsMap}
                globalTextureYOffset={globalTextureYOffset}
            />
            <OrbitControls ref={orbitRef} enableDamping={false} dampingFactor={0} />
        </Canvas>
    );
});

export default ThreeCanvas;
