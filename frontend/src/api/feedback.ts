import apiClient from './client';

export type FeedbackStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED';

export interface FeedbackCategory {
  value: string;
  label: string;
  icon: string;
}

export interface FeedbackRouteInfo {
  id: string;
  routeNumber: string;
  name: string;
  color: string;
}

export interface FeedbackItem {
  id: string;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  message: string;
  status: FeedbackStatus;
  statusLabel: string;
  statusColor: string;
  route: FeedbackRouteInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetCategoriesResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    categories: FeedbackCategory[];
  };
}

export interface SubmitFeedbackParams {
  category: string;
  message: string;
  routeId?: string;
}

export interface SubmitFeedbackResponse {
  success: boolean;
  message: string;
  data: {
    feedback: FeedbackItem;
  };
}

export interface GetMyFeedbackResponse {
  success: boolean;
  message: string;
  data: {
    count: number;
    feedback: FeedbackItem[];
  };
}

export interface GetFeedbackByIdResponse {
  success: boolean;
  message: string;
  data: {
    feedback: FeedbackItem;
  };
}

export const feedbackApi = {
  /**
   * GET /api/feedback/categories
   * Retrieves the full list of valid complaint categories.
   */
  getCategories: async (): Promise<GetCategoriesResponse> => {
    const response = await apiClient.get<GetCategoriesResponse>('/feedback/categories');
    return response.data;
  },

  /**
   * POST /api/feedback
   * Submits a new complaint or feedback entry.
   */
  submit: async (params: SubmitFeedbackParams): Promise<SubmitFeedbackResponse> => {
    const response = await apiClient.post<SubmitFeedbackResponse>('/feedback', params);
    return response.data;
  },

  /**
   * GET /api/feedback/my
   * Returns all feedback submissions made by the currently logged-in passenger.
   */
  getMyFeedback: async (): Promise<GetMyFeedbackResponse> => {
    const response = await apiClient.get<GetMyFeedbackResponse>('/feedback/my');
    return response.data;
  },

  /**
   * GET /api/feedback/:id
   * Returns a single feedback record by its ID.
   */
  getById: async (id: string): Promise<GetFeedbackByIdResponse> => {
    const response = await apiClient.get<GetFeedbackByIdResponse>(`/feedback/${id}`);
    return response.data;
  },
};

export default feedbackApi;
