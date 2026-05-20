/*
 * Copyright (C) 2026 LCV Ideas & Software
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import './Notification.css';

interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface NotificationContextType {
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false,
  );
  const notificationId = useRef(0);
  const timeoutMap = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const maxNotifications = 4;

  const removeNotification = useCallback((id: number) => {
    const timeoutRef = timeoutMap.current.get(id);
    if (timeoutRef) {
      clearTimeout(timeoutRef);
      timeoutMap.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = notificationId.current++;
      const newNotification: Notification = { id, message, type };

      setNotifications((prev) => {
        const next = [...prev, newNotification];
        if (next.length <= maxNotifications) return next;
        const [oldest, ...rest] = next;
        const oldTimeout = timeoutMap.current.get(oldest.id);
        if (oldTimeout) {
          clearTimeout(oldTimeout);
          timeoutMap.current.delete(oldest.id);
        }
        return rest;
      });

      const timeout = setTimeout(() => removeNotification(id), 5000);
      timeoutMap.current.set(id, timeout);
    },
    [removeNotification],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(max-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div
        className={`notification-container ${isMobile ? 'notification-container-mobile' : 'notification-container-desktop'}`}
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification notification-${notification.type}`}>
            <div className="notification-body">
              <span className="notification-message">{notification.message}</span>
              <button
                type="button"
                className="notification-close"
                onClick={() => removeNotification(notification.id)}
                aria-label="Fechar notificação"
              >
                ×
              </button>
            </div>
            <span className="notification-progress" />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
