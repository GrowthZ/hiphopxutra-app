import { changePin, createPinAccount, PinAccountKind, pinSignIn, subscribePins } from './judgeAccounts';

// The two MCs log in like the judges: a 6-digit PIN from the organizers (admin creates it on the judge accounts
// page). They only read the published prelim data, the same as guests, so firestore.rules needs nothing extra.
const MC_EMAIL_DOMAIN = 'mc.hiphopxutra.vn';

/** The two MCs; each picks the prelim panel they call on their screen (and can switch at any time). */
export const MCS = [
  { id: 'mc-1', name: 'Caramel' },
  { id: 'mc-2', name: 'Fury' },
] as const;
export type Mc = (typeof MCS)[number];

export const mcEmail = (mcId: string) => `${mcId}@${MC_EMAIL_DOMAIN}`;
export const mcIdFromEmail = (email?: string | null) =>
  email?.endsWith(`@${MC_EMAIL_DOMAIN}`) ? email.split('@')[0] : null;
export const mcById = (mcId: string | null) => MCS.find((m) => m.id === mcId);

const MC_ACCOUNTS: PinAccountKind = { email: mcEmail, secrets: 'mcSecrets' };

export const createMcAccount = (mcId: string) => createPinAccount(MC_ACCOUNTS, mcId);
export const changeMcPin = (mcId: string, currentPin: string) => changePin(MC_ACCOUNTS, mcId, currentPin);
export const subscribeMcPins = (onChange: (pins: Record<string, string>) => void, onError: (err: Error) => void) =>
  subscribePins(MC_ACCOUNTS, onChange, onError);
export const mcSignIn = (mcId: string, pin: string) => pinSignIn(MC_ACCOUNTS, mcId, pin, 'MC này');
