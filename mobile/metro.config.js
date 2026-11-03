const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [path.join(workspaceRoot, "lib"), path.join(workspaceRoot, "data")];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

const uniwindConfig = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
});

const upstreamResolve = uniwindConfig.resolver.resolveRequest;

function isInsideProject(filePath) {
  const relative = path.relative(projectRoot, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveWorkspaceModule(subpath) {
  const base = path.join(workspaceRoot, subpath);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.json`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return { type: "sourceFile", filePath: file };
    }
  }
  return null;
}

uniwindConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "exceljs" || moduleName.startsWith("exceljs/")) {
    return { type: "sourceFile", filePath: path.join(projectRoot, "src", "shims", "empty.ts") };
  }
  const origin = context.originModulePath ?? "";
  const fromShared = origin.length > 0 && !isInsideProject(origin);
  if (moduleName === "@/lib/firebase" || (fromShared && moduleName.startsWith("@/"))) {
    if (moduleName === "@/lib/firebase") {
      return { type: "sourceFile", filePath: path.join(projectRoot, "src", "lib", "firebase.ts") };
    }
    const hit = resolveWorkspaceModule(moduleName.slice(2));
    if (hit) return hit;
  }
  const resolve = typeof upstreamResolve === "function" ? upstreamResolve : context.resolveRequest.bind(context);
  if (fromShared && !moduleName.startsWith(".") && !path.isAbsolute(moduleName)) {
    return resolve(
      { ...context, originModulePath: path.join(projectRoot, "src", "app", "_layout.tsx") },
      moduleName,
      platform,
    );
  }
  return resolve(context, moduleName, platform);
};

module.exports = uniwindConfig;
