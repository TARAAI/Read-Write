/* eslint-disable jsdoc/require-param */
import { wrapInDispatch } from '../extend/dispatchWrapper';
import { actionTypes } from '../../constants';

/**
 * Atomic operation with Firestore (either read or write).
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {Function} transactionPromise - Function which runs transaction
 * operation.
 * @returns {Promise} Resolves with result of transaction operation
 */
export function runTransaction(firebase, dispatch, transactionPromise) {
  return wrapInDispatch(dispatch, {
    ref: firebase.firestore(),
    method: 'runTransaction',
    args: [transactionPromise],
    types: [
      actionTypes.TRANSACTION_START,
      actionTypes.TRANSACTION_SUCCESS,
      actionTypes.TRANSACTION_FAILURE,
    ],
  });
}

export default {
  runTransaction,
};
