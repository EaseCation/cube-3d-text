import opentype from "opentype.js";

interface ConvertOptions {
    reverseTypeface?: boolean;
    restrictCharacters?: boolean;
    restrictCharacterSet?: string; // "0-255" 或者 "abcABC"
    outputAsJson?: boolean;        // 是否输出 JSON，还是带 `_typeface_js.loadFace(...)` 的 JS
}

/**
 * 将 TTF 文件解析并转换为 facetype.js 格式的对象，最后序列化为字符串
 * @param arrayBuffer TTF流
 * @param options 一些可选的转换配置
 * @returns Promise<string> (返回 JSON 或 JS 字符串)
 */
export async function convertTTFtoFaceTypeJson(
    arrayBuffer: ArrayBuffer,
    options: ConvertOptions = {}
): Promise<string> {
    const {
        reverseTypeface = false,
        restrictCharacters = false,
        restrictCharacterSet = "",
        outputAsJson = true,
    } = options;

    return new Promise((resolve, reject) => {
        try {
            const font = opentype.parse(arrayBuffer);

            // 调用核心的 convert 方法
            const resultString = convert(font, {
                reverseTypeface,
                restrictCharacters,
                restrictCharacterSet,
                outputAsJson,
            });
            resolve(resultString);
        } catch (err) {
            reject(err);
        }

    });
}

// 核心转换逻辑
function convert(
    font: opentype.Font,
    {
        reverseTypeface,
        restrictCharacters,
        restrictCharacterSet,
    }: ConvertOptions
) {
    const scale = (1000 * 100) / ((font.unitsPerEm || 2048) * 72);
    const result: any = {};
    result.glyphs = {};

    // 限制字符
    const restriction = {
        range: null as [number, number] | null,
        set: null as string | null,
    };
    if (restrictCharacters && restrictCharacterSet) {
        // 如果包含 "-"，试图解析为一个范围
        if (restrictCharacterSet.includes("-")) {
            const [start, end] = restrictCharacterSet.split("-");
            if (!isNaN(Number(start)) && !isNaN(Number(end))) {
                restriction.range = [parseInt(start), parseInt(end)];
            }
        }
        // 否则就把它视为一个字符集合
        if (!restriction.range) {
            restriction.set = restrictCharacterSet;
        }
    }

    const numGlyphs = font.glyphs.length; // glyph 总数
    for (let i = 0; i < numGlyphs; i++) {
        const glyph = font.glyphs.get(i);

        // 收集所有 unicode
        const unicodes: number[] = [];
        if (glyph.unicode !== undefined) {
            unicodes.push(glyph.unicode);
        }
        if (glyph.unicodes?.length) {
            glyph.unicodes.forEach((u: number) => {
                if (!unicodes.includes(u)) {
                    unicodes.push(u);
                }
            });
        }

        // 逐个 unicode 做转换
        unicodes.forEach((unicode) => {
            const glyphCharacter = String.fromCharCode(unicode);
            let needToExport = true;

            // 判断是否需要导出
            if (restriction.range) {
                needToExport =
                    unicode >= restriction.range[0] && unicode <= restriction.range[1];
            } else if (restriction.set) {
                needToExport = restriction.set.indexOf(glyphCharacter) !== -1;
            }

            if (needToExport) {
                const token: any = {};
                token.ha = Math.round((glyph.advanceWidth ?? 0) * scale);
                token.x_min = Math.round((glyph.xMin ?? 0) * scale);
                token.x_max = Math.round((glyph.xMax ?? 0) * scale);
                token.o = "";

                // 如果需要反转
                const commands = reverseTypeface
                    ? reverseCommands(glyph.path.commands)
                    : glyph.path.commands;

                commands.forEach((command: any) => {
                    const cmdType = command.type.toLowerCase() === "c" ? "b" : command.type.toLowerCase();
                    token.o += cmdType + " ";
                    if (command.x !== undefined && command.y !== undefined) {
                        token.o += Math.round(command.x * scale) + " ";
                        token.o += Math.round(command.y * scale) + " ";
                    }
                    if (command.x1 !== undefined && command.y1 !== undefined) {
                        token.o += Math.round(command.x1 * scale) + " ";
                        token.o += Math.round(command.y1 * scale) + " ";
                    }
                    if (command.x2 !== undefined && command.y2 !== undefined) {
                        token.o += Math.round(command.x2 * scale) + " ";
                        token.o += Math.round(command.y2 * scale) + " ";
                    }
                });

                result.glyphs[glyphCharacter] = token;
            }
        });
    }

    result.familyName = font.names.fontFamily;
    result.ascender = Math.round(font.ascender * scale);
    result.descender = Math.round(font.descender * scale);
    result.underlinePosition = Math.round(font.tables.post.underlinePosition * scale);
    result.underlineThickness = Math.round(font.tables.post.underlineThickness * scale);
    result.boundingBox = {
        yMin: Math.round(font.tables.head.yMin * scale),
        xMin: Math.round(font.tables.head.xMin * scale),
        yMax: Math.round(font.tables.head.yMax * scale),
        xMax: Math.round(font.tables.head.xMax * scale),
    };
    result.resolution = 1000;
    result.original_font_information = font.tables.name;

    if (font.names.fontSubfamily?.[0]?.toLowerCase().includes("bold")) {
        result.cssFontWeight = "bold";
    } else {
        result.cssFontWeight = "normal";
    }

    if (font.names.fontSubfamily?.[0]?.toLowerCase().includes("italic")) {
        result.cssFontStyle = "italic";
    } else {
        result.cssFontStyle = "normal";
    }

    return JSON.stringify(result);
}

/**
 * 反转 commands
 */
function reverseCommands(commands: opentype.PathCommand[]) {
    const paths: opentype.PathCommand[][] = [];
    let path: opentype.PathCommand[] = [];

    // Separate commands into paths
    commands.forEach((c) => {
        if (c.type.toLowerCase() === "m") {
            path = [c];
            paths.push(path);
        } else if (c.type.toLowerCase() !== "z") {
            path.push(c);
        }
    });

    const reversed: opentype.PathCommand[] = [];

    paths.forEach((p) => {
        const last = p[p.length - 1];
        if ("x" in last && "y" in last) {
            reversed.push({
                type: "M",
                x: last.x,
                y: last.y,
            } as opentype.PathCommand);
        }

        for (let i = p.length - 1; i > 0; i--) {
            const command = p[i];
            const newCmd: any = { type: command.type };

            // Check for cubic and quadratic curves
            if (
                "x2" in command &&
                "y2" in command &&
                "x1" in command &&
                "y1" in command
            ) {
                newCmd.x1 = command.x2;
                newCmd.y1 = command.y2;
                newCmd.x2 = command.x1;
                newCmd.y2 = command.y1;
            } else if ("x1" in command && "y1" in command) {
                newCmd.x1 = command.x1;
                newCmd.y1 = command.y1;
            }

            // Check for x and y
            const last = p[i - 1];
            if ("x" in command && "y" in command && "x" in last && "y" in last) {
                newCmd.x = last.x;
                newCmd.y = last.y;
            }

            reversed.push(newCmd);
        }
    });

    return reversed;
}