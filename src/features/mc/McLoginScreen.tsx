import React from 'react';
import { mcSignIn } from '../../services/mcAccounts';
import { useMcs } from '../../state/useMcs';
import { PinLoginScreen } from '../../shared/PinLoginScreen';

/** /mc before login: pick an MC (Caramel or Fury unless renamed), then the 6-digit PIN from the organizers. */
export const McLoginScreen: React.FC = () => {
  const mcs = useMcs();
  return (
    <PinLoginScreen
      portal="Cổng MC"
      question="Bạn là MC nào?"
      accounts={mcs.map((m) => ({ id: m.id, code: 'MC', name: m.name }))}
      signIn={mcSignIn}
      rememberKey="hiphop_xu_tra_last_mc"
    />
  );
};
