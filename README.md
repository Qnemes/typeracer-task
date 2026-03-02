# Typeracer Task

Realtime multiplayer typing game built as a pnpm + Turborepo monorepo.

## Live Deployments

- Frontend: https://typeracer-task.vercel.app/
- Backend: https://typeracer-task.onrender.com/

## Technologies Used

- Monorepo: Turborepo, pnpm workspaces
- Frontend: Next.js 16, React 19, TypeScript
- UI: Tailwind CSS 4, shadcn/ui, Radix UI, Sonner
- Realtime communication: Socket.IO (`socket.io` + `socket.io-client`)
- Backend: Node.js HTTP server + TypeScript
- Tooling: ESLint, Prettier

## Basic Features

- Create a game and generate a unique invite code
- Join existing rooms using an invite code
- Realtime multiplayer updates over WebSockets
- Host-controlled game start and automatic host reassignment
- 60-second typing rounds with live countdown timer
- Live leaderboard with score, WPM, and accuracy
- Paragraph generation from an external API with local fallback text

## Local Development

### Prerequisites

- Node.js 18+
- pnpm 9+

### Setup

```bash
pnpm install
```

### Environment Variables

Create/update `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:4000
```

### Run

1. Start backend:

```bash
pnpm --filter backend dev
```

2. Start frontend (in a second terminal):

```bash
pnpm --filter frontend dev
```

3. Open the app:

```text
http://localhost:3000
```
