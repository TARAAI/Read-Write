import HANDLERS from './handlers';
import { getQueryName } from '../../utils';

/**
 * @name cacheReducer
 * Reducer for in-memory database
 * @param {object} [state={}] - Current listenersById redux state
 * @param {object} action - Object containing the action that was dispatched
 * @param {string} action.type - Type of action that was dispatched
 * @returns {object} Queries state
 */
export default function cacheReducer(state = {}, action) {
  const fnc = HANDLERS[action.type];
  if (!fnc) return state;

  const key =
    !action.meta || !(action.meta.path || action.meta.collection)
      ? null
      : action.meta.storeAs || getQueryName(action.meta);
  const path = !action.meta ? null : action.meta.path || action.meta.collection;

  return fnc(state, { action, key, path });
}
