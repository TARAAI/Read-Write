/* eslint-disable jsdoc/require-param */
import { wrapInDispatch } from '../extend/dispatchWrapper';
import { actionTypes } from '../../constants';
import {
  firestoreRef,
  getQueryConfig,
  dataByIdSnapshot,
  orderedFromSnap,
} from '../../utils';

/**
 * Get a collection or document from Cloud Firestore with the call to
 * the Firebase library being wrapped in action dispatches.
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {string} queryOption - Options for query
 * @returns {Promise} Resolves with results of get call
 */
export function get(firebase, dispatch, queryOption) {
  const meta = getQueryConfig(queryOption);
  // Wrap get call in dispatch calls
  const {
    mergeOrdered,
    mergeOrderedDocUpdates,
    mergeOrderedCollectionUpdates,
  } = firebase._.config || {};
  return wrapInDispatch(dispatch, {
    ref: firestoreRef(firebase, meta),
    method: 'get',
    meta,
    types: [
      actionTypes.GET_REQUEST,
      {
        type: actionTypes.GET_SUCCESS,
        payload: (snap = {}) => ({
          data: dataByIdSnapshot(snap),
          ordered: orderedFromSnap(snap),
          fromCache:
            snap.metadata && typeof snap.metadata.fromCache === 'boolean'
              ? snap.metadata.fromCache
              : true,
        }),
        merge: {
          docs: mergeOrdered && mergeOrderedDocUpdates,
          collections: mergeOrdered && mergeOrderedCollectionUpdates,
        },
      },
      actionTypes.GET_FAILURE,
    ],
  });
}

export default {
  get,
};
