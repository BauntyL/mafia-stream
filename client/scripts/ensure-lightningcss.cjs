const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const nm = path.join(root, 'node_modules');

function entries(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function findLightningcss(dir, acc = []) {
  for (const e of entries(dir)) {
    if (!e.isDirectory() || e.name === '.bin' || e.name === '.cache') continue;
    const p = path.join(dir, e.name);
    if (e.name === 'lightningcss' && fs.existsSync(path.join(p, 'package.json'))) {
      acc.push(p);
    }
    findLightningcss(p, acc);
  }
  return acc;
}

function hasNative(dir) {
  return entries(dir).some((e) => e.isFile() && e.name.endsWith('.node'));
}

function nativePkgDirs() {
  return entries(nm)
    .filter((e) => e.isDirectory() && e.name.startsWith('lightningcss-linux-'))
    .map((e) => path.join(nm, e.name));
}

function copyNative(target) {
  for (const pkg of nativePkgDirs()) {
    for (const e of entries(pkg)) {
      if (e.isFile() && e.name.endsWith('.node')) {
        fs.copyFileSync(path.join(pkg, e.name), path.join(target, e.name));
      }
    }
  }
}

if (!fs.existsSync(nm)) process.exit(0);

const pkgs = findLightningcss(nm);
if (pkgs.every(hasNative)) process.exit(0);

if (nativePkgDirs().length === 0) {
  execSync(
    'npm install --no-save --no-package-lock lightningcss-linux-x64-gnu lightningcss-linux-x64-musl',
    { cwd: root, stdio: 'inherit' },
  );
}

for (const dir of pkgs) {
  if (!hasNative(dir)) copyNative(dir);
}
