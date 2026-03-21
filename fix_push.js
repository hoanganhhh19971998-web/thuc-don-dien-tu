/**
 * Reset bad commit and recommit clean files
 */
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname);

function parseRemoteUrl(url) {
  const match = url.match(/https:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) return { username: match[1], password: match[2] };
  return null;
}

async function fixAndPush() {
  console.log('=== FIX & PUSH ===\n');

  const branch = await git.currentBranch({ fs, dir }) || 'main';
  
  // Get parent commit (before bad commit)
  const log = await git.log({ fs, dir, depth: 3 });
  console.log('Recent commits:');
  for (const c of log) {
    console.log(`  ${c.oid.slice(0, 8)} - ${c.commit.message.trim()}`);
  }

  if (log.length < 2) {
    console.log('Khong co commit truoc do de reset.');
    return;
  }

  // Reset HEAD to parent of bad commit
  const parentOid = log[1].oid;
  console.log(`\nReset HEAD to: ${parentOid.slice(0, 8)}`);
  
  // Write the parent OID to the branch ref
  const refPath = path.join(dir, '.git', 'refs', 'heads', branch);
  // Make sure ref dir exists
  const refDir = path.dirname(refPath);
  if (!fs.existsSync(refDir)) fs.mkdirSync(refDir, { recursive: true });
  fs.writeFileSync(refPath, parentOid + '\n');
  
  console.log('HEAD reset thanh cong.');

  // Now re-stage all changed files (including clean deploy.js)
  const status = await git.statusMatrix({ fs, dir });
  const changed = status.filter(([, h, w, s]) => h !== 1 || w !== 1 || s !== 1);

  console.log(`\n${changed.length} file can commit:`);
  for (const [fp, h, w] of changed) {
    const st = h === 0 && w === 2 ? 'NEW' : h === 1 && w === 2 ? 'MOD' : h === 1 && w === 0 ? 'DEL' : '???';
    console.log(`  [${st}] ${fp}`);
  }

  // Stage all
  console.log('\nStaging...');
  for (const [fp, , w] of changed) {
    if (w === 0) await git.remove({ fs, dir, filepath: fp });
    else await git.add({ fs, dir, filepath: fp });
  }

  // Commit
  const remotes = await git.listRemotes({ fs, dir });
  const origin = remotes.find(r => r.remote === 'origin');
  const creds = parseRemoteUrl(origin.url);

  const msg = `Cap nhat ${new Date().toLocaleString('vi-VN')}`;
  const sha = await git.commit({
    fs, dir, message: msg,
    author: { name: creds.username, email: 'deploy@local' }
  });
  console.log(`Commit moi: ${sha.slice(0, 8)} - "${msg}"`);

  // Force push (to replace old commits)
  console.log('\nForce pushing...');
  const result = await git.push({
    fs, http, dir,
    remote: 'origin', ref: branch, force: true,
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

fixAndPush().catch(e => console.error('Loi:', e.message));
