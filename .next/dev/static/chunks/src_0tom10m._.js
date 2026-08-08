(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/data/fetchItems.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "fetchCharacter",
    ()=>fetchCharacter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/env.ts [app-client] (ecmascript)");
;
async function fetchCharacter(characterId) {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isMockDataMode"])()) {
        const res = await fetch(`/api/items?characterId=${characterId}`);
        if (!res.ok) {
            throw new Error(`Failed to fetch mock character: ${res.status}`);
        }
        return res.json();
    }
    const baseUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getGenerationApiUrl"])();
    const res = await fetch(`${baseUrl}/items?characterId=${characterId}`);
    if (!res.ok) {
        throw new Error(`Failed to fetch character from generation API: ${res.status}`);
    }
    return res.json();
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/data/mockCharacters.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "mockCpuCharacter",
    ()=>mockCpuCharacter,
    "mockPlayerCharacter",
    ()=>mockPlayerCharacter
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockItems$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/data/mockItems.ts [app-client] (ecmascript)");
;
const mockPlayerCharacter = {
    id: "char-player-1",
    displayName: "You",
    maxHealth: 100,
    inventory: {
        characterId: "char-player-1",
        items: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockItems$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockItems"]
    }
};
const mockCpuCharacter = {
    id: "char-cpu-1",
    displayName: "Memory Echo",
    maxHealth: 100,
    inventory: {
        characterId: "char-cpu-1",
        items: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockItems$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockCpuLoadout"]
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/data/mockItems.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/engine/battleEngine.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyAction",
    ()=>applyAction,
    "createBattle",
    ()=>createBattle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/engine/rules.ts [app-client] (ecmascript)");
;
function buildParticipant(slot, character, selectedItemIds) {
    return {
        slot,
        characterId: character.id,
        maxHealth: character.maxHealth ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_MAX_HEALTH"],
        currentHealth: character.maxHealth ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_MAX_HEALTH"],
        selectedItemIds: [
            ...selectedItemIds
        ],
        cooldowns: {}
    };
}
function createBattle(battleId, playerCharacter, opponentCharacter, selectedItems) {
    return {
        battleId,
        status: "in_progress",
        turnNumber: 1,
        activeSlot: "player",
        participants: {
            player: buildParticipant("player", playerCharacter, selectedItems.player),
            opponent: buildParticipant("opponent", opponentCharacter, selectedItems.opponent)
        },
        log: []
    };
}
function findItem(character, itemId) {
    return character?.inventory.items.find((item)=>item.id === itemId);
}
function applyAction(state, action, context) {
    if (state.status !== "in_progress") {
        return {
            state,
            events: [
                {
                    type: "INVALID_ACTION",
                    payload: {
                        reason: "battle_over"
                    }
                }
            ]
        };
    }
    if (action.actorSlot !== state.activeSlot) {
        return {
            state,
            events: [
                {
                    type: "INVALID_ACTION",
                    payload: {
                        reason: "not_your_turn"
                    }
                }
            ]
        };
    }
    if (action.type === "FORFEIT") {
        const winner = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["otherSlot"])(action.actorSlot);
        const nextState = {
            ...state,
            status: winner === "player" ? "won" : "lost"
        };
        return {
            state: nextState,
            events: [
                {
                    type: "BATTLE_ENDED",
                    payload: {
                        winner,
                        reason: "forfeit"
                    }
                }
            ]
        };
    }
    // USE_ITEM
    const actor = state.participants[action.actorSlot];
    const target = state.participants[(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["otherSlot"])(action.actorSlot)];
    const itemId = action.itemId;
    if (!itemId || !actor.selectedItemIds.includes(itemId)) {
        return {
            state,
            events: [
                {
                    type: "INVALID_ACTION",
                    payload: {
                        reason: "item_not_owned"
                    }
                }
            ]
        };
    }
    const actorCharacter = action.actorSlot === "player" ? context.playerCharacter : context.opponentCharacter;
    const item = findItem(actorCharacter, itemId);
    if (!item) {
        return {
            state,
            events: [
                {
                    type: "INVALID_ACTION",
                    payload: {
                        reason: "item_not_found"
                    }
                }
            ]
        };
    }
    const decrementedCooldowns = {};
    for (const [id, turnsLeft] of Object.entries(actor.cooldowns)){
        const next = turnsLeft - 1;
        if (next > 0) decrementedCooldowns[id] = next;
    }
    const remainingCooldown = decrementedCooldowns[itemId] ?? 0;
    if (remainingCooldown > 0) {
        return {
            state,
            events: [
                {
                    type: "ITEM_ON_COOLDOWN",
                    payload: {
                        itemId,
                        remainingCooldown
                    }
                }
            ]
        };
    }
    const damageDealt = item.ability.damage;
    const targetHealthAfter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clampHealth"])(target.currentHealth - damageDealt, target.maxHealth);
    const nextActor = {
        ...actor,
        cooldowns: {
            ...decrementedCooldowns,
            ...item.ability.cooldownTurns ? {
                [itemId]: item.ability.cooldownTurns
            } : {}
        }
    };
    const nextTarget = {
        ...target,
        currentHealth: targetHealthAfter
    };
    const events = [
        {
            type: "DAMAGE_DEALT",
            payload: {
                actorSlot: action.actorSlot,
                targetSlot: target.slot,
                itemId,
                damageDealt,
                targetHealthAfter
            }
        }
    ];
    const battleEnded = targetHealthAfter <= 0;
    const nextStatus = battleEnded ? action.actorSlot === "player" ? "won" : "lost" : "in_progress";
    if (battleEnded) {
        events.push({
            type: "BATTLE_ENDED",
            payload: {
                winner: action.actorSlot,
                reason: "knockout"
            }
        });
    }
    const nextState = {
        ...state,
        status: nextStatus,
        turnNumber: state.turnNumber + 1,
        activeSlot: battleEnded ? state.activeSlot : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["otherSlot"])(state.activeSlot),
        participants: {
            ...state.participants,
            [action.actorSlot]: nextActor,
            [target.slot]: nextTarget
        },
        log: [
            ...state.log,
            {
                turn: state.turnNumber,
                actorSlot: action.actorSlot,
                itemId,
                damageDealt,
                targetHealthAfter
            }
        ]
    };
    return {
        state: nextState,
        events
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/engine/localBattleClient.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "startBattle",
    ()=>startBattle,
    "submitAction",
    ()=>submitAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$battleEngine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/engine/battleEngine.ts [app-client] (ecmascript)");
;
function startBattle(battleId, playerCharacter, opponentCharacter, selectedItems) {
    return Promise.resolve((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$battleEngine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createBattle"])(battleId, playerCharacter, opponentCharacter, selectedItems));
}
function submitAction(state, action, context) {
    return Promise.resolve((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$battleEngine$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["applyAction"])(state, action, context));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/engine/rules.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DEFAULT_MAX_HEALTH",
    ()=>DEFAULT_MAX_HEALTH,
    "MAX_ITEMS_PER_BATTLE",
    ()=>MAX_ITEMS_PER_BATTLE,
    "clampHealth",
    ()=>clampHealth,
    "otherSlot",
    ()=>otherSlot
]);
const DEFAULT_MAX_HEALTH = 100;
const MAX_ITEMS_PER_BATTLE = 4;
function otherSlot(slot) {
    return slot === "player" ? "opponent" : "player";
}
function clampHealth(health, maxHealth) {
    return Math.max(0, Math.min(maxHealth, health));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/assetKeys.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ARENA_BACKGROUND_KEY",
    ()=>ARENA_BACKGROUND_KEY,
    "OPPONENT_SPRITE_KEY",
    ()=>OPPONENT_SPRITE_KEY,
    "PLAYER_SPRITE_KEY",
    ()=>PLAYER_SPRITE_KEY,
    "fallbackColorForKey",
    ()=>fallbackColorForKey,
    "resolveSpriteKey",
    ()=>resolveSpriteKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
;
const ARENA_BACKGROUND_KEY = "arena_bg_universal";
const PLAYER_SPRITE_KEY = "character_player";
const OPPONENT_SPRITE_KEY = "character_opponent";
function hashStringToHue(value) {
    let hash = 0;
    for(let i = 0; i < value.length; i++){
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 360;
}
function resolveSpriteKey(key) {
    return key;
}
function fallbackColorForKey(key) {
    const hue = hashStringToHue(key);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Display"].Color.HSLToColor(hue / 360, 0.55, 0.5).color;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createGameConfig",
    ()=>createGameConfig
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$scenes$2f$BootScene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/scenes/BootScene.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$scenes$2f$InventoryScene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/scenes/InventoryScene.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$scenes$2f$ArenaScene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/scenes/ArenaScene.ts [app-client] (ecmascript)");
;
;
;
;
function createGameConfig(parent) {
    return {
        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AUTO"],
        width: 960,
        height: 600,
        parent,
        backgroundColor: "#111111",
        scene: [
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$scenes$2f$BootScene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BootScene"],
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$scenes$2f$InventoryScene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["InventoryScene"],
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$scenes$2f$ArenaScene$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ArenaScene"]
        ]
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/eventBus.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "eventBus",
    ()=>eventBus
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
;
class TypedEventBus extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Events"].EventEmitter {
    emitTyped(event, payload) {
        this.emit(event, payload);
    }
    onTyped(event, callback) {
        this.on(event, callback);
    }
    offTyped(event, callback) {
        this.off(event, callback);
    }
}
const eventBus = new TypedEventBus();
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/objects/CharacterSprite.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CharacterSprite",
    ()=>CharacterSprite
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$assetKeys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/assetKeys.ts [app-client] (ecmascript)");
;
;
class CharacterSprite extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameObjects"].Container {
    rect;
    constructor(scene, x, y, spriteKey, displayName){
        super(scene, x, y);
        this.rect = scene.add.rectangle(0, 0, 96, 96, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$assetKeys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fallbackColorForKey"])(spriteKey));
        const label = scene.add.text(0, 60, displayName, {
            fontSize: "14px",
            color: "#ffffff"
        }).setOrigin(0.5, 0);
        this.add([
            this.rect,
            label
        ]);
        scene.add.existing(this);
    }
    playHitFlash() {
        this.scene.tweens.add({
            targets: this.rect,
            alpha: 0.2,
            duration: 80,
            yoyo: true,
            repeat: 2
        });
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/objects/HealthBar.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HealthBar",
    ()=>HealthBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
;
class HealthBar extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameObjects"].Container {
    barWidth;
    barHeight;
    background;
    fill;
    label;
    maxHealth;
    constructor(scene, x, y, width, height, maxHealth, name){
        super(scene, x, y);
        this.barWidth = width;
        this.barHeight = height;
        this.maxHealth = maxHealth;
        this.background = scene.add.rectangle(0, 0, width, height, 0x222222).setOrigin(0, 0);
        this.fill = scene.add.rectangle(0, 0, width, height, 0x3ddc84).setOrigin(0, 0);
        this.label = scene.add.text(0, -18, `${name}  ${maxHealth}/${maxHealth}`, {
            fontSize: "14px",
            color: "#ffffff"
        });
        this.add([
            this.background,
            this.fill,
            this.label
        ]);
        scene.add.existing(this);
    }
    setHealth(currentHealth, name) {
        const ratio = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Math"].Clamp(currentHealth / this.maxHealth, 0, 1);
        this.fill.width = this.barWidth * ratio;
        this.fill.fillColor = ratio > 0.3 ? 0x3ddc84 : 0xdc3d3d;
        this.label.setText(`${name}  ${Math.max(0, currentHealth)}/${this.maxHealth}`);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/objects/ItemSlot.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ItemSlot",
    ()=>ItemSlot
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$assetKeys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/assetKeys.ts [app-client] (ecmascript)");
;
;
class ItemSlot extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GameObjects"].Container {
    item;
    box;
    selected = false;
    constructor(scene, x, y, item, onToggle){
        super(scene, x, y);
        this.item = item;
        this.box = scene.add.rectangle(0, 0, 100, 100, (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$assetKeys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fallbackColorForKey"])(item.spriteKey)).setStrokeStyle(3, 0xffffff, 0).setInteractive({
            useHandCursor: true
        });
        const nameLabel = scene.add.text(0, 40, item.name, {
            fontSize: "12px",
            color: "#ffffff",
            align: "center"
        }).setOrigin(0.5, 0).setWordWrapWidth(100);
        const damageLabel = scene.add.text(0, -10, `${item.ability.damage} dmg`, {
            fontSize: "16px",
            color: "#ffffff"
        }).setOrigin(0.5, 0.5);
        this.add([
            this.box,
            nameLabel,
            damageLabel
        ]);
        scene.add.existing(this);
        this.box.on("pointerdown", ()=>{
            this.selected = !this.selected;
            this.box.setStrokeStyle(3, 0xffe066, this.selected ? 1 : 0);
            onToggle(item, this.selected);
        });
    }
    setEnabled(enabled) {
        this.box.setAlpha(enabled ? 1 : 0.4);
        if (enabled) {
            this.box.setInteractive({
                useHandCursor: true
            });
        } else {
            this.box.disableInteractive();
        }
    }
    setSelected(selected) {
        this.selected = selected;
        this.box.setStrokeStyle(3, 0xffe066, selected ? 1 : 0);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/scenes/ArenaScene.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ArenaScene",
    ()=>ArenaScene
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$localBattleClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/engine/localBattleClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$assetKeys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/assetKeys.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$objects$2f$HealthBar$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/objects/HealthBar.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$objects$2f$CharacterSprite$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/objects/CharacterSprite.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$eventBus$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/eventBus.ts [app-client] (ecmascript)");
;
;
;
;
;
;
class ArenaScene extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Scene"] {
    battleState;
    playerCharacter;
    opponentCharacter;
    playerSprite;
    opponentSprite;
    playerHealthBar;
    opponentHealthBar;
    actionButtons = [];
    logText;
    overlay;
    busy = false;
    constructor(){
        super("ArenaScene");
    }
    init(data) {
        this.battleState = data.battleState;
        this.playerCharacter = data.playerCharacter;
        this.opponentCharacter = data.opponentCharacter;
        this.actionButtons = [];
        this.overlay = undefined;
        this.busy = false;
    }
    create() {
        this.add.image(480, 300, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$assetKeys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ARENA_BACKGROUND_KEY"]);
        this.playerSprite = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$objects$2f$CharacterSprite$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CharacterSprite"](this, 220, 260, "character_player", this.playerCharacter.displayName);
        this.opponentSprite = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$objects$2f$CharacterSprite$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CharacterSprite"](this, 740, 260, "character_opponent", this.opponentCharacter.displayName);
        this.playerHealthBar = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$objects$2f$HealthBar$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HealthBar"](this, 120, 120, 220, 18, this.battleState.participants.player.maxHealth, this.playerCharacter.displayName);
        this.opponentHealthBar = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$objects$2f$HealthBar$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HealthBar"](this, 620, 120, 220, 18, this.battleState.participants.opponent.maxHealth, this.opponentCharacter.displayName);
        this.refreshHealthBars();
        this.logText = this.add.text(30, 400, "", {
            fontSize: "14px",
            color: "#cccccc",
            wordWrap: {
                width: 900
            }
        });
        this.renderActionBar();
    }
    getItem(character, itemId) {
        return character.inventory.items.find((item)=>item.id === itemId);
    }
    refreshHealthBars() {
        this.playerHealthBar?.setHealth(this.battleState.participants.player.currentHealth, this.playerCharacter.displayName);
        this.opponentHealthBar?.setHealth(this.battleState.participants.opponent.currentHealth, this.opponentCharacter.displayName);
    }
    renderActionBar() {
        this.actionButtons.forEach((btn)=>btn.destroy());
        this.actionButtons = [];
        const items = this.battleState.participants.player.selectedItemIds.map((id)=>this.getItem(this.playerCharacter, id)).filter((item)=>Boolean(item));
        const isPlayerTurn = this.battleState.activeSlot === "player" && this.battleState.status === "in_progress";
        items.forEach((item, index)=>{
            const cooldown = this.battleState.participants.player.cooldowns[item.id] ?? 0;
            const disabled = !isPlayerTurn || cooldown > 0 || this.busy;
            const label = cooldown > 0 ? `${item.name} (CD ${cooldown})` : item.name;
            const button = this.add.text(30 + index * 180, 460, label, {
                fontSize: "16px",
                color: disabled ? "#666666" : "#ffffff",
                backgroundColor: disabled ? "#222222" : "#3a3a6a",
                padding: {
                    x: 12,
                    y: 8
                }
            }).setInteractive({
                useHandCursor: !disabled
            });
            if (!disabled) {
                button.on("pointerdown", ()=>this.onPlayerUseItem(item.id));
            }
            this.actionButtons.push(button);
        });
    }
    appendLog(line) {
        const current = this.logText?.text ?? "";
        const next = `${current}\n${line}`.trim();
        this.logText?.setText(next);
    }
    async onPlayerUseItem(itemId) {
        if (this.busy) return;
        this.busy = true;
        this.renderActionBar();
        const { state, events } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$localBattleClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["submitAction"])(this.battleState, {
            type: "USE_ITEM",
            actorSlot: "player",
            itemId
        }, {
            playerCharacter: this.playerCharacter,
            opponentCharacter: this.opponentCharacter
        });
        this.battleState = state;
        this.applyEvents(events, "player");
        this.refreshHealthBars();
        if (this.battleState.status !== "in_progress") {
            this.busy = false;
            this.renderActionBar();
            this.endBattle();
            return;
        }
        this.busy = false;
        this.renderActionBar();
        this.time.delayedCall(700, ()=>this.maybeRunCpuTurn());
    }
    async maybeRunCpuTurn() {
        if (this.battleState.status !== "in_progress" || this.battleState.activeSlot !== "opponent") {
            return;
        }
        const opponent = this.battleState.participants.opponent;
        const usableItemId = opponent.selectedItemIds.find((id)=>(opponent.cooldowns[id] ?? 0) <= 0);
        if (!usableItemId) {
            const { state, events } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$localBattleClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["submitAction"])(this.battleState, {
                type: "FORFEIT",
                actorSlot: "opponent"
            }, {
                playerCharacter: this.playerCharacter,
                opponentCharacter: this.opponentCharacter
            });
            this.battleState = state;
            this.applyEvents(events, "opponent");
            this.refreshHealthBars();
            this.endBattle();
            return;
        }
        const { state, events } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$localBattleClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["submitAction"])(this.battleState, {
            type: "USE_ITEM",
            actorSlot: "opponent",
            itemId: usableItemId
        }, {
            playerCharacter: this.playerCharacter,
            opponentCharacter: this.opponentCharacter
        });
        this.battleState = state;
        this.applyEvents(events, "opponent");
        this.refreshHealthBars();
        this.renderActionBar();
        if (this.battleState.status !== "in_progress") {
            this.endBattle();
        }
    }
    applyEvents(events, actor) {
        for (const event of events){
            if (event.type === "DAMAGE_DEALT") {
                const payload = event.payload;
                const targetSprite = payload.targetSlot === "player" ? this.playerSprite : this.opponentSprite;
                targetSprite?.playHitFlash();
                this.appendLog(`${actor === "player" ? this.playerCharacter.displayName : this.opponentCharacter.displayName} dealt ${payload.damageDealt} damage.`);
            }
            if (event.type === "INVALID_ACTION") {
                this.appendLog("Action rejected by battle engine.");
            }
        }
    }
    endBattle() {
        const status = this.battleState.status;
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$eventBus$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["eventBus"].emitTyped("battle:ended", {
            status
        });
        const message = status === "won" ? "You won!" : status === "lost" ? "You lost." : "Draw.";
        this.overlay = this.add.container(0, 0);
        const bg = this.add.rectangle(480, 300, 960, 600, 0x000000, 0.6);
        const text = this.add.text(480, 260, message, {
            fontSize: "32px",
            color: "#ffffff"
        }).setOrigin(0.5);
        const button = this.add.text(480, 340, "Return to Inventory", {
            fontSize: "18px",
            color: "#ffffff",
            backgroundColor: "#2d6a4f",
            padding: {
                x: 16,
                y: 10
            }
        }).setOrigin(0.5).setInteractive({
            useHandCursor: true
        }).on("pointerdown", ()=>this.scene.start("InventoryScene"));
        this.overlay.add([
            bg,
            text,
            button
        ]);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/scenes/BootScene.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BootScene",
    ()=>BootScene
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$assetKeys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/assetKeys.ts [app-client] (ecmascript)");
;
;
class BootScene extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Scene"] {
    constructor(){
        super("BootScene");
    }
    create() {
        const width = 960;
        const height = 600;
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0x1b2a4a, 0x1b2a4a, 0x0d1424, 0x0d1424, 1);
        graphics.fillRect(0, 0, width, height);
        graphics.generateTexture(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$assetKeys$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ARENA_BACKGROUND_KEY"], width, height);
        graphics.destroy();
        this.scene.start("InventoryScene");
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/game/scenes/InventoryScene.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InventoryScene",
    ()=>InventoryScene
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/phaser/dist/phaser.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/engine/rules.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$localBattleClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/engine/localBattleClient.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$fetchItems$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/data/fetchItems.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/data/mockCharacters.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$objects$2f$ItemSlot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/objects/ItemSlot.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$eventBus$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/game/eventBus.ts [app-client] (ecmascript)");
;
;
;
;
;
;
;
class InventoryScene extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$phaser$2f$dist$2f$phaser$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Scene"] {
    character = null;
    selectedItemIds = new Set();
    enterButton;
    statusText;
    constructor(){
        super("InventoryScene");
    }
    create() {
        this.selectedItemIds = new Set();
        this.add.text(30, 24, "Your Character", {
            fontSize: "24px",
            color: "#ffffff"
        }).setOrigin(0, 0);
        this.statusText = this.add.text(30, 56, "Loading inventory...", {
            fontSize: "14px",
            color: "#aaaaaa"
        }).setOrigin(0, 0);
        this.loadCharacter();
    }
    async loadCharacter() {
        try {
            this.character = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$fetchItems$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchCharacter"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockPlayerCharacter"].id);
        } catch  {
            this.character = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockPlayerCharacter"];
        }
        this.renderInventory();
    }
    renderInventory() {
        if (!this.character) return;
        this.statusText?.setText(`Select up to ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MAX_ITEMS_PER_BATTLE"]} items, then enter the arena.`);
        const items = this.character.inventory.items;
        const startX = 100;
        const startY = 160;
        const spacingX = 140;
        items.forEach((item, index)=>{
            new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$objects$2f$ItemSlot$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ItemSlot"](this, startX + index * spacingX, startY, item, (item, selected)=>this.onItemToggled(item, selected));
        });
        this.enterButton = this.add.text(30, 500, "Enter Arena", {
            fontSize: "20px",
            color: "#ffffff",
            backgroundColor: "#2d6a4f",
            padding: {
                x: 16,
                y: 10
            }
        }).setOrigin(0, 0).setInteractive({
            useHandCursor: true
        }).on("pointerdown", ()=>this.onEnterArena());
        this.updateEnterButtonState();
    }
    onItemToggled(item, selected) {
        if (selected) {
            if (this.selectedItemIds.size >= __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$rules$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MAX_ITEMS_PER_BATTLE"]) {
                return;
            }
            this.selectedItemIds.add(item.id);
        } else {
            this.selectedItemIds.delete(item.id);
        }
        this.updateEnterButtonState();
    }
    updateEnterButtonState() {
        const ready = this.selectedItemIds.size > 0;
        this.enterButton?.setAlpha(ready ? 1 : 0.5);
    }
    async onEnterArena() {
        if (!this.character || this.selectedItemIds.size === 0) return;
        const selectedItemIds = Array.from(this.selectedItemIds);
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$eventBus$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["eventBus"].emitTyped("battle:start-requested", {
            selectedItemIds
        });
        const opponentItemIds = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockCpuCharacter"].inventory.items.map((i)=>i.id);
        const battleState = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$engine$2f$localBattleClient$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startBattle"])(`battle-${Date.now()}`, this.character, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockCpuCharacter"], {
            player: selectedItemIds,
            opponent: opponentItemIds
        });
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$game$2f$eventBus$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["eventBus"].emitTyped("battle:ready", {
            battleState
        });
        this.scene.start("ArenaScene", {
            battleState,
            playerCharacter: this.character,
            opponentCharacter: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$data$2f$mockCharacters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mockCpuCharacter"]
        });
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/env.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getGenerationApiUrl",
    ()=>getGenerationApiUrl,
    "isMockDataMode",
    ()=>isMockDataMode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
function isMockDataMode() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";
}
function getGenerationApiUrl() {
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_GENERATION_API_URL;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_0tom10m._.js.map