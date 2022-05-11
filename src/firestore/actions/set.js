/* eslint-disable jsdoc/require-param */
import { wrapInDispatch } from '../extend/dispatchWrapper';
import { actionTypes } from '../../constants';
import { firestoreRef, getQueryConfig } from '../../utils/convertors';

/**
 * @deprecated - use createMutate
 * Set data to a document on Cloud Firestore with the call to
 * the Firebase library being wrapped in action dispatches.
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {string} queryOption - Options for query
 * @returns {Promise} Resolves with results of set call
 */
export function set(firebase, dispatch, queryOption, ...args) {
  const meta = getQueryConfig(queryOption);
  return wrapInDispatch(dispatch, {
    ref: firestoreRef(firebase, meta),
    method: 'set',
    meta,
    args,
    types: [
      actionTypes.SET_REQUEST,
      actionTypes.SET_SUCCESS,
      actionTypes.SET_FAILURE,
    ],
  });
}

export default {
  set,
};
