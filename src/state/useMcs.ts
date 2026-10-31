import { useEffect, useState } from 'react';
import { MCS } from '../services/mcAccounts';
import { subscribeMcNames } from '../services/firestore';

/** The two MCs with the names the organizers gave them (config/app.mcNames), falling back to the built-in names. */
export function useMcs() {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => subscribeMcNames(setNames), []);
  return MCS.map((m) => ({ id: m.id, name: names[m.id] || m.name }));
}
