import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { getServerUrls } from '../api/client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!user || !token) return;

    const { socket_url } = getServerUrls();
    const newSocket = io(socket_url, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('join_room', user._id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  return socket;
};
