const fs = require('fs');
const path = require('path');
const os = require('os');

const targetPath = path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'node_modules', 'firebase-tools', 'lib', 'frameworks', 'index.js');
if (!fs.existsSync(targetPath)) {
  console.error('Target not found:', targetPath);
  process.exit(1);
}

let content = fs.readFileSync(targetPath, 'utf8');

// 1. Keep postinstall: "prisma generate"
const targetScripts = 'delete packageJson.scripts;';
const replacementScripts = `delete packageJson.scripts;
            if (packageJson.dependencies && packageJson.dependencies["@prisma/client"]) {
                packageJson.scripts = { postinstall: "prisma generate" };
            }`;

if (!content.includes('packageJson.scripts = { postinstall: "prisma generate" };')) {
  if (content.includes(targetScripts)) {
    content = content.replace(targetScripts, replacementScripts);
    console.log('Patched packageJson.scripts');
  } else {
    console.warn('Could not find targetScripts string');
  }
} else {
  console.log('Already patched scripts');
}

// 2. Copy prisma directory to functionsDist
const targetCopy = 'if (await (0, fs_extra_1.pathExists)(getProjectPath(".npmrc"))) {';
const replacementCopy = `if (await (0, fs_extra_1.pathExists)(getProjectPath("prisma"))) {
                await (0, fs_extra_1.copy)(getProjectPath("prisma"), (0, path_1.join)(functionsDist, "prisma")).catch(() => {});
            }
            if (await (0, fs_extra_1.pathExists)(getProjectPath(".npmrc"))) {`;

if (!content.includes('getProjectPath("prisma")')) {
  if (content.includes(targetCopy)) {
    content = content.replace(targetCopy, replacementCopy);
    console.log('Patched prisma copy');
  } else {
    console.warn('Could not find targetCopy string');
  }
} else {
  console.log('Already patched prisma copy');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated firebase-tools frameworks/index.js');
