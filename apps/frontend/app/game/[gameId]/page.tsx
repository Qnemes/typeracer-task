import GamePlayer from '@/components/game';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { redirect } from 'next/navigation';
import * as React from 'react';

export default function GameJoin({
  searchParams,
  params,
}: {
  searchParams: Promise<{ name?: string }>;
  params: Promise<{ gameId: string }>;
}) {
  const { name } = React.use(searchParams);
  const { gameId } = React.use(params);

  async function appendName(formData: FormData) {
    'use server';

    const enteredName = formData.get('name') as string;

    if (!enteredName) return;

    redirect(`/game/${gameId}?name=${enteredName}`);
  }

  if (!name)
    return (
      <main className="mx-auto max-w-5xl w-full mt-10 p-5">
        <Card className="w-full flex flex-col p-10">
          <h2 className="font-bold text-4xl md:text-5xl">Enter your name</h2>
          <p className="text-gray-400 mt-5 text-lg">
            Before you join the game, we require you to provide a nickname/username. This
            nickname/username will be shown in the leaderboard and in the participants section.
          </p>

          <form action={appendName} className="mt-10">
            <Input type="text" placeholder="Name" name="name" className="text-xl px-5 py-7" />

            <Button type="submit" className="text-xl w-full mt-5 px-5 py-7">
              Join Game
            </Button>
          </form>
        </Card>
      </main>
    );

  return <GamePlayer gameId={gameId} name={name} />;
}
