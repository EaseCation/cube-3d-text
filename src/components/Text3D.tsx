import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextOptions } from "../types/text";
import {
    createCubeMaterial,
    createMeshBasicMaterialFromOption
} from "../utils/textMaterial.ts";
import { createSpacedTextGeometry, createSpacedTextGeometryOutline } from "../utils/textGeometry.ts";
import { Html } from "@react-three/drei";
import OverlayHelper from "./OverlayHelper.tsx";
import { useMessage } from "../contexts/MessageContext.tsx";
import { useLanguage } from "../language.tsx";

interface Text3DProps {
    content: string;
    opts: TextOptions;
    font: Font;
    globalTextureYOffset: number;
    position: [number, number, number];
    rotation: [number, number, number];
    suppressUnsupportedWarning?: boolean;
}

const Text3D = forwardRef<THREE.Group, Text3DProps>(({
                                                         content,
                                                         opts,
                                                         font,
                                                         globalTextureYOffset,
                                                         position,
                                                         rotation,
                                                         suppressUnsupportedWarning = false,
                                                     }, ref) => {

    const messageApi = useMessage();
    const { gLang } = useLanguage();

    // 创建带有字间距的文字几何体
    const geometry = useMemo(() => {
        if (!content) {
            return new THREE.BufferGeometry();
        }
        const geo = createSpacedTextGeometry({
            text: content,
            font,
            size: opts.size,
            height: opts.depth,
            curveSegments: 12,
            bevelEnabled: false,
            letterSpacing: opts.letterSpacing,
            spacingWidth: opts.spacingWidth
        });
        return geo;
    }, [content, opts.size, opts.depth, font, opts.letterSpacing, opts.spacingWidth]);

    const unsupportedChars = geometry.userData.unsupportedChars as string[] | undefined;
    const unsupportedCharsKey = unsupportedChars?.join("") ?? "";
    const lastUnsupportedWarning = useRef("");

    useEffect(() => {
        if (!unsupportedCharsKey || suppressUnsupportedWarning) {
            lastUnsupportedWarning.current = "";
            return;
        }
        if (lastUnsupportedWarning.current === unsupportedCharsKey) return;
        lastUnsupportedWarning.current = unsupportedCharsKey;
        messageApi?.warning({
            key: `unsupported-glyphs-${unsupportedCharsKey}`,
            content: gLang("customFont.unsupportedChars", { chars: unsupportedCharsKey }),
            duration: 5,
        });
    }, [gLang, messageApi, suppressUnsupportedWarning, unsupportedCharsKey]);

    // 获取文字几何体的高度
    const boundingBox = useMemo(() => {
        const box = new THREE.Box3();
        const mesh = new THREE.Mesh(geometry);
        return box.setFromObject(mesh);
    }, [geometry]);

    // 创建文字材质
    const textMaterial = useMemo(() => 
        createCubeMaterial(
            opts.materials,
            boundingBox,
            globalTextureYOffset
        ),
        [opts.materials, boundingBox, globalTextureYOffset]);

    const height = boundingBox.max.y - boundingBox.min.y;

    const geometryOutline = useMemo(() => {
        if (!content) {
            return new THREE.BufferGeometry();
        }
        return createSpacedTextGeometryOutline({
            text: content,
            font,
            size: opts.size,
            height: opts.depth,
            outlineWidth: opts.outlineWidth * (height / 10),
            curveSegments: 12,
            bevelEnabled: false,
            letterSpacing: opts.letterSpacing,
            spacingWidth: opts.spacingWidth
        });
    }, [content, opts.size, opts.depth, font, opts.letterSpacing, opts.spacingWidth, opts.outlineWidth, height]);

    const outlineMaterial = useMemo(
        () => createMeshBasicMaterialFromOption(opts.materials.outline, false, [1, 1], [1, 1], [0, 0], { side: THREE.BackSide, depthTest: false }),
        //createLinePointMaterial(),
        [opts.materials]
    );

    // 分组几何体
    useMemo(() => {
        const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute;
        const normalAttribute = geometry.getAttribute('normal') as THREE.BufferAttribute;

        if (!positionAttribute) {
            return;
        }

        const groups = [];
        for (let i = 0; i < positionAttribute.count; i += 3) {
            const normal = new THREE.Vector3(
                normalAttribute.getX(i),
                normalAttribute.getY(i),
                normalAttribute.getZ(i)
            ).normalize();

            let groupIndex = 4; // 默认前后面

            // 根据法线方向分配组索引
            if (Math.abs(normal.x) > 0.8) {
                groupIndex = normal.x > 0 ? 0 : 1; // 右面或左面
            } else if (Math.abs(normal.y) > 0.5) {
                groupIndex = normal.y > 0 ? 2 : 3; // 上面或下面
            }

            groups.push({
                start: i,
                count: 3,
                materialIndex: groupIndex
            });
        }

        // 清现有组
        while (geometry.groups.length > 0) {
            geometry.groups.pop();
        }

        // 添加新组
        groups.forEach(group => geometry.addGroup(group.start, group.count, group.materialIndex));

    }, [geometry]);

    // 主网格
    const mainMesh = useMemo(() => {
        const mesh = new THREE.Mesh(geometry, textMaterial);
        mesh.renderOrder = 2;
        return mesh;
    }, [geometry, textMaterial]);

    // 描边网格
    const outlineMesh = useMemo(() => {
        const mesh = new THREE.Mesh(geometryOutline, outlineMaterial);
        mesh.renderOrder = 1;
        return mesh;
    }, [geometryOutline, outlineMaterial]);

    const [overlayMaterial, setOverlayMaterial] = useState<THREE.Material[]>();

    // 创建一个组包含主网格
    const group = useMemo(() => {
        const grp = new THREE.Group();
        grp.add(mainMesh);
        // overlayMesh，用于实现overlay的材质
        if (content.length > 0 && opts.overlay) {
            const overlayMesh = mainMesh.clone();
            overlayMesh.geometry = mainMesh.geometry.clone();
            if (overlayMaterial) overlayMesh.material = overlayMaterial;
            // assignFrontUV(overlayMesh.geometry as THREE.BufferGeometry);
            overlayMesh.renderOrder = 3;
            grp.add(overlayMesh);
        }
        grp.add(outlineMesh);
        grp.position.set(...position);
        grp.rotation.set(...rotation);
        return grp;
    }, [content.length, mainMesh, opts.overlay, outlineMesh, overlayMaterial, position, rotation]);

    return <>
        <primitive object={group} ref={ref} />
        {opts.overlay && (
            <Html style={{ display: "none" }}>
                <OverlayHelper
                    boundingBox={boundingBox}
                    content={content}
                    opts={opts}
                    font={font}
                    setOverlayMaterial={setOverlayMaterial}
                />
            </Html>
        )}
    </>;
});

export default Text3D;
