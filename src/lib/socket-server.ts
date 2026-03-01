import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, RoomConfig, RoomStateData } from '@/types/socket-events';
import type { GameState, PlayerState, FaceData } from '@/types/game';
import { createGameState, startGame, nextRound, processGuess, getWinner } from '@/engine/game-logic';
import { nanoid } from 'nanoid';

const PLAYER_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

interface RoomPlayer {
  socketId: string;
  player: PlayerState;
}

interface RoomState {
  roomCode: string;
  hostSocketId: string;
  config: RoomConfig;
  players: Map<string, RoomPlayer>;
  gameState: GameState | null;
  timerInterval: ReturnType<typeof setInterval> | null;
  timerSecondsLeft: number;
}

const rooms = new Map<string, RoomState>();

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function emitRoomState(io: TypedServer, room: RoomState) {
  const players = Array.from(room.players.values()).map((p) => p.player);
  const data: RoomStateData = {
    roomCode: room.roomCode,
    players,
    hostId: room.players.get(room.hostSocketId)?.player.id || '',
    status: room.gameState
      ? room.gameState.status === 'finished'
        ? 'finished'
        : 'playing'
      : 'lobby',
    config: room.config,
  };
  io.to(room.roomCode).emit('room-state', data);
}

function clearRoomTimer(room: RoomState) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

function startRoundTimer(io: TypedServer, room: RoomState) {
  clearRoomTimer(room);
  if (!room.config.timerSeconds || !room.gameState) return;

  room.timerSecondsLeft = room.config.timerSeconds;

  room.timerInterval = setInterval(() => {
    room.timerSecondsLeft--;
    io.to(room.roomCode).emit('timer-tick', { secondsLeft: room.timerSecondsLeft });

    if (room.timerSecondsLeft <= 0) {
      clearRoomTimer(room);
      io.to(room.roomCode).emit('timer-expired');

      if (room.gameState && room.gameState.status === 'playing') {
        room.gameState = nextRound(room.gameState);
        const scores: Record<string, number> = {};
        room.gameState.players.forEach((p) => { scores[p.id] = p.score; });

        if (room.gameState.status === 'finished') {
          const winner = getWinner(room.gameState);
          io.to(room.roomCode).emit('game-over', {
            players: room.gameState.players,
            winnerId: winner?.id || '',
          });
        } else {
          io.to(room.roomCode).emit('round-advanced', {
            round: room.gameState.round,
            currentRound: room.gameState.currentRound,
            scores,
          });
          startRoundTimer(io, room);
        }
      }
    }
  }, 1000);
}

