/* eslint-disable jsdoc/require-param */
import every from 'lodash/every';
import { wrapInDispatch } from '../extend/dispatchWrapper';
import { actionTypes } from '../../constants';
import { firestoreRef, getQueryConfig } from '../../utils';

/**
 * Delete a reference on Cloud Firestore with the call to the Firebase library
 * being wrapped in action dispatches. If attempting to delete a collection
 * delete promise will be rejected with "Only documents can be deleted" unless
 * onAttemptCollectionDelete is provided. This is due to the fact that
 * Collections can not be deleted from a client, it should instead be handled
 * within a cloud function.
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {string} queryOption - Options for query
 * @returns {Promise} Resolves with results of update call
 */
export function deleteRef(firebase, dispatch, queryOption) {
  const meta = getQueryConfig(queryOption);
  const { config } = firebase._;
  if (
    !meta.doc ||
    (meta.subcollections && !every(meta.subcollections, 'doc'))
  ) {
    if (typeof config.onAttemptCollectionDelete === 'function') {
      return config.onAttemptCollectionDelete(queryOption, dispatch, firebase);
    }
    return Promise.reject(new Error('Only documents can be deleted.'));
  }
  return wrapInDispatch(dispatch, {
    ref: firestoreRef(firebase, meta),
    method: 'delete',
    meta,
    types: [
      actionTypes.DELETE_REQUEST,
      {
        type: actionTypes.DELETE_SUCCESS,
        preserve: firebase._.config.preserveOnDelete,
      },
      actionTypes.DELETE_FAILURE,
    ],
  });
}

export default {
  deleteRef,
};
