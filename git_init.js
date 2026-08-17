import fs from 'fs';
import path from 'path';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

async function initAndCommit() {
  const dir = path.resolve('.');
  console.log('Initializing git in:', dir);

  try {
    await git.init({ fs, dir, defaultBranch: 'main' });
    console.log('Git repo initialized on main branch.');

    // Add remote
    await git.addRemote({
      fs,
      dir,
      remote: 'origin',
      url: 'https://github.com/asmit260/app.git',
      force: true
    });
    console.log('Remote origin set to https://github.com/asmit260/app.git');

    // Stage all files
    const globFiles = (baseDir, subDir = '') => {
      let results = [];
      const current = path.join(baseDir, subDir);
      const list = fs.readdirSync(current);
      for (const item of list) {
        if (item === '.git' || item === 'node_modules' || item === 'dist') continue;
        const fullPath = path.join(current, item);
        const relPath = path.join(subDir, item).replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          // ignore android build dirs
          if (relPath === 'android/.gradle' || relPath === 'android/build' || relPath === 'android/app/build') continue;
          results = results.concat(globFiles(baseDir, relPath));
        } else {
          results.push(relPath);
        }
      }
      return results;
    };

    const files = globFiles(dir);
    console.log(`Found ${files.length} files to stage.`);

    for (const file of files) {
      await git.add({ fs, dir, filepath: file });
    }
    console.log('All files staged.');

    const sha = await git.commit({
      fs,
      dir,
      message: 'Initial commit - Standalone AniTrack app and Android APK workflow',
      author: {
        name: 'asmit260',
        email: 'asmit260@users.noreply.github.com'
      }
    });
    console.log('Committed successfully with SHA:', sha);
  } catch (err) {
    console.error('Error during git operation:', err);
  }
}

initAndCommit();
