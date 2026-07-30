// Static analysis config for yt-focus (WebExtension).
//
//   npm run lint        -- must exit with 0 errors; run before every commit
//
// Correctness rules only, no formatting. Every rule here can catch code that
// throws or silently misbehaves at runtime.
//
// NOTE: eslint must be run with cwd inside the repo. Outside its base path it
// silently skips files and reports "0 problems", which reads as success.
//
// Rules are listed explicitly rather than extending @eslint/js recommended, so
// this config needs no extra dependency and cannot drift when a preset changes.
// eslint itself is not pinned as a devDependency — `npm run lint` resolves
// whatever npx finds. Pinning it is the right follow-up.

const browserGlobals = {
    // WebExtension APIs
    chrome: "readonly",
    browser: "readonly",
    // DOM / page
    window: "readonly",
    document: "readonly",
    location: "readonly",
    navigator: "readonly",
    console: "readonly",
    fetch: "readonly",
    localStorage: "readonly",
    sessionStorage: "readonly",
    MutationObserver: "readonly",
    IntersectionObserver: "readonly",
    setTimeout: "readonly",
    clearTimeout: "readonly",
    setInterval: "readonly",
    clearInterval: "readonly",
    requestAnimationFrame: "readonly",
    cancelAnimationFrame: "readonly",
    Node: "readonly",
    Element: "readonly",
    HTMLElement: "readonly",
    CustomEvent: "readonly",
    Event: "readonly",
    URL: "readonly",
    URLSearchParams: "readonly",
    getComputedStyle: "readonly",
};

// Cross-file globals. manifest.json loads defaults.js before content.js,
// spotify.js and background.js in every context, so these are always defined at
// runtime — but eslint cannot see a load order expressed in a manifest.
// Keep this list in sync with the top-level declarations in defaults.js.
const sharedGlobals = {
    DEFAULTS: "readonly",       // defaults.js:5   default settings object
    L10N: "readonly",           // defaults.js:51  UI strings
    STORE: "readonly",          // defaults.js:81  browser.storage.sync handle
    loadSettings: "readonly",   // defaults.js:85
    inFocusWindow: "readonly",  // defaults.js:106
};

const correctness = {
    "no-undef": "error",            // a bare identifier is a ReferenceError
    "no-dupe-keys": "error",
    "no-dupe-args": "error",
    "no-dupe-class-members": "error",
    "no-duplicate-case": "error",
    "no-unsafe-negation": "error",
    "no-self-compare": "error",
    "no-unreachable": "error",
    "no-unreachable-loop": "error",
    "no-cond-assign": ["error", "except-parens"],
    "no-constant-condition": ["error", { checkLoops: "allExceptWhileTrue" }],
    "use-isnan": "error",
    "valid-typeof": "error",
    "no-fallthrough": "error",
    "no-sparse-arrays": "error",
    "no-compare-neg-zero": "error",
    "no-async-promise-executor": "error",
    "no-func-assign": "error",
    "no-import-assign": "error",
    "no-obj-calls": "error",
    "no-setter-return": "error",
    "no-unsafe-finally": "error",
    "no-unsafe-optional-chaining": "error",

    // Style debt, not defects:
    "no-unused-vars": "off",
    "no-empty": "off",
};

export default [
    { ignores: ["node_modules/**", "dist/**", "web-ext-artifacts/**", "**/*.min.js"] },
    {
        // Extension scripts are loaded as classic scripts by the browser.
        files: ["*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script",
            globals: { ...browserGlobals, ...sharedGlobals },
        },
        rules: correctness,
    },
    {
        // The headless test runner is Node.
        files: ["tests/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                require: "readonly", module: "writable", exports: "writable",
                process: "readonly", __dirname: "readonly", console: "readonly",
                Buffer: "readonly", setTimeout: "readonly", global: "writable",
            },
        },
        rules: correctness,
    },
];
