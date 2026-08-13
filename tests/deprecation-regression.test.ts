import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Ant Design components use the current APIs without changing their handlers", async () => {
    const [app, fontSelector, materialPresets] = await Promise.all([
        readSource("src/App.tsx"),
        readSource("src/components/FontSelector.tsx"),
        readSource("src/components/TextSettingsMaterialPresets.tsx"),
    ]);

    assert.doesNotMatch(app, /<Splitter\s+layout=/);
    assert.match(app, /<Splitter orientation=\{isMobile \? 'vertical' : 'horizontal'\}/);

    assert.doesNotMatch(app, /<Dropdown\.Button/);
    assert.match(app, /<Button type="primary" onClick=\{handleScreenshot\}>/);
    assert.match(app, /<Dropdown[\s\S]*onClick: handleOutputOption/);

    assert.doesNotMatch(fontSelector, /dropdownRender=/);
    assert.match(fontSelector, /popupRender=\{menu =>/);

    assert.doesNotMatch(materialPresets, /<Spin\s+tip=/);
    assert.match(materialPresets, /<Spin description=\{gLang\('loadingMaterials'\)\}>/);
});
