import * as THREE from "three";

function fittedCamera(group: THREE.Group, width: number, height: number, padding: number): THREE.PerspectiveCamera {
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) throw new Error("The title has no visible geometry");
  const center = box.getCenter(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
  const direction = new THREE.Vector3(0, -20, 50).normalize();
  camera.position.copy(center).add(direction);
  camera.lookAt(center);
  camera.updateMatrixWorld();

  const inverseRotation = camera.quaternion.clone().invert();
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (1 - padding * 2);
  const tanX = tanY * camera.aspect;
  let distance = 1;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const corner = new THREE.Vector3(x, y, z).sub(center).applyQuaternion(inverseRotation);
        distance = Math.max(distance, corner.z + Math.abs(corner.x) / tanX, corner.z + Math.abs(corner.y) / tanY);
      }
    }
  }
  camera.position.copy(center).addScaledVector(direction, distance * 1.02);
  camera.far = Math.max(2000, distance + box.getSize(new THREE.Vector3()).length() * 2);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

export async function renderTitlePng(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  group: THREE.Group,
  width: number,
  height: number,
  padding: number,
): Promise<Blob> {
  const camera = fittedCamera(group, width, height, padding);
  const target = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
  });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const previousTarget = renderer.getRenderTarget();
  const previousViewport = renderer.getViewport(new THREE.Vector4());
  const previousScissor = renderer.getScissor(new THREE.Vector4());
  const previousScissorTest = renderer.getScissorTest();
  const previousClearColor = renderer.getClearColor(new THREE.Color());
  const previousClearAlpha = renderer.getClearAlpha();
  const previousAutoClear = renderer.autoClear;

  try {
    renderer.setRenderTarget(target);
    renderer.setViewport(0, 0, width, height);
    renderer.setScissorTest(false);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.clear(true, true, true);
    renderer.render(scene, camera);

    const pixels = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    const flipped = new Uint8ClampedArray(pixels.length);
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
      flipped.set(pixels.subarray(y * rowBytes, (y + 1) * rowBytes), (height - y - 1) * rowBytes);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create a PNG canvas");
    context.putImageData(new ImageData(flipped, width, height), 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG encoding failed")), "image/png");
    });
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.setViewport(previousViewport);
    renderer.setScissor(previousScissor);
    renderer.setScissorTest(previousScissorTest);
    renderer.setClearColor(previousClearColor, previousClearAlpha);
    renderer.autoClear = previousAutoClear;
    target.dispose();
  }
}
