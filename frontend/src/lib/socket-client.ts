import { io, Socket } from 'socket.io-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let socketInstance: Socket | null = null;

export function getSocket(token?: string): Socket {
  const authToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      auth: {
        token: authToken,
      },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  } else if (authToken) {
    socketInstance.auth = { token: authToken };
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
