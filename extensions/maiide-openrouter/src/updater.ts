import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const OWNER = 'mesumbinshaukat';
const REPO = 'MAIIDE';

function normalizeVersion(v: string): string {
  return v.replace(/^v/, '').trim();
}

function isNewer(remote: string, local: string): boolean {
  const a = normalizeVersion(remote).split('.').map(n => parseInt(n, 10) || 0);
  const b = normalizeVersion(local).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = a[i] || 0, bi = b[i] || 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return false;
}

async function downloadVSIX(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

export async function checkForUpdate(currentVersion: string) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github+json' }
    } as any);
    if (!res.ok) return;
    const data: any = await res.json();
    const tag = String(data.tag_name || '').trim();
    if (!tag || !isNewer(tag, currentVersion)) return;

    const choice = await vscode.window.showInformationMessage(
      `A new MAIIDE build ${tag} is available. Install now?`,
      'Install', 'Later'
    );
    if (choice !== 'Install') return;

    const asset = data.assets?.find((a: any) => a.name === 'maiide-openrouter.vsix');
    if (!asset) return vscode.window.showErrorMessage('VSIX not found in release.');

    const tempDir = path.join(require('os').tmpdir(), 'maiide-update');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    const vsixPath = path.join(tempDir, 'maiide-openrouter.vsix');

    await downloadVSIX(asset.browser_download_url, vsixPath);

    const uri = vscode.Uri.file(vsixPath);
    await vscode.commands.executeCommand('workbench.extensions.installExtension', uri);

    vscode.window.showInformationMessage('MAIIDE updated! Reload to apply.');

    // Clean up
    fs.unlinkSync(vsixPath);
  } catch (e) {
    console.error('Update check failed:', e);
  }
}
