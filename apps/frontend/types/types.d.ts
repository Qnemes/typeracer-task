export type Player = {
  id: string;
  name: string;
  score: number;
  wpm: number;
  accuracy: number;
};

export type PlayerScore = {
  id: string;
  score: number;
  wpm: number;
  accuracy: number;
};

export type GameStartedPayload = {
  paragraph: string;
  endsAt: number;
};

export type GameStatus = "not-started" | "in-progress" | "finished";

export type GameProps = {
  name: string;
  gameId: string;
};
