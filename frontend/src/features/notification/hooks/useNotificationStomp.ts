import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationResponse } from '../types/notification.types';
import { toast } from 'sonner';
import { tokenManager } from '@/lib/tokenManager';

export const useNotificationStomp = () => {
    const queryClient = useQueryClient();
    const token = tokenManager.getToken();
    const stompClient = useRef<Client | null>(null);

    useEffect(() => {
        if (!token) return;

        const client = new Client({
            webSocketFactory: () =>
                new SockJS(`${import.meta.env.VITE_API_BASE_URL}/ws`),
            connectHeaders: {
                Authorization: `Bearer ${token}`,
            },
            debug: (str) => {
                if (import.meta.env.DEV) console.log(str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            client.subscribe('/user/queue/notifications', (message) => {
                if (message.body) {
                    const newNotification: NotificationResponse = JSON.parse(
                        message.body
                    );

                    // 1. Show UI Toast
                    toast(newNotification.title, {
                        description: newNotification.message,
                    });

                    // 2. Optimistically update React Query cache for the unread count
                    queryClient.setQueryData<{ count: number }>(
                        ['notifications', 'unread-count'],
                        (old) => ({
                            count: (old?.count || 0) + 1,
                        })
                    );

                    // 3. Invalidate the notification list to refetch the top of the feed
                    queryClient.invalidateQueries({
                        queryKey: ['notifications', 'list'],
                    });
                }
            });
        };

        client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
            console.error('Additional details: ' + frame.body);
        };

        client.activate();
        stompClient.current = client;

        return () => {
            client.deactivate();
        };
    }, [token, queryClient]);

    // FIX: Return a getter function instead of accessing .current directly during render
    return {
        getClient: () => stompClient.current,
    };
};
