module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[project]/src/app/api/items/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/data/mockCharacters.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/env.ts [app-route] (ecmascript)");
;
;
;
async function GET(request) {
    const characterId = request.nextUrl.searchParams.get("characterId");
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isMockDataMode"])()) {
        const character = characterId === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mockCpuCharacter"].id ? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mockCpuCharacter"] : __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mockPlayerCharacter"];
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(character);
    }
    const baseUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getGenerationApiUrl"])();
    if (!baseUrl) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "NEXT_PUBLIC_GENERATION_API_URL is not configured"
        }, {
            status: 500
        });
    }
    const res = await fetch(`${baseUrl}/items?characterId=${characterId}`);
    const data = await res.json();
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(data, {
        status: res.status
    });
}
}),
"[project]/src/data/mockCharacters.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mockCpuCharacter",
    ()=>mockCpuCharacter,
    "mockPlayerCharacter",
    ()=>mockPlayerCharacter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockItems$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/data/mockItems.ts [app-route] (ecmascript)");
;
const mockPlayerCharacter = {
    id: "char-player-1",
    displayName: "You",
    maxHealth: 100,
    inventory: {
        characterId: "char-player-1",
        items: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockItems$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mockItems"]
    }
};
const mockCpuCharacter = {
    id: "char-cpu-1",
    displayName: "Memory Echo",
    maxHealth: 100,
    inventory: {
        characterId: "char-cpu-1",
        items: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockItems$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mockCpuLoadout"]
    }
};
}),
"[project]/src/data/mockItems.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mockCpuLoadout",
    ()=>mockCpuLoadout,
    "mockItems",
    ()=>mockItems
]);
const mockItems = [
    {
        id: "item-guitar",
        name: "Beat-Up Guitar",
        spriteKey: "item_guitar",
        ability: {
            id: "ability-guitar-riff",
            name: "Power Chord",
            damage: 18,
            useCase: "A loud strum that stuns with nostalgia."
        },
        sourceMemory: {
            friendName: "Sam"
        }
    },
    {
        id: "item-hat",
        name: "Faded Baseball Cap",
        spriteKey: "item_hat",
        ability: {
            id: "ability-hat-toss",
            name: "Cap Toss",
            damage: 10,
            useCase: "A quick flung frisbee-style hit."
        },
        sourceMemory: {
            friendName: "Jess"
        }
    },
    {
        id: "item-polaroid",
        name: "Polaroid Camera",
        spriteKey: "item_polaroid",
        ability: {
            id: "ability-polaroid-flash",
            name: "Flashbang",
            damage: 14,
            useCase: "Blinding flash from an old camera.",
            cooldownTurns: 2
        },
        sourceMemory: {
            friendName: "Alex"
        }
    },
    {
        id: "item-skateboard",
        name: "Cracked Skateboard",
        spriteKey: "item_skateboard",
        ability: {
            id: "ability-skateboard-grind",
            name: "Grind Slam",
            damage: 22,
            useCase: "Full-speed board check.",
            cooldownTurns: 3
        },
        sourceMemory: {
            friendName: "Sam"
        }
    },
    {
        id: "item-mug",
        name: "Chipped Coffee Mug",
        spriteKey: "item_mug",
        ability: {
            id: "ability-mug-splash",
            name: "Hot Splash",
            damage: 8,
            useCase: "A splash of lukewarm coffee."
        },
        sourceMemory: {
            friendName: "Riley"
        }
    },
    {
        id: "item-hoodie",
        name: "Old Hoodie",
        spriteKey: "item_hoodie",
        ability: {
            id: "ability-hoodie-whip",
            name: "Sleeve Whip",
            damage: 12,
            useCase: "A whip crack from a worn sleeve."
        },
        sourceMemory: {
            friendName: "Jess"
        }
    }
];
const mockCpuLoadout = [
    {
        id: "item-cpu-trophy",
        name: "Dusty Trophy",
        spriteKey: "item_trophy",
        ability: {
            id: "ability-trophy-bonk",
            name: "Trophy Bonk",
            damage: 16,
            useCase: "A hefty overhead bonk."
        }
    },
    {
        id: "item-cpu-yearbook",
        name: "Torn Yearbook",
        spriteKey: "item_yearbook",
        ability: {
            id: "ability-yearbook-slam",
            name: "Page Slam",
            damage: 12,
            useCase: "A slam of old memories."
        }
    }
];
}),
"[project]/src/lib/env.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getGenerationApiUrl",
    ()=>getGenerationApiUrl,
    "isMockDataMode",
    ()=>isMockDataMode
]);
function isMockDataMode() {
    return process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";
}
function getGenerationApiUrl() {
    return process.env.NEXT_PUBLIC_GENERATION_API_URL;
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1u82d4d._.js.map