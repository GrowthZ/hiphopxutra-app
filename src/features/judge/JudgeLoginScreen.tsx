import React from 'react';
import { useTournament } from '../../state/TournamentContext';
import { judgeSignIn } from '../../services/judgeAccounts';
import { getJudgeAvatarUrl } from '../../shared/placeholderAssets';
import { PinLoginScreen } from '../../shared/PinLoginScreen';

/** /giam-khao before login: pick your GK code, then type the 6-digit PIN from the organizers. */
export const JudgeLoginScreen: React.FC = () => {
  const { judges, judgeNotice } = useTournament();
  return (
    <PinLoginScreen
      portal="Cổng giám khảo"
      question="Bạn là giám khảo nào?"
      accounts={judges.map((j) => ({
        id: j.id,
        code: j.code,
        name: j.judgeName || j.name.split('•')[1]?.trim() || j.code,
        avatarUrl: getJudgeAvatarUrl(j),
      }))}
      signIn={judgeSignIn}
      rememberKey="hiphop_xu_tra_last_judge"
      notice={judgeNotice}
    />
  );
};
