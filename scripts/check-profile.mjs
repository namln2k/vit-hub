import { loadProfile, validateProfile } from './env-contract.mjs';

const profile = process.argv[2];
const { file, env } = loadProfile(profile);
const summary = validateProfile(profile, env);

console.log(
  `[vit-hub] ${file}: valid ${summary.profile} profile (${summary.supabaseOrigin}, Google One Tap ${summary.googleOneTapEnabled ? 'enabled' : 'disabled'})`,
);
