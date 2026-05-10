import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer, {
  addNotification,
  removeNotification,
} from './notificationSlice';

function makeStore() {
  return configureStore({ reducer: { notifications: notificationsReducer } });
}

describe('notificationSlice', () => {
  it('should add and remove notifications', () => {
    const store = makeStore();

    store.dispatch(addNotification({ message: 'Hello', severity: 'success' }));
    let state = store.getState().notifications;
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]?.message).toBe('Hello');
    expect(state.queue[0]?.severity).toBe('success');

    const id = state.queue[0]!.id;
    store.dispatch(removeNotification(id));
    state = store.getState().notifications;
    expect(state.queue).toHaveLength(0);
  });
});
