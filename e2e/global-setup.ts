import { ADMIN_EMAIL, clearEmulators, event } from './emulator';

/** Fresh emulator data for every run, with one whitelisted admin. */
export default async function globalSetup() {
  await clearEmulators();
  await event.collection('admins').doc(ADMIN_EMAIL).set({ name: 'E2E admin' });
}
