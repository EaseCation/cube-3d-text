import * as THREE from 'three';
import ClipperLib from 'clipper-lib';

export const OFFSET_SCALE = 1000; // 为了提高精度，进行坐标缩放

/**
 * 对 THREE.Shape 进行膨胀操作
 * @param shape THREE.Shape 对象
 * @param offset 膨胀量，正值向外膨胀，负值向内收缩
 * @returns 膨胀后的 THREE.Shape 数组
 */
export const offsetShape = (shape: THREE.Shape, offset: number): THREE.Shape[] => {
    // 1. 转换主轮廓
    const clipperPaths: ClipperLib.Paths = [];
    const mainPath: ClipperLib.Path = shape.getPoints().map(p => ({
        X: Math.round(p.x * OFFSET_SCALE),
        Y: Math.round(p.y * OFFSET_SCALE)
    }));
    clipperPaths.push(mainPath);

    // 2. 转换所有孔洞
    if (shape.holes && shape.holes.length > 0) {
        shape.holes.forEach(hole => {
            const holePath: ClipperLib.Path = hole.getPoints().map(p => ({
                X: Math.round(p.x * OFFSET_SCALE),
                Y: Math.round(p.y * OFFSET_SCALE)
            }));
            clipperPaths.push(holePath);
        });
    }

    // 3. 执行偏移操作
    const co = new ClipperLib.ClipperOffset();
    co.AddPaths(clipperPaths, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);

    const solution: ClipperLib.Paths = [];
    co.Execute(solution, offset * OFFSET_SCALE);

    // 4. 将结果转回 THREE.Shape
    return solution.map(path => {
        const points = path.map(p => new THREE.Vector2(p.X / OFFSET_SCALE, p.Y / OFFSET_SCALE));
        return new THREE.Shape(points);
    });
};
