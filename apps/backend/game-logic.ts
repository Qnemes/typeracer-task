import { Server, Socket } from "socket.io";
import { generateParagraph } from "./utils/get-text.js";
import { rooms } from "./setup-listeners.js";

const GAME_DURATION_MS = 60000;
type PlayerTypedPayload = string | { typed: string; mistakes?: number };

export class Game {
  gameStatus: "not-started" | "in-progress" | "finished";
  gameId: string;
  players: { id: string; score: number; name: string; wpm: number; accuracy: number }[];
  io: Server;
  gameHost: string;
  paragraph: string;
  gameStartedAt: number | null;
  gameEndsAt: number | null;

  constructor(id: string, io: Server, host: string) {
    this.gameId = id;
    this.players = [];
    this.io = io;
    this.gameHost = host;
    this.gameStatus = "not-started";
    this.paragraph = "";
    this.gameStartedAt = null;
    this.gameEndsAt = null;
  }

  setupListeners(socket: Socket) {
    socket.on("start-game", async () => {
      if (this.gameStatus === "in-progress")
        return socket.emit("error", "The game has already started");

      if (this.gameHost !== socket.id) {
        return socket.emit(
          "error",
          "You are not the host of this game. Only the host can start the game.",
        );
      }

      for (const player of this.players) {
        player.score = 0;
        player.wpm = 0;
        player.accuracy = 0;
      }

      this.io.to(this.gameId).emit("players", this.players);

      const paragraph = await generateParagraph();
      this.paragraph = paragraph;
      this.gameStatus = "in-progress";
      this.gameStartedAt = Date.now();
      this.gameEndsAt = this.gameStartedAt + GAME_DURATION_MS;

      this.io
        .to(this.gameId)
        .emit("game-started", { paragraph, endsAt: this.gameEndsAt });

      setTimeout(() => {
        this.gameStatus = "finished";
        this.gameStartedAt = null;
        this.gameEndsAt = null;
        this.io.to(this.gameId).emit("game-finished");
        this.io.to(this.gameId).emit("players", this.players);
      }, GAME_DURATION_MS);
    });

    socket.on("player-typed", (payload: PlayerTypedPayload) => {
      if (this.gameStatus !== "in-progress")
        return socket.emit("error", "The game has not started yet");

      const typed =
        typeof payload === "string" ? payload : (payload.typed ?? "");
      const mistakes =
        typeof payload === "string"
          ? 0
          : Math.max(0, Math.floor(payload.mistakes ?? 0));
      const splittedParagraph = this.paragraph.trim().split(/\s+/);
      const splittedTyped = typed.trim().length === 0 ? [] : typed.trim().split(/\s+/);

      let score = 0;

      for (let i = 0; i < splittedTyped.length; i++) {
        if (splittedTyped[i] === splittedParagraph[i]) {
          score++;
        } else {
          break;
        }
      }

      const correctWords = splittedTyped.reduce((count, typedWord, index) => {
        return typedWord === splittedParagraph[index] ? count + 1 : count;
      }, 0);
      const totalAccuracyAttempts = correctWords + mistakes;
      const accuracy =
        totalAccuracyAttempts === 0
          ? 0
          : Math.round((correctWords / totalAccuracyAttempts) * 100);
      const elapsedMinutes = this.gameStartedAt
        ? Math.max((Date.now() - this.gameStartedAt) / 60000, 1 / 60)
        : 1;
      const wpm = score === 0 ? 0 : Math.round(score / elapsedMinutes);

      const player = this.players.find((player) => player.id === socket.id);

      if (player) {
        player.score = score;
        player.accuracy = accuracy;
        player.wpm = wpm;
      }

      this.io.to(this.gameId).emit("player-score", {
        id: socket.id,
        score,
        wpm,
        accuracy,
      });
    });

    socket.on("leave", () => {
      if (socket.id === this.gameHost) {
        this.players = this.players.filter((player) => player.id !== socket.id);

        if (this.players.length !== 0) {
          const nextHost = this.players[0];
          if (nextHost) {
            this.gameHost = nextHost.id;
          }
          this.io.to(this.gameId).emit("new-host", this.gameHost);
        } else {
          rooms.delete(this.gameId);
        }
      }

      socket.leave(this.gameId);
      this.players = this.players.filter((player) => player.id !== socket.id);
      this.io.to(this.gameId).emit("player-left", socket.id);
    });

    socket.on("disconnect", () => {
      if (socket.id === this.gameHost) {
        this.players = this.players.filter((player) => player.id !== socket.id);

        if (this.players.length !== 0) {
          const nextHost = this.players[0];
          if (nextHost) {
            this.gameHost = nextHost.id;
          }
        } else {
          rooms.delete(this.gameId);
        }
      }

      socket.leave(this.gameId);
      this.players = this.players.filter((player) => player.id !== socket.id);
    });
  }

  joinPlayer(id: string, name: string, socket: Socket) {
    if (this.gameStatus === "in-progress")
      return socket.emit(
        "error",
        "Game has already started, please wait for it to end before joining!",
      );

    this.players.push({ id, name, score: 0, wpm: 0, accuracy: 0 });
    this.io.to(this.gameId).emit("player-joined", {
      id,
      name,
      score: 0,
      wpm: 0,
      accuracy: 0,
    });

    socket.emit("players", this.players);
    socket.emit("new-host", this.gameHost);

    this.setupListeners(socket);
  }
}
