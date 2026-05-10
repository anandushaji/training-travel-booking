import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from './store';
import type { RootState } from './rootReducer';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector<RootState, T>(selector);
