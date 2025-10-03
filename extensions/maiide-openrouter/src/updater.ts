import * as vscode from 'vscode';

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

export async function checkForUpdate(currentVersion: string) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
      headers: { 'Accept': 'application/vnd.github+json' }
    } as any);
    if (!res.ok) return;
    const data: any = await res.json();
    const tag = String(data.tag_name || '').trim();
    if (!tag) return;
    if (isNewer(tag, currentVersion)) {
      const choice = await vscode.window.showInformationMessage(
        `A new MAIIDE build ${tag} is available.`,
        'Open Release'
      );
      if (choice === 'Open Release') {
        vscode.env.openExternal(vscode.Uri.parse(`https://github.com/${OWNER}/${REPO}/releases/latest`));
      }
    }
  } catch {
    // ignore network errors
  }
}
