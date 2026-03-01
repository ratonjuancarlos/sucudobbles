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
    globalSocket = io({
      path: '/api/socketio',
      autoConnect: true,
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
