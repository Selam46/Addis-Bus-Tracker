import apiClient from './client';

export type NotificationType = 'BUS_APPROACHING' | 'SCHEDULE_CHANGE' | 'SYSTEM';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  typeLabel: string;
  typeIcon: string;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    unreadCount: number;
    notifications: NotificationItem[];
  };
}

export interface MarkReadResponse {
  success: boolean;
  message: string;
  data: {
    notification: NotificationItem;
  };
}

export interface MarkAllReadResponse {
  success: boolean;
  message: string;
  data: {
    updatedCount: number;
  };
}

export const notificationsApi = {
  /**
   * GET /api/notifications
   * List all notifications for the authenticated user (unread first).
   */
  getAll: async (): Promise<GetNotificationsResponse> => {
    const response = await apiClient.get<GetNotificationsResponse>('/notifications');
    return response.data;
  },

  /**
   * PUT /api/notifications/:id/read
   * Mark a single notification as read.
   */
  markAsRead: async (id: string): Promise<MarkReadResponse> => {
    const response = await apiClient.put<MarkReadResponse>(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * PUT /api/notifications/read-all
   * Mark all unread notifications as read.
   */
  markAllAsRead: async (): Promise<MarkAllReadResponse> => {
    const response = await apiClient.put<MarkAllReadResponse>('/notifications/read-all');
    return response.data;
  },
};

export default notificationsApi;
