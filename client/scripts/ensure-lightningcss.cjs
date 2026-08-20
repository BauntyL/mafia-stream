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

function findNamed(dir, name, acc = []) {
  for (const e of entries(dir)) {
    if (!e.isDirectory() || e.name === '.bin' || e.name === '.cache') continue;
    const p = path.join(dir, e.name);
    if (e.name === name && fs.existsSync(path.join(p, 'package.json'))) acc.push(p);
    findNamed(p, name, acc);
  }
  return acc;
}

function hasNode(dir) {
  return entries(dir).some((e) => e.isFile() && e.name.endsWith('.node'));
}

function copyDotNode(fromDir, toDir) {
  for (const e of entries(fromDir)) {
    const src = path.join(fromDir, e.name);
    if (e.isFile() && e.name.endsWith('.node')) {
      fs.copyFileSync(src, path.join(toDir, e.name));
    }
  }
}

if (process.platform !== 'linux' || !fs.existsSync(nm)) process.exit(0);

const pkgs = [
  '@tailwindcss/oxide-linux-x64-gnu',
  '@tailwindcss/oxide-linux-x64-musl',
  'lightningcss-linux-x64-gnu',
  'lightningcss-linux-x64-musl',
];

execSync(`npm install --no-save --no-package-lock --include=optional ${pkgs.join(' ')}`, {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development', npm_config_optional: 'true' },
});

for (const dir of findNamed(nm, 'lightningcss')) {
  if (hasNode(dir)) continue;
  for (const pkg of ['lightningcss-linux-x64-gnu', 'lightningcss-linux-x64-musl']) {
    const src = path.join(nm, pkg);
    if (fs.existsSync(src)) copyDotNode(src, dir);
  }
}

for (const dir of findNamed(nm, 'oxide')) {
  const pkg = path.join(dir, 'package.json');
  try {
    if (JSON.parse(fs.readFileSync(pkg, 'utf8')).name !== '@tailwindcss/oxide') continue;
  } catch {
    continue;
  }
  if (hasNode(dir)) continue;
  for (const name of ['@tailwindcss/oxide-linux-x64-gnu', '@tailwindcss/oxide-linux-x64-musl']) {
    const src = path.join(nm, name);
    if (fs.existsSync(src)) copyDotNode(src, dir);
  }
}
