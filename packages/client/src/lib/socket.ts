import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socket.on('connect', () => console.log('[WS] Connected:', socket!.id));
    socket.on('disconnect', (reason) => console.log('[WS] Disconnected:', reason));
    socket.on('connect_error', (err) => console.warn('[WS] Error:', err.message));
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
