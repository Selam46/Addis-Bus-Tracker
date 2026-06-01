import { create } from 'zustand';
import { NotificationType } from '../api/notifications';

export interface LocalNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  typeLabel: string;
  typeIcon: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  localNotifications: LocalNotification[];
  addNotification: (
    title: string,
    body: string,
    typeLabel: string,
    type?: NotificationType,
    typeIcon?: string
  ) => void;
  clearAll: () => void;
  markAllRead: () => void;
  markAsRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  localNotifications: [
    {
      id: 'welcome-notification',
      title: 'Welcome to Addis Bus Tracker! 🚍',
      body: 'Get real-time ETAs, schedules, and active route paths for your daily commute. Save favorite routes from your home screen for quick access.',
      type: 'SYSTEM',
      typeLabel: 'System Update',
      typeIcon: 'bell',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    }
  ],
  addNotification: (title, body, typeLabel, type = 'SYSTEM', typeIcon = 'bell') => {
    const newNotif: LocalNotification = {
      id: `local-${Date.now()}`,
      title,
      body,
      type,
      typeLabel,
      typeIcon,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      localNotifications: [newNotif, ...state.localNotifications],
    }));
  },
  clearAll: () => set({ localNotifications: [] }),
  markAllRead: () => set((state) => ({
    localNotifications: state.localNotifications.map(n => ({ ...n, isRead: true }))
  })),
  markAsRead: (id) => set((state) => ({
    localNotifications: state.localNotifications.map(n => n.id === id ? { ...n, isRead: true } : n)
  }))
}));

export default useNotificationStore;
