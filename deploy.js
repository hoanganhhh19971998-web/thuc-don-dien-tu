/**
 * Deploy script - commit and push all changes using isomorphic-git
 * Reads credentials from .git/config remote URL
 */
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname);

// Parse remote URL to extract credentials
function parseRemoteUrl(url) {
  const match = url.match(/https:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) return { username: match[1], password: match[2], cleanUrl: `https://${match[3]}` };
  return null;
}

async function deploy() {
  console.log('=== BAT DAU DEPLOY ===\n');

  const branch = await git.currentBranch({ fs, dir }) || 'main';
  console.log('Branch:', branch);

  // Get credentials from git config
  const remotes = await git.listRemotes({ fs, dir });
  const origin = remotes.find(r => r.remote === 'origin');
  if (!origin) { console.error('Khong tim thay remote origin'); return; }
  const creds = parseRemoteUrl(origin.url);
  if (!creds) { console.error('Khong the doc credentials tu remote URL'); return; }
  console.log('Remote:', creds.cleanUrl);

  // Check status
  const status = await git.statusMatrix({ fs, dir });
  const changed = status.filter(([, h, w, s]) => h !== 1 || w !== 1 || s !== 1);

  if (changed.length === 0) {
    console.log('Khong co thay doi nao. Thu push commit hien tai...');
  } else {
    console.log(`\n${changed.length} file thay doi:`);
    for (const [fp, h, w] of changed) {
      const st = h === 0 && w === 2 ? 'NEW' : h === 1 && w === 2 ? 'MOD' : h === 1 && w === 0 ? 'DEL' : '???';
      console.log(`  [${st}] ${fp}`);
    }

    // Stage
    console.log('\nStaging...');
    for (const [fp, , w] of changed) {
      if (w === 0) await git.remove({ fs, dir, filepath: fp });
      else await git.add({ fs, dir, filepath: fp });
    }

    // Commit
    const msg = `Cap nhat ${new Date().toLocaleString('vi-VN')}`;
    const sha = await git.commit({
      fs, dir, message: msg,
      author: { name: creds.username, email: 'deploy@local' }
    });
    console.log(`Commit: ${sha.slice(0, 8)} - "${msg}"`);
  }

  // Push
  console.log('\nPushing...');
  const result = await git.push({
    fs, http, dir,
    remote: 'origin', ref: branch,
    onAuth: () => ({ username: creds.username, password: creds.password }),
    onMessage: (m) => { if (m.trim()) console.log('>', m.trim()); }
  });

  if (result.ok) {
    console.log('\n=== PUSH THANH CONG! ===');
    console.log('Render se tu dong deploy.');
  } else {
    console.log('\nPush that bai:', JSON.stringify(result, null, 2));
  }
}

deploy().catch(e => console.error('Loi:', e.message));
