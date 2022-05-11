/* eslint-disable jsdoc/require-param */
import { wrapInDispatch } from '../extend/dispatchWrapper';
import { actionTypes } from '../../constants';
import { firestoreRef, getQueryConfig } from '../../utils/convertors';
import { snapshotCache } from '../../utils/listener';

/**
 * @deprecated - use createMutate
 * Add data to a collection or document on Cloud Firestore with the call to
 * the Firebase library being wrapped in action dispatches.
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {string} queryOption - Options for query
 * @returns {Promise} Resolves with results of add call
 */
export function add(firebase, dispatch, queryOption, ...args) {
  const meta = getQueryConfig(queryOption);
  return wrapInDispatch(dispatch, {
    ref: firestoreRef(firebase, meta),
    method: 'add',
    meta,
    args,
    types: [
      actionTypes.ADD_REQUEST,
      {
        type: actionTypes.ADD_SUCCESS,
        payload: (snap) => {
          const obj = { id: snap.id, data: args[0] };
          snapshotCache.set(obj, snap);
          return obj;
        },
      },
      actionTypes.ADD_FAILURE,
    ],
  });
}

export default {
  add,
};
