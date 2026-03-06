import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fork, spawn } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Start Express server
const server = fork(resolve(__dirname, 'server/index.js'), { cwd: resolve(__dirname, 'server') });

// Start Vite dev server
process.chdir(resolve(__dirname, 'client'));
const vite = spawn(process.execPath, [resolve(__dirname, 'client/node_modules/vite/bin/vite.js')], {
  cwd: resolve(__dirname, 'client'),
  stdio: 'inherit'
});

process.on('SIGINT', () => {
  server.kill();
  vite.kill();
  process.exit();
});
