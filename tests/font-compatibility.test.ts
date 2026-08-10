import assert from "node:assert/strict";
import test from "node:test";
import opentype from "opentype.js";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import {
    createSpacedTextGeometry,
    normalizeOverlappingShapes,
} from "../src/utils/textGeometry.ts";
import { convertTTFtoFaceTypeJson } from "../src/utils/ttfConverter.ts";

const loader = new FontLoader();

const rectangle = (left: number, bottom: number, right: number, top: number): string => (
    `m ${left} ${bottom} l ${right} ${bottom} l ${right} ${top} ` +
    `l ${left} ${top} l ${left} ${bottom} z `
);

function createTestFont(glyphs: Record<string, { ha: number; o: string }>) {
    return loader.parse({
        glyphs,
        familyName: "Compatibility Test",
        ascender: 1000,
        descender: 0,
        underlinePosition: 0,
        underlineThickness: 0,
        boundingBox: { xMin: 0, xMax: 1200, yMin: 0, yMax: 1000 },
        resolution: 1000,
    });
}

function geometrySize(geometry: ReturnType<typeof createSpacedTextGeometry>) {
    geometry.computeBoundingBox();
    assert.ok(geometry.boundingBox);
    return {
        width: geometry.boundingBox.max.x - geometry.boundingBox.min.x,
        height: geometry.boundingBox.max.y - geometry.boundingBox.min.y,
    };
}

test("overlapping font contours are unioned before 3D extrusion", () => {
    // Reproduces #18: merged Unicode fonts can contain a second, shifted copy
    // of the same outline, which used to create intersecting 3D faces.
    const font = createTestFont({
        A: {
            ha: 1100,
            o: rectangle(0, 0, 900, 1000) + rectangle(100, 0, 1000, 1000),
        },
    });
    const original = font.generateShapes("A", 10);
    const normalized = normalizeOverlappingShapes(original, 1);

    assert.equal(original.length, 2);
    assert.equal(normalized.length, 1);

    const geometry = createSpacedTextGeometry({
        text: "A",
        font,
        size: 10,
        height: 2,
        curveSegments: 1,
        bevelEnabled: false,
        letterSpacing: 0,
        spacingWidth: 0.2,
    });
    const position = geometry.getAttribute("position");

    assert.ok(position.count > 0);
    for (let index = 0; index < position.count; index++) {
        assert.ok(Number.isFinite(position.getX(index)));
        assert.ok(Number.isFinite(position.getY(index)));
        assert.ok(Number.isFinite(position.getZ(index)));
    }
});

test("missing glyphs use one visible placeholder instead of the font question mark", () => {
    const font = createTestFont({
        "?": { ha: 200, o: rectangle(0, 0, 200, 200) },
    });
    const geometry = createSpacedTextGeometry({
        text: "缺",
        font,
        size: 10,
        height: 2,
        curveSegments: 1,
        bevelEnabled: false,
        letterSpacing: 0,
        spacingWidth: 0.2,
    });

    assert.deepEqual(geometrySize(geometry), { width: 6, height: 8 });
    assert.deepEqual(geometry.userData.unsupportedChars, ["缺"]);
});

test("supplementary-plane glyphs are treated as one character", () => {
    const font = createTestFont({
        "😀": { ha: 500, o: rectangle(0, 0, 500, 800) },
    });
    const geometry = createSpacedTextGeometry({
        text: "😀",
        font,
        size: 10,
        height: 2,
        curveSegments: 1,
        bevelEnabled: false,
        letterSpacing: 0,
        spacingWidth: 0.2,
    });

    assert.deepEqual(geometrySize(geometry), { width: 5, height: 8 });
    assert.deepEqual(geometry.userData.unsupportedChars, []);
});

test("TTF conversion preserves supplementary-plane Unicode mappings", async () => {
    const path = new opentype.Path();
    path.moveTo(0, 0);
    path.lineTo(500, 0);
    path.lineTo(500, 800);
    path.lineTo(0, 800);
    path.close();

    const font = new opentype.Font({
        familyName: "Unicode Test",
        styleName: "Regular",
        unitsPerEm: 1000,
        ascender: 800,
        descender: -200,
        glyphs: [
            new opentype.Glyph({ name: ".notdef", advanceWidth: 500, path: new opentype.Path() }),
            new opentype.Glyph({ name: "grinning", unicode: 0x1F600, advanceWidth: 500, path }),
        ],
    });

    const converted = await convertTTFtoFaceTypeJson(font.toArrayBuffer());
    const data = JSON.parse(converted.data) as { glyphs: Record<string, unknown> };

    assert.ok(data.glyphs["😀"]);
    assert.equal(data.glyphs["\uF600"], undefined);
});
