const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const esbuild = require("esbuild");

module.exports = function loadTs(relative, overrides = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, "..", relative);
  if (cache.has(filename)) return cache.get(filename);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const code = esbuild.transformSync(fs.readFileSync(filename, "utf8"), {
    loader: "ts",
    format: "cjs",
    target: "es2022",
  }).code;
  const localRequire = (specifier) => {
    if (specifier in overrides) return overrides[specifier];
    if (specifier === "./firebase") return {};
    if (specifier.startsWith("."))
      return module.exports(
        path.relative(
          path.resolve(__dirname, ".."),
          path.resolve(path.dirname(filename), specifier + ".ts"),
        ),
        overrides,
        cache,
      );
    return require(specifier);
  };
  mod.require = localRequire;
  mod._compile(code, filename);
  cache.set(filename, mod.exports);
  return mod.exports;
};
