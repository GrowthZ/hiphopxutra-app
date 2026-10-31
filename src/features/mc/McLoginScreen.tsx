import React from 'react';
import { MCS, mcSignIn } from '../../services/mcAccounts';
import { PinLoginScreen } from '../../shared/PinLoginScreen';

/** /mc before login: pick Caramel or Fury, then the 6-digit PIN from the organizers. */
export const McLoginScreen: React.FC = () => (
  <PinLoginScreen
    portal="Cổng MC"
    question="Bạn là MC nào?"
    accounts={MCS.map((m) => ({ id: m.id, code: 'MC', name: m.name }))}
    signIn={mcSignIn}
    rememberKey="hiphop_xu_tra_last_mc"
  />
);
