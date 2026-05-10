import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';

export type NotificationSeverity = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  message: string;
  severity: NotificationSeverity;
}

interface NotificationsState {
  queue: Notification[];
}

const initialState: NotificationsState = {
  queue: [],
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: {
      reducer(state, action: PayloadAction<Notification>) {
        state.queue.push(action.payload);
      },
      prepare(payload: Omit<Notification, 'id'>) {
        return { payload: { ...payload, id: nanoid() } };
      },
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.queue = state.queue.filter((n) => n.id !== action.payload);
    },
  },
});

export const { addNotification, removeNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
