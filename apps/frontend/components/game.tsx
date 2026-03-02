'use client';

import type { GameProps, GameStartedPayload, GameStatus, Player, PlayerScore } from '@/types/types';
import { useEffect, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { toast } from 'sonner';
import Leaderboard from './leaderboard';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';

function getTimeLeftSeconds(endsAt: number) {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function GamePlayer({ gameId, name }: GameProps) {
  const [ioInstance, setIoInstance] = useState<Socket>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('not-started');
  const [paragraph, setParagraph] = useState<string>('');
  const [host, setHost] = useState<string>('');
  const [inputParagraph, setInputParagraph] = useState<string>('');
  const [gameEndsAt, setGameEndsAt] = useState<number | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL as string, {
      transports: ['websocket'],
    });
    setIoInstance(socket);

    socket.emit('join-game', gameId, name);

    return () => {
      removeListeners();
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setupListeners();
    return () => removeListeners();
  }, [ioInstance]);

  useEffect(() => {
    if (!ioInstance || gameStatus !== 'in-progress') return;

    ioInstance.emit('player-typed', inputParagraph);
  }, [inputParagraph]);

  useEffect(() => {
    if (gameStatus !== 'in-progress' || !gameEndsAt) return;

    setTimeLeftSeconds(getTimeLeftSeconds(gameEndsAt));

    const interval = window.setInterval(() => {
      setTimeLeftSeconds(getTimeLeftSeconds(gameEndsAt));
    }, 250);

    return () => window.clearInterval(interval);
  }, [gameStatus, gameEndsAt]);

  function setupListeners() {
    if (!ioInstance) return;

    ioInstance.on('connect', () => {
      console.log('connected');
    });

    ioInstance.on('players', (players: Player[]) => {
      console.log('received players');
      setPlayers(players);
    });

    ioInstance.on('player-joined', (player: Player) => {
      setPlayers((prev) => [...prev, player]);
    });

    ioInstance.on('player-left', (id: string) => {
      setPlayers((prev) => prev.filter((player) => player.id !== id));
    });

    ioInstance.on('player-score', ({ id, score, wpm, accuracy }: PlayerScore) => {
      setPlayers((prev) =>
        prev.map((player) => {
          if (player.id === id) {
            return {
              ...player,
              score,
              wpm,
              accuracy,
            };
          }
          return player;
        }),
      );
    });

    ioInstance.on('game-started', ({ paragraph, endsAt }: GameStartedPayload) => {
      setParagraph(paragraph);
      setGameEndsAt(endsAt);
      setTimeLeftSeconds(getTimeLeftSeconds(endsAt));
      setGameStatus('in-progress');
    });

    ioInstance.on('game-finished', () => {
      setGameStatus('finished');
      setGameEndsAt(null);
      setTimeLeftSeconds(0);
      setInputParagraph('');
    });

    ioInstance.on('new-host', (id: string) => {
      setHost(id);
    });

    ioInstance.on('error', (message: string) => {
      toast.error(message);
    });
  }

  function removeListeners() {
    if (!ioInstance) return;

    ioInstance.off('connect');
    ioInstance.off('players');
    ioInstance.off('player-joined');
    ioInstance.off('player-left');
    ioInstance.off('player-score');
    ioInstance.off('game-started');
    ioInstance.off('game-finished');
    ioInstance.off('new-host');
    ioInstance.off('error');
  }

  function startGame() {
    if (!ioInstance) return;

    ioInstance.emit('start-game');
  }
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (ioInstance) {
        ioInstance.emit('leave');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [ioInstance]);

  return (
    <div className="w-screen p-10 grid grid-cols-1 lg:grid-cols-3 gap-20">
      {/* Leaderboard */}
      <div className="w-full order-last lg:order-first">
        <h2 className="text-2xl font-medium mb-10 mt-10 lg:mt-0">Leaderboard</h2>
        <div className="flex flex-col gap-5 w-full">
          {/* sort players based on score and map */}
          {[...players]
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <Leaderboard key={player.id} player={player} rank={index + 1} />
            ))}
        </div>
      </div>

      {/* Game */}
      <div className="lg:col-span-2 h-full">
        {gameStatus === 'not-started' && (
          <div className="flex flex-col items-center justify-center p-10">
            <h1 className="text-2xl font-bold">Waiting for players to join...</h1>

            {host === ioInstance?.id && (
              <Button className="mt-10 px-20 py-6" size="lg" onClick={startGame}>
                Start Game
              </Button>
            )}
          </div>
        )}

        {gameStatus === 'in-progress' && (
          <div className="h-full">
            <div className="mb-6 inline-flex items-center rounded-md border px-4 py-2 text-lg font-semibold">
              Time left: <span className="ml-2 font-mono">{formatSeconds(timeLeftSeconds)}</span>
            </div>
            <h1 className="text-2xl font-bold mb-10">Type the paragraph below</h1>

            <div className="relative h-full">
              <p className="text-base lg:text-lg p-5">{paragraph}</p>

              <Textarea
                value={inputParagraph}
                onChange={(e) => setInputParagraph(e.target.value)}
                className="text-base text-lime-400 lg:text-lg outline-none p-5 absolute top-0 left-0 right-0 bottom-0 z-10 opacity-75"
                placeholder=""
                disabled={gameStatus !== 'in-progress' || !ioInstance}
              />
            </div>
          </div>
        )}

        {gameStatus === 'finished' && (
          <div className="flex flex-col items-center justify-center p-10">
            <h1 className="text-2xl font-bold text-center">
              Game finished!
              {ioInstance?.id === host && ' Restart the game fresh!'}
            </h1>

            {host === ioInstance?.id && (
              <Button className="mt-10 px-20" onClick={startGame}>
                Start Game
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
