module.exports = [
"[project]/node_modules/phaser/dist/phaser.esm.js [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/node_modules_phaser_dist_phaser_esm_0yop45j.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/phaser/dist/phaser.esm.js [app-ssr] (ecmascript)");
    });
});
}),
"[project]/src/game/config.ts [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/node_modules_phaser_dist_phaser_esm_0yop45j.js",
  "server/chunks/ssr/src_0xm8ia6._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/src/game/config.ts [app-ssr] (ecmascript)");
    });
});
}),
];