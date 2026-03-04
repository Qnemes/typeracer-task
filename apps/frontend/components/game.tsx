'use client';

import type { GameProps, GameStartedPayload, GameStatus, Player, PlayerScore } from '@/types/types';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';
import { toast } from 'sonner';
import Leaderboard from './leaderboard';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

function getTimeLeftSeconds(endsAt: number) {
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

const MAX_CHARACTERS_AFTER_ERROR = 5;

function getFirstCharacterErrorIndex(targetWord: string, typedWord: string) {
  for (let index = 0; index < typedWord.length; index++) {
    if (typedWord[index] !== (targetWord[index] ?? '')) {
      return index;
    }
  }

  return -1;
}

function isWithinAllowedErrorOffset(targetWord: string, typedWord: string) {
  const firstErrorIndex = getFirstCharacterErrorIndex(targetWord, typedWord);
  if (firstErrorIndex === -1) {
    return true;
  }

  return typedWord.length <= firstErrorIndex + MAX_CHARACTERS_AFTER_ERROR + 1;
}

export default function GamePlayer({ gameId, name }: GameProps) {
  const [ioInstance, setIoInstance] = useState<Socket>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('not-started');
  const [paragraph, setParagraph] = useState<string>('');
  const [host, setHost] = useState<string>('');
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [currentWordInput, setCurrentWordInput] = useState<string>('');
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [gameEndsAt, setGameEndsAt] = useState<number | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const currentWordInputRef = useRef<HTMLInputElement>(null);
  const paragraphWords = useMemo(
    () => (paragraph.trim().length === 0 ? [] : paragraph.trim().split(/\s+/)),
    [paragraph],
  );
  const currentWordIndex = completedWords.length;
  const targetWord = paragraphWords[currentWordIndex] ?? '';
  const currentWordErrorIndex = useMemo(
    () => getFirstCharacterErrorIndex(targetWord, currentWordInput),
    [targetWord, currentWordInput],
  );
  const hasCurrentWordError = currentWordErrorIndex !== -1;
  const hasFinishedParagraph = paragraphWords.length > 0 && completedWords.length >= paragraphWords.length;
  const currentWordOverflow = currentWordInput.length > targetWord.length;
  const typedParagraph = useMemo(() => {
    const completedText = completedWords.join(' ');

    if (!completedText) return currentWordInput;
    if (!currentWordInput) return `${completedText} `;

    return `${completedText} ${currentWordInput}`;
  }, [completedWords, currentWordInput]);

  function commitCurrentWord() {
    if (!targetWord || hasCurrentWordError || currentWordInput.length === 0) return;
    if (currentWordInput !== targetWord) return;

    setCompletedWords((previous) => [...previous, targetWord]);
    setCurrentWordInput('');
  }

  function handleCurrentWordChange(nextValue: string) {
    const normalizedInput = nextValue.replace(/\r?\n/g, '').replace(/\s+/g, '');
    if (!targetWord) return;

    if (!isWithinAllowedErrorOffset(targetWord, normalizedInput)) {
      return;
    }

    const nextErrorIndex = getFirstCharacterErrorIndex(targetWord, normalizedInput);
    if (currentWordErrorIndex === -1 && nextErrorIndex !== -1) {
      setTotalMistakes((previous) => previous + 1);
    }

    setCurrentWordInput(normalizedInput);
  }

  function handleCurrentWordKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== ' ' && event.key !== 'Enter') return;

    event.preventDefault();
    commitCurrentWord();
  }

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
      setCompletedWords([]);
      setCurrentWordInput('');
      setTotalMistakes(0);
      setGameStatus('in-progress');
    });

    ioInstance.on('game-finished', () => {
      setGameStatus('finished');
      setGameEndsAt(null);
      setTimeLeftSeconds(0);
      setCompletedWords([]);
      setCurrentWordInput('');
      setTotalMistakes(0);
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

    ioInstance.emit('player-typed', { typed: typedParagraph, mistakes: totalMistakes });
  }, [typedParagraph, ioInstance, gameStatus, totalMistakes]);

  useEffect(() => {
    if (gameStatus !== 'in-progress' || hasFinishedParagraph || !ioInstance) return;

    currentWordInputRef.current?.focus();
  }, [gameStatus, currentWordIndex, hasFinishedParagraph, ioInstance]);

  useEffect(() => {
    if (gameStatus !== 'in-progress' || !gameEndsAt) return;

    setTimeLeftSeconds(getTimeLeftSeconds(gameEndsAt));

    const interval = window.setInterval(() => {
      setTimeLeftSeconds(getTimeLeftSeconds(gameEndsAt));
    }, 250);

    return () => window.clearInterval(interval);
  }, [gameStatus, gameEndsAt]);

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-3 lg:gap-20 lg:px-10 lg:py-10">
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
      <div className="lg:col-span-2">
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
          <div>
            <div className="mb-6 inline-flex items-center rounded-md border px-4 py-2 text-lg font-semibold">
              Time left: <span className="ml-2 font-mono">{formatSeconds(timeLeftSeconds)}</span>
            </div>
            <h1 className="text-2xl font-bold mb-10">Type the paragraph below</h1>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-base lg:text-lg p-5 leading-8">
                {paragraphWords.map((word, index) => {
                  const isCompleted = index < completedWords.length;
                  const isCurrentWord = index === currentWordIndex;

                  return (
                    <span key={`${word}-${index}`}>
                      {isCompleted && <span className="text-lime-500">{word}</span>}

                      {!isCompleted && isCurrentWord && (
                        <>
                          {word.split('').map((character, characterIndex) => {
                            const typedCharacter = currentWordInput[characterIndex];

                            if (typedCharacter === undefined) {
                              return <span key={`${word}-${characterIndex}`}>{character}</span>;
                            }

                            const isCorrectCharacter = typedCharacter === character;

                            return (
                              <span
                                key={`${word}-${characterIndex}`}
                                className={
                                  isCorrectCharacter
                                    ? 'text-lime-500'
                                    : 'rounded-sm bg-red-200 px-[1px] text-red-700'
                                }
                              >
                                {character}
                              </span>
                            );
                          })}
                          {currentWordOverflow && (
                            <span className="rounded-sm bg-red-200 px-[1px] text-red-700">
                              {currentWordInput.slice(word.length)}
                            </span>
                          )}
                        </>
                      )}

                      {!isCompleted && !isCurrentWord && <span className="text-foreground">{word}</span>}

                      {index !== paragraphWords.length - 1 && <span> </span>}
                    </span>
                  );
                })}
              </p>

              <div className="relative mt-6">
                <Input
                  ref={currentWordInputRef}
                  value={currentWordInput}
                  onChange={(event) => handleCurrentWordChange(event.target.value)}
                  onKeyDown={handleCurrentWordKeyDown}
                  className={`w-full bg-background text-transparent caret-foreground placeholder:text-transparent ${hasCurrentWordError ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-200' : ''}`}
                  placeholder="Type current word and press space"
                  disabled={gameStatus !== 'in-progress' || !ioInstance || hasFinishedParagraph}
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center px-2.5 text-base md:text-sm">
                  {currentWordInput.length === 0 && (
                    <span className="text-muted-foreground">Type current word and press space</span>
                  )}
                  {currentWordInput.length > 0 &&
                    currentWordInput.split('').map((character, characterIndex) => {
                      const targetCharacter = targetWord[characterIndex];
                      const isCorrectCharacter = character === targetCharacter;

                      return (
                        <span
                          key={`${character}-${characterIndex}`}
                          className={
                            isCorrectCharacter
                              ? 'text-lime-500'
                              : 'rounded-sm bg-red-200 px-[1px] text-red-700'
                          }
                        >
                          {character}
                        </span>
                      );
                    })}
                </div>
              </div>
            </div>

            {hasCurrentWordError && (
              <p className="mt-4 text-sm text-red-500">
                Mistake detected. You can type up to {MAX_CHARACTERS_AFTER_ERROR} more characters,
                then you must fix it to continue.
              </p>
            )}
          </div>
        )}

        {gameStatus === 'finished' && (
          <div className="flex flex-col items-center justify-center p-10">
            <h1 className="text-2xl font-bold text-center">
              Game finished!
              {ioInstance?.id === host && ' Restart the game fresh!'}
            </h1>

            {host === ioInstance?.id && (
              <Button className="mt-10 px-20" size="lg" onClick={startGame}>
                Start Game
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
