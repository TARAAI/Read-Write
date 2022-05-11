/* eslint-disable jsdoc/require-param */
import { wrapInDispatch } from '../extend/dispatchWrapper';
import { actionTypes } from '../../constants';
import { firestoreRef, getQueryConfig } from '../../utils/convertors';

/**
 * @deprecated - use createMutate
 * Update a document on Cloud Firestore with the call to the Firebase library
 * being wrapped in action dispatches.
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {string} queryOption - Options for query
 * @returns {Promise} Resolves with results of update call
 */
export function update(firebase, dispatch, queryOption, ...args) {
  const meta = getQueryConfig(queryOption);
  return wrapInDispatch(dispatch, {
    ref: firestoreRef(firebase, meta),
    method: 'update',
    meta,
    args,
    types: [
      actionTypes.UPDATE_REQUEST,
      actionTypes.UPDATE_SUCCESS,
      actionTypes.UPDATE_FAILURE,
    ],
  });
}

export default {
  update,
};
