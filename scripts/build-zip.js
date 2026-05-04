#!/usr/bin/env node
// Packages the extension into a Chrome Web Store-ready zip.
// Usage: node scripts/build-zip.js

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const version = manifest.version;
const outFile = path.resolve(ROOT, `openfront-helper-${version}.zip`);

const INCLUDE = [
  "manifest.json",
  "background.js",
  "map-data.js",
  "game-found.html",
  "game-found.js",
  "popup.html",
  "assets",
  "content",
  "locales",
  "page-bridge",
  "popup",
  "scripts",
  "shared",
  "styles",
  "OpenFrontIO-main/resources/maps/antarctica/thumbnail.webp",
  "OpenFrontIO-main/resources/maps/archipelagosea/thumbnail.webp",
  "OpenFrontIO-main/resources/maps/bajacalifornia/thumbnail.webp",
  "OpenFrontIO-main/resources/maps/beringsea/thumbnail.webp",
  "OpenFrontIO-main/resources/maps/caucasus/thumbnail.webp",
  "OpenFrontIO-main/resources/maps/conakry/thumbnail.webp",
  "OpenFrontIO-main/resources/maps/losangeles/thumbnail.webp",
  "OpenFrontIO-main/resources/maps/luna/thumbnail.webp",
  "OpenFrontIO-main/resources/maps/marenostrum/thumbnail.webp",
];

// Collect all files to zip
function collectFiles(relPath) {
  const abs = path.join(ROOT, relPath);
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [relPath];
  return fs
    .readdirSync(abs, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => {
      const rel = path.relative(ROOT, path.join(e.parentPath ?? e.path, e.name));
      return rel.replace(/\\/g, "/");
    });
}

const allFiles = INCLUDE.flatMap(collectFiles);

// Use Node's built-in zip support (v18.19+ / v20+) if available, else fall back to adm-zip
let built = false;

// Try native zip via child_process (cross-platform via powershell or zip)
if (!built) {
  try {
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);

    // Build using PowerShell Compress-Archive (Windows) or zip (Unix)
    const isWin = process.platform === "win32";
    if (isWin) {
      const fileListPs = allFiles
        .map((f) => `"${path.join(ROOT, f).replace(/\//g, "\\")}"`);
      // Write a temp list file and compress
      const tmpList = path.join(ROOT, ".build-files.txt");
      fs.writeFileSync(tmpList, fileListPs.join("\n"));

      // Build zip using PowerShell (handles arbitrary file lists)
      const psScript = `
$root = '${ROOT.replace(/\\/g, "\\\\")}';
$out  = '${outFile.replace(/\\/g, "\\\\")}';
$files = Get-Content '${tmpList.replace(/\\/g, "\\\\")}';
if (Test-Path $out) { Remove-Item $out }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($out, 'Create')
foreach ($f in $files) {
  $entry = $f.Trim().Trim('"')
  $rel   = $entry.Substring($root.Length + 1) -replace '\\\\', '/'
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $entry, $rel, 'Optimal') | Out-Null
}
$zip.Dispose()
Write-Host "Done"
`.trim();
      const tmpPs = path.join(ROOT, ".build-zip.ps1");
      fs.writeFileSync(tmpPs, psScript);
      execSync(`powershell -ExecutionPolicy Bypass -File "${tmpPs}"`, { stdio: "inherit" });
      fs.unlinkSync(tmpList);
      fs.unlinkSync(tmpPs);
    } else {
      const args = allFiles.map((f) => `"${f}"`).join(" ");
      execSync(`cd "${ROOT}" && zip -r "${outFile}" ${args}`, {
        stdio: "inherit",
        shell: true,
      });
    }
    built = true;
  } catch (e) {
    console.error("Native zip failed:", e.message);
  }
}

// Fallback: use adm-zip if installed
if (!built) {
  try {
    const AdmZip = require("adm-zip");
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile);
    const zip = new AdmZip();
    for (const relPath of allFiles) {
      const abs = path.join(ROOT, relPath);
      const dir = path.dirname(relPath).replace(/\\/g, "/");
      zip.addLocalFile(abs, dir === "." ? "" : dir);
    }
    zip.writeZip(outFile);
    built = true;
  } catch (e) {
    console.error("adm-zip fallback failed:", e.message);
  }
}

if (built) {
  const kb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(`\n✓ Created: ${outFile}`);
  console.log(`  Version: ${version}`);
  console.log(`  Files:   ${allFiles.length}`);
  console.log(`  Size:    ${kb} KB`);
} else {
  console.error("\n✗ Could not create zip. Install adm-zip: npm install adm-zip");
  process.exit(1);
}
