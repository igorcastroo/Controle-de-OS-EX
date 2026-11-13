export default [{
  files: ["**/*.js"],
  ignores: ["node_modules/**", ".npm-cache/**", "test-results/**", "playwright-report/**"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: Object.fromEntries([
      "document", "window", "localStorage", "crypto", "alert", "confirm",
      "Blob", "URL", "clearTimeout", "setTimeout", "console", "process", "structuredClone", "queueMicrotask", "fetch", "AbortSignal",
    ].map((name) => [name, "readonly"])),
  },
  rules: {
    "no-undef": "error",
    "no-unused-vars": ["error", { args: "none" }],
    "no-dupe-args": "error",
    "no-dupe-keys": "error",
    "no-unreachable": "error",
    "no-constant-condition": ["error", { checkLoops: false }],
  },
}];
