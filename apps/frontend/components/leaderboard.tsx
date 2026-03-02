'use client';

import { Player } from '@/types/types';
import { Card } from '@/shared/ui/card';

export default function Leaderboard({ player, rank }: { player: Player; rank: number }) {
  return (
    <Card className="w-full flex flex-row items-center p-5 gap-5">
      <div className="text-xl"># {rank}</div>
      <div className="text-xl font-medium">{player.name}</div>
      <div className="ml-auto flex flex-col items-end">
        <div className="text-xl">{player.score} pts</div>
        <div className="text-sm text-muted-foreground">
          {player.wpm} WPM | {player.accuracy}% accuracy
        </div>
      </div>
    </Card>
  );
}
