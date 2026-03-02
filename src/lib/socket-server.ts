import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, RoomConfig, RoomStateData } from '@/types/socket-events';
import type { GameState, PlayerState, FaceData } from '@/types/game';
import { createGameState, startGame, nextRound, processGuess, getWinner } from '@/engine/game-logic';
import { nanoid } from 'nanoid';

const PLAYER_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

// Grace period before deleting rooms after last player disconnects (ms)
const ROOM_CLEANUP_DELAY = 30_000;

interface RoomPlayer {
  socketId: string;
  player: PlayerState;
}

interface RoomState {
  roomCode: string;
  hostSocketId: string;
  config: RoomConfig;
  players: Map<string, RoomPlayer>;
  // Map playerName → RoomPlayer for reconnection lookup
  playersByName: Map<string, RoomPlayer>;
  gameState: GameState | null;
  timerInterval: ReturnType<typeof setInterval> | null;
  timerSecondsLeft: number;
  cleanupTimeout: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, RoomState>();

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function log(tag: string, ...args: unknown[]) {
  console.log(`[socket:${tag}]`, ...args);
}

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

function cancelCleanup(room: RoomState) {
  if (room.cleanupTimeout) {
    clearTimeout(room.cleanupTimeout);
    room.cleanupTimeout = null;
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
  log('init', `Socket server initialized. Active rooms: ${rooms.size}`);

  io.on('connection', (socket) => {
    let currentRoomCode: string | null = null;
    log('connect', `Socket ${socket.id} connected`);

    socket.on('create-room', (data, callback) => {
      const roomCode = nanoid(6).toUpperCase();
      const playerId = 'player-0';
      const player: PlayerState = {
        id: playerId,
        name: data.hostName,
        score: 0,
        color: PLAYER_COLORS[0],
      };

      const roomPlayer: RoomPlayer = { socketId: socket.id, player };

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
        players: new Map([[socket.id, roomPlayer]]),
        playersByName: new Map([[data.hostName, roomPlayer]]),
        gameState: null,
        timerInterval: null,
        timerSecondsLeft: 0,
        cleanupTimeout: null,
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      currentRoomCode = roomCode;

      log('create-room', `Room ${roomCode} created by ${data.hostName} (socket ${socket.id}). Total rooms: ${rooms.size}`);

      callback({ roomCode });
      emitRoomState(io, room);
    });

    socket.on('join-room', (data, callback) => {
      const code = data.roomCode.trim().toUpperCase();
      log('join-room', `Socket ${socket.id} trying to join room ${code} as "${data.playerName}". Existing rooms: [${Array.from(rooms.keys()).join(', ')}]`);

      const room = rooms.get(code);
      if (!room) {
        log('join-room', `Room ${code} NOT FOUND`);
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

      // Cancel any pending cleanup
      cancelCleanup(room);

      const playerIndex = room.players.size;
      const playerId = `player-${playerIndex}`;
      const player: PlayerState = {
        id: playerId,
        name: data.playerName,
        score: 0,
        color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
      };

      const roomPlayer: RoomPlayer = { socketId: socket.id, player };
      room.players.set(socket.id, roomPlayer);
      room.playersByName.set(data.playerName, roomPlayer);
      socket.join(code);
      currentRoomCode = code;

      log('join-room', `Player "${data.playerName}" joined room ${code}. Players: ${room.players.size}`);

      callback({ success: true });
      io.to(code).emit('player-joined', { player });
      emitRoomState(io, room);
    });

    // Rejoin: lobby page emits this on mount/reconnect to re-associate socket with room
    socket.on('rejoin-room', (data, callback) => {
      const code = data.roomCode.trim().toUpperCase();
      log('rejoin-room', `Socket ${socket.id} trying to rejoin room ${code} as "${data.playerName}". Existing rooms: [${Array.from(rooms.keys()).join(', ')}]`);

      const room = rooms.get(code);
      if (!room) {
        log('rejoin-room', `Room ${code} NOT FOUND`);
        callback({ success: false, error: 'Sala no encontrada' });
        return;
      }

      // Cancel any pending cleanup
      cancelCleanup(room);

      // Check if this socket is already in the room
      if (room.players.has(socket.id)) {
        log('rejoin-room', `Socket ${socket.id} already in room ${code}`);
        socket.join(code);
        currentRoomCode = code;
        callback({ success: true });
        emitRoomState(io, room);
        return;
      }

      // Try to find the player by name (reconnection with new socket ID)
      const existing = room.playersByName.get(data.playerName);
      if (existing) {
        const oldSocketId = existing.socketId;
        // Remove old socket mapping
        room.players.delete(oldSocketId);
        // Update socket ID
        existing.socketId = socket.id;
        room.players.set(socket.id, existing);

        // Update host socket if this was the host (compare against OLD socket ID)
        if (room.hostSocketId === oldSocketId || !room.players.has(room.hostSocketId)) {
          room.hostSocketId = socket.id;
        }

        socket.join(code);
        currentRoomCode = code;

        log('rejoin-room', `Player "${data.playerName}" reconnected to room ${code} with new socket ${socket.id}`);
        callback({ success: true });
        emitRoomState(io, room);
        return;
      }

      // Player not found by name — if game hasn't started, add as new player
      if (!room.gameState && room.players.size < 6) {
        const playerIndex = room.playersByName.size;
        const playerId = `player-${playerIndex}`;
        const player: PlayerState = {
          id: playerId,
          name: data.playerName,
          score: 0,
          color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
        };

        const roomPlayer: RoomPlayer = { socketId: socket.id, player };
        room.players.set(socket.id, roomPlayer);
        room.playersByName.set(data.playerName, roomPlayer);
        socket.join(code);
        currentRoomCode = code;

        log('rejoin-room', `New player "${data.playerName}" added to room ${code} via rejoin`);
        callback({ success: true });
        io.to(code).emit('player-joined', { player });
        emitRoomState(io, room);
        return;
      }

      log('rejoin-room', `Cannot rejoin room ${code}: game in progress or full`);
      callback({ success: false, error: 'No se pudo reconectar a la sala' });
    });

    socket.on('start-game', async (data) => {
      const room = rooms.get(data.roomCode);
      if (!room || socket.id !== room.hostSocketId) return;
      if (room.players.size < 2) return;

      try {
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
          room.config.drunkMode,
          'turns'
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

        log('start-game', `Game started in room ${data.roomCode} with ${playerNames.length} players`);

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

      // Ignore stale guesses from a previous round
      if (room.gameState.round && data.roundNumber !== room.gameState.round.roundNumber) return;

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

      // Always advance the round after any guess (correct or not)
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
    });

    socket.on('leave-room', (data) => {
      log('leave-room', `Socket ${socket.id} leaving room ${data.roomCode}`);
      handleLeave(io, socket.id, data.roomCode);
      currentRoomCode = null;
    });

    socket.on('disconnect', () => {
      log('disconnect', `Socket ${socket.id} disconnected (room: ${currentRoomCode})`);
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
    // Don't delete immediately — give a grace period for reconnection
    log('leave', `Room ${roomCode} has 0 connected players, scheduling cleanup in ${ROOM_CLEANUP_DELAY / 1000}s`);
    cancelCleanup(room);
    room.cleanupTimeout = setTimeout(() => {
      // Check again — someone might have rejoined
      if (room.players.size === 0) {
        log('cleanup', `Deleting room ${roomCode} (no reconnections)`);
        clearRoomTimer(room);
        rooms.delete(roomCode);
      }
    }, ROOM_CLEANUP_DELAY);
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
