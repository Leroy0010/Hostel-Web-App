import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { useQueryClient } from '@tanstack/react-query';
import type { NotificationResponse } from '../types/notification.types';
import { toast } from 'sonner';
import { tokenManager } from '@/lib/tokenManager';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api/notification.api';
import { notificationKeys } from '../types/notification.keys';

export const useNotificationStomp = (isActive: boolean) => {
    const queryClient = useQueryClient();
    const token = tokenManager.getToken();
    const stompClient = useRef<Client | null>(null);

    const navigate = useNavigate();
    // Keep a stable ref to navigate so the STOMP subscription closure never goes stale
    const navigateRef = useRef(navigate);

    // ✅ FIX: Update the ref inside an effect so it runs safely after rendering
    useEffect(() => {
        navigateRef.current = navigate;
    });

    useEffect(() => {
        if (!isActive || !token) return;

        const client = new Client({
            webSocketFactory: () =>
                new WebSocket(import.meta.env.VITE_WEB_SOCKET_URL),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,

            // Dynamically look up the fresh token right before attempting the network frame connection
            beforeConnect: () => {
                const freshToken = tokenManager.getToken();
                if (freshToken) {
                    client.connectHeaders = {
                        Authorization: `Bearer ${freshToken}`,
                    };
                }
            },
        });

        client.onConnect = () => {
            // 1. Subscribe to new notification objects (for toasts & list updates)
            client.subscribe('/user/queue/notifications', (message) => {
                if (!message.body) return;

                try {
                    const notification: NotificationResponse = JSON.parse(
                        message.body
                    );

                    // Show UI Toast
                    toast(notification.title, {
                        description: notification.message,
                        duration: 6000,
                        action: notification.navigateUrl
                            ? {
                                  label: 'View',
                                  onClick: () => {
                                      notificationApi
                                          .markAsRead(notification.id)
                                          .then(() => {
                                              queryClient.invalidateQueries({
                                                  queryKey:
                                                      notificationKeys.all,
                                              });
                                          })
                                          .catch(() => {});

                                      navigateRef.current(
                                          notification.navigateUrl!
                                      );
                                  },
                              }
                            : undefined,
                    });

                    // Invalidate lists so the bell dropdown fetches the new item
                    queryClient.invalidateQueries({
                        queryKey: notificationKeys.all,
                    });
                } catch (error) {
                    console.error('❌ Failed to process STOMP message:', error);
                }
            });

            // 2. NEW: Subscribe directly to the unread count channel
            client.subscribe('/user/queue/unread-count', (message) => {
                if (!message.body) return;

                try {
                    // The backend sends { "count": 5 }
                    const data = JSON.parse(message.body);

                    // Instantly update the cache — AppLayout will react immediately
                    queryClient.setQueryData<{ count: number }>(
                        notificationKeys.unreadCount(),
                        data
                    );
                } catch (error) {
                    console.error(
                        '❌ Failed to process unread count update:',
                        error
                    );
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
    }, [token, queryClient, isActive]);

    return {
        getClient: () => stompClient.current,
    };
};