export function setupSocketHandlers(io: TypedServer) {
  io.on('connection', (socket) => {
    let currentRoomCode: string | null = null;

    socket.on('create-room', (data, callback) => {
      const roomCode = nanoid(6).toUpperCase();
      const playerId = 'player-0';
      const player: PlayerState = {
        id: playerId,
        name: data.hostName,
        score: 0,
        color: PLAYER_COLORS[0],
      };

      const room: RoomState = {
        roomCode,
        hostSocketId: socket.id,
        config: {
          deckId: data.deckId,
          difficulty: data.difficulty,
          totalRounds: data.totalRounds,
          timerSeconds: data.timerSeconds,
          drunkMode: data.drunkMode,
        },
        players: new Map([[socket.id, { socketId: socket.id, player }]]),
        gameState: null,
        timerInterval: null,
        timerSecondsLeft: 0,
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      currentRoomCode = roomCode;
      callback({ roomCode });
      emitRoomState(io, room);
    });

    socket.on('join-room', (data, callback) => {
      const room = rooms.get(data.roomCode);
      if (!room) {
        callback({ success: false, error: 'Sala no encontrada' });
        return;
      }
      if (room.gameState) {
        callback({ success: false, error: 'La partida ya empezó' });
        return;
      }
      if (room.players.size >= 6) {
        callback({ success: false, error: 'Sala llena (máx 6)' });
        return;
      }

      const playerIndex = room.players.size;
      const playerId = `player-${playerIndex}`;
      const player: PlayerState = {
        id: playerId,
        name: data.playerName,
        score: 0,
        color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
      };

      room.players.set(socket.id, { socketId: socket.id, player });
      socket.join(data.roomCode);
      currentRoomCode = data.roomCode;
      callback({ success: true });
      io.to(data.roomCode).emit('player-joined', { player });
      emitRoomState(io, room);
    });

    socket.on('start-game', async (data) => {
      const room = rooms.get(data.roomCode);
      if (!room || socket.id !== room.hostSocketId) return;
      if (room.players.size < 2) return;

      try {
        // Import prisma dynamically (server-side only)
        const { prisma } = await import('./prisma');
        const deck = await prisma.deck.findUnique({
          where: { id: room.config.deckId },
          include: { faces: true },
        });
        if (!deck) {
          socket.emit('error', { message: 'Mazo no encontrado' });
          return;
        }

        const faces: FaceData[] = deck.faces.map((f) => ({
          id: f.id,
          label: f.label,
          imageUrl: f.imageUrl,
        }));

        const playerNames = Array.from(room.players.values()).map((p) => p.player.name);

        const state = createGameState(
          nanoid(8),
          room.config.deckId,
          faces,
          room.config.difficulty,
          playerNames,
          room.config.totalRounds,
          'online',
          room.config.timerSeconds,
          room.config.drunkMode
        );

        room.gameState = startGame(state);

        // Update player IDs to match the room players
        const playerEntries = Array.from(room.players.values());
        room.gameState.players = room.gameState.players.map((p, i) => ({
          ...p,
          id: playerEntries[i]?.player.id || p.id,
          name: playerEntries[i]?.player.name || p.name,
          color: playerEntries[i]?.player.color || p.color,
        }));

        io.to(data.roomCode).emit('game-started', { gameState: room.gameState });
        startRoundTimer(io, room);
      } catch (err) {
        console.error('[socket] Error starting game:', err);
        socket.emit('error', { message: 'Error al iniciar partida' });
      }
    });

    socket.on('guess', (data) => {
      const room = rooms.get(data.roomCode);
      if (!room || !room.gameState || room.gameState.status !== 'playing') return;

      const playerEntry = room.players.get(socket.id);
      if (!playerEntry) return;

      const { correct, newState } = processGuess(
        room.gameState,
        playerEntry.player.id,
        data.faceIndex
      );
      room.gameState = newState;

      const scores: Record<string, number> = {};
      newState.players.forEach((p) => { scores[p.id] = p.score; });

      io.to(data.roomCode).emit('guess-result', {
        playerId: playerEntry.player.id,
        playerName: playerEntry.player.name,
        correct,
        faceIndex: data.faceIndex,
        scores,
      });

      if (correct) {
        if (newState.status === 'finished') {
          clearRoomTimer(room);
          const winner = getWinner(newState);
          io.to(data.roomCode).emit('game-over', {
            players: newState.players,
            winnerId: winner?.id || '',
          });
        } else {
          io.to(data.roomCode).emit('round-advanced', {
            round: newState.round,
            currentRound: newState.currentRound,
            scores,
          });
          startRoundTimer(io, room);
        }
      }
    });

    socket.on('leave-room', (data) => {
      handleLeave(io, socket.id, data.roomCode);
      currentRoomCode = null;
    });

    socket.on('disconnect', () => {
      if (currentRoomCode) {
        handleLeave(io, socket.id, currentRoomCode);
      }
    });
  });
}

function handleLeave(io: TypedServer, socketId: string, roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const playerEntry = room.players.get(socketId);
  room.players.delete(socketId);

  if (room.players.size === 0) {
    clearRoomTimer(room);
    rooms.delete(roomCode);
    return;
  }

  if (playerEntry) {
    io.to(roomCode).emit('player-left', {
      playerId: playerEntry.player.id,
      playerName: playerEntry.player.name,
    });
  }

  // If host left, reassign
  if (socketId === room.hostSocketId) {
    const newHost = room.players.values().next().value;
    if (newHost) {
      room.hostSocketId = newHost.socketId;
    }
  }

  emitRoomState(io, room);
}
