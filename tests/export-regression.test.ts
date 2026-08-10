import assert from "node:assert/strict";
import test from "node:test";
import { materialGradientLightBlue } from "../src/presetMaterials.ts";
import type { WorkspaceData } from "../src/types/text.d.ts";
import {
    CURRENT_WORKSPACE_VERSION,
    upgradeToLatest,
    workspaceReplacer
} from "../src/utils/workspaceIO.ts";
import {
    deserializeMaterial,
    isSerializedMaterial,
    serializeMaterial
} from "../src/utils/materialSerializer.ts";

const workspace: WorkspaceData = {
    fontId: "Fusion Pixel 10px",
    texts: [{
        content: "Export regression",
        opts: {
            size: 10,
            depth: 5,
            x: 0,
            y: 8,
            z: 0,
            rotY: 0,
            rotX: 0,
            rotZ: 0,
            materials: materialGradientLightBlue,
            outlineWidth: 0.4,
            letterSpacing: 1,
            spacingWidth: 0.2
        },
        position: [0, 0, 0],
        rotation: [0, 0, 0]
    }]
};

test("workspace JSON remains theme-independent and round-trips unchanged", () => {
    const json = JSON.stringify({
        version: CURRENT_WORKSPACE_VERSION,
        data: workspace
    }, workspaceReplacer);

    assert.doesNotMatch(json, /theme|dark|light/i);
    assert.deepEqual(upgradeToLatest(json), workspace);
});

test("material export remains theme-independent and round-trips unchanged", async () => {
    const serialized = await serializeMaterial(materialGradientLightBlue);

    assert.ok(isSerializedMaterial(serialized));
    assert.doesNotMatch(JSON.stringify(serialized), /themeMode|data-theme/);
    assert.deepEqual(deserializeMaterial(serialized), materialGradientLightBlue);
    assert.notEqual(serialized.material, materialGradientLightBlue);
});

test("embedded image materials remain byte-for-byte stable during serialization", async () => {
    const imageData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
    const imageMaterial = structuredClone(materialGradientLightBlue);
    imageMaterial.front = {
        mode: "image",
        image: imageData,
        repeatX: 0.1,
        repeatY: 0.1,
        offsetX: 0,
        offsetY: 0
    };

    const serialized = await serializeMaterial(imageMaterial);

    assert.equal(serialized.material.front.mode, "image");
    if (serialized.material.front.mode === "image") {
        assert.equal(serialized.material.front.image, imageData);
    }
    assert.deepEqual(deserializeMaterial(serialized), imageMaterial);
});
