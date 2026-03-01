'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket-events';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Singleton socket: shared across all components so navigating
// between pages doesn't disconnect and destroy the room.
let globalSocket: TypedSocket | null = null;
let refCount = 0;

function getSocket(): TypedSocket {
  if (!globalSocket) {
    console.log('[socket] Creating new socket connection');
    globalSocket = io({
      path: '/api/socketio',
      autoConnect: true,
    });
    globalSocket.on('connect', () => {
      console.log('[socket] Connected, id:', globalSocket?.id, 'transport:', globalSocket?.io?.engine?.transport?.name);
    });
    globalSocket.on('disconnect', (reason) => {
      console.log('[socket] Disconnected, reason:', reason);
    });
    globalSocket.on('connect_error', (err) => {
      console.log('[socket] Connection error:', err.message);
    });
    globalSocket.io.on('reconnect_attempt', (attempt) => {
      console.log('[socket] Reconnect attempt #', attempt);
    });
    globalSocket.io.on('reconnect', (attempt) => {
      console.log('[socket] Reconnected after', attempt, 'attempts, new id:', globalSocket?.id);
    });
  }
  return globalSocket;
}

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    refCount++;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      refCount--;

      if (refCount === 0) {
        socket.disconnect();
        globalSocket = null;
      }
    };
  }, []);

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      socketRef.current?.emit(event, ...args);
    },
    []
  );

  const on = useCallback(
    <E extends keyof ServerToClientEvents>(
      event: E,
      handler: ServerToClientEvents[E]
    ) => {
      const socket = socketRef.current;
      if (!socket) return () => {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).on(event, handler);
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (socket as any).off(event, handler);
      };
    },
    []
  );

  return { socket: socketRef, connected, emit, on };
}
