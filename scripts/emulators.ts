#!/usr/bin/env bun
/// <reference types="bun" />
// Runs the Firebase CLI against the local Auth + Firestore emulators (project demo-hiphopxutra, never production).
// The Firestore emulator needs Java 21+: uses JAVA_HOME, else the newest JDK in ~/.jdks, else `java` on PATH.
//
//   bun scripts/emulators.ts start          keep the emulators running (UI off; data is dropped on exit)
//   bun scripts/emulators.ts exec "<cmd>"   start them, run <cmd>, stop them (used by `bun run test:e2e`)

import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const PROJECT = 'demo-hiphopxutra'; // keep in sync with src/services/firebase.ts

function javaHome(): string | undefined {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  const jdks = path.join(homedir(), '.jdks');
  if (!existsSync(jdks)) return undefined;
  const newest = readdirSync(jdks)
    .filter((d) => /^jdk-(2[1-9]|[3-9]\d)/.test(d))
    .sort()
    .at(-1);
  return newest && path.join(jdks, newest);
}

const [mode = 'start', ...rest] = process.argv.slice(2);
const env = { ...process.env };
const home = javaHome();
if (home) {
  env.JAVA_HOME = home;
  env.PATH = `${path.join(home, 'bin')}${path.delimiter}${env.PATH}`;
}

const cli = [mode === 'exec' ? 'emulators:exec' : 'emulators:start', '--only', 'auth,firestore', '--project', PROJECT];
if (mode === 'exec') cli.push(rest.join(' '));

// Called through node, not the bin shim: Windows .cmd shims reject arguments containing `&&`.
const firebaseBin = path.join(import.meta.dir, '..', 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const proc = Bun.spawn(['node', firebaseBin, ...cli], { env, stdio: ['inherit', 'inherit', 'inherit'] });
process.exit(await proc.exited);
