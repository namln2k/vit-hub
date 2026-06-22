import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  isolatedProcessEnv,
  loadProfile,
  validateProfile,
} from './env-contract.mjs';

const [profile, runtime, ...runtimeArgs] = process.argv.slice(2);
const { file, env: profileEnv } = loadProfile(profile);
const summary = validateProfile(profile, profileEnv);
const env = isolatedProcessEnv({
  ...profileEnv,
  VIT_HUB_ENV_PROFILE: profile,
});

let command;
let args;

if (runtime === 'host') {
  command = process.execPath;
  args = [path.join('node_modules', 'next', 'dist', 'bin', 'next'), 'dev', ...runtimeArgs];
} else if (runtime === 'build') {
  command = process.execPath;
  args = [
    path.join('node_modules', 'next', 'dist', 'bin', 'next'),
    'build',
    '--webpack',
    ...runtimeArgs,
  ];
} else if (runtime === 'docker') {
  command = 'docker';
  args = ['compose', 'up', ...runtimeArgs];
  env.APP_ENV_FILE = file;
} else {
  throw new Error(`Unknown runtime "${runtime}". Use host, docker, or build.`);
}

console.log(
  `[vit-hub] profile=${summary.profile} runtime=${runtime} supabase=${summary.supabaseOrigin}`,
);

const child = spawn(command, args, {
  env,
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
