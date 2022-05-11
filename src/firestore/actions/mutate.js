/* eslint-disable jsdoc/require-param */
import { wrapInDispatch } from '../extend/dispatchWrapper';
import { actionTypes } from '../../constants';
import { convertReadProviders } from '../extend/mutate';

/**
 * Unified solo, batch & transactions operations.
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {string} mutations - Mutations for query
 * @returns {Promise} Resolves with results of update call
 */
export function mutate(firebase, dispatch, mutations) {
  const timestamp = `${+new Date()}`;

  convertReadProviders(mutations);

  return wrapInDispatch(dispatch, {
    ref: firebase,
    method: 'mutate',
    meta: { timestamp },
    args: [mutations],
    types: [
      {
        type: actionTypes.MUTATE_START,
        payload: { data: mutations },
      },
      actionTypes.MUTATE_SUCCESS,
      {
        type: actionTypes.MUTATE_FAILURE,
        meta: { timestamp },
        payload: { data: mutations },
      },
    ],
  });
}

export default {
  mutate,
};
