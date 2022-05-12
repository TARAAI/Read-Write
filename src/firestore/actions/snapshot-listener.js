/* eslint-disable jsdoc/require-param */
import { actionTypes } from '../../constants';
import {
  resource,
  firestoreRef,
  getQueryConfig,
  getQueryName,
  attachListener,
  detachListener,
  dispatchListenerResponse,
  getPopulateActions,
} from '../../utils';

/**
 * Set listener to Cloud Firestore with the call to the Firebase library
 * being wrapped in action dispatches.. Internal calls Firebase's onSnapshot()
 * method.
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {string} queryOpts - Options for query
 * @param {string} queryOpts.collection - Collection name
 * @param {string} queryOpts.doc - Document name
 * @param {Array} queryOpts.where - Where settings for query. Array of strings
 * for one where, an Array of Arrays for multiple wheres
 * @param  {Function} successCb - Callback called on success
 * @param  {Function} errorCb - Callback called on error
 * @returns {Function} Unsubscribe
 */
export function setListener(firebase, dispatch, queryOpts, successCb, errorCb) {
  const meta = getQueryConfig(queryOpts);
  const done = resource(meta, getQueryName);

  // Create listener
  const success = (docData) => {
    done(docData.size);

    // Dispatch directly if no populates
    if (!meta.populates) {
      dispatchListenerResponse({ dispatch, docData, meta, firebase });
      // Invoke success callback if it exists
      if (typeof successCb === 'function') successCb(docData);
      return;
    }

    /* istanbul ignore next: populations are deprecated */
    getPopulateActions({ firebase, docData, meta })
      .then((populateActions) => {
        // Dispatch each populate action
        populateActions.forEach((populateAction) => {
          dispatch({
            ...populateAction,
            type: actionTypes.LISTENER_RESPONSE,
            timestamp: Date.now(),
          });
        });
        // Dispatch original action
        dispatchListenerResponse({ dispatch, docData, meta, firebase });
      })
      .catch((populateErr) => {
        const { logListenerError } = firebase._.config || {};
        // Handle errors in population
        if (logListenerError !== false) {
          // Log error handling the case of it not existing
          if (
            logListenerError !== false &&
            !!console &&
            typeof console.error === 'function' // eslint-disable-line no-console
          ) {
            console.error('redux-firestore error populating:', populateErr); // eslint-disable-line no-console
          }
        }
        if (typeof errorCb === 'function') errorCb(populateErr);
      });
  };

  const error = (err) => {
    done(0);
    const {
      mergeOrdered,
      mergeOrderedDocUpdates,
      mergeOrderedCollectionUpdates,
      logListenerError,
      preserveOnListenerError,
    } = firebase._.config || {};

    dispatch({
      type: actionTypes.LISTENER_ERROR,
      meta,
      payload: err,
      merge: {
        docs: mergeOrdered && mergeOrderedDocUpdates,
        collections: mergeOrdered && mergeOrderedCollectionUpdates,
      },
      preserve: preserveOnListenerError,
    });
    // Invoke error callback if it exists
    if (typeof errorCb === 'function') errorCb(err);
  };

  const includeMetadataChanges =
    (queryOpts && queryOpts.includeMetadataChanges) || false;

  // Create listener
  const unsubscribe = includeMetadataChanges
    ? firestoreRef(firebase, meta).onSnapshot(
        { includeMetadataChanges },
        success,
        error,
      )
    : firestoreRef(firebase, meta).onSnapshot(success, error);

  attachListener(firebase, dispatch, meta, unsubscribe);

  return unsubscribe;
}

/**
 * Set an array of listeners only allowing for one of a specific configuration.
 * If config.allowMultipleListeners is true or a function
 * (`(listener, listeners) => {}`) that evaluates to true then multiple
 * listeners with the same config are attached.
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {Array} listeners - Listener settings array
 */
export function setListeners(firebase, dispatch, listeners) {
  if (!Array.isArray(listeners)) {
    throw new Error(
      'Listeners must be an Array of listener configs (Strings/Objects).',
    );
  }

  const { config } = firebase._;

  const { allowMultipleListeners } = config;

  listeners.forEach((listener) => {
    if (!firebase._.pathListenerCounts) firebase._.pathListenerCounts = {};
    const path = getQueryName(listener);
    const oldListenerCount = firebase._.pathListenerCounts[path] || 0;
    const multipleListenersEnabled =
      typeof allowMultipleListeners === 'function'
        ? allowMultipleListeners(listener, firebase._.listeners)
        : allowMultipleListeners;

    firebase._.pathListenerCounts[path] = oldListenerCount + 1;

    // If we already have an attached listener exit here
    if (oldListenerCount === 0 || multipleListenersEnabled) {
      setListener(firebase, dispatch, listener);
    }
  });
}

/**
 * Unset previously set listener to Cloud Firestore. Listener must have been
 * set with setListener(s) in order to be tracked.
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {object} meta - Metadata
 * @param {string} meta.collection - Collection name
 * @param {string} meta.doc - Document name
 * @returns {Promise} Resolves when listener has been attached **not** when data
 * has been gathered by the listener.
 */
export function unsetListener(firebase, dispatch, meta) {
  return detachListener(firebase, dispatch, getQueryConfig(meta));
}

/**
 * Unset a list of listeners
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {Array} listeners - Array of listener configs
 */
export function unsetListeners(firebase, dispatch, listeners) {
  if (!Array.isArray(listeners)) {
    throw new Error(
      'Listeners must be an Array of listener configs (Strings/Objects).',
    );
  }
  const { config } = firebase._;
  const { allowMultipleListeners } = config;

  // Keep one listener path even when detaching
  listeners.forEach((listener) => {
    const path = getQueryName(listener);
    const listenerExists = firebase._.pathListenerCounts[path] >= 1;
    const multipleListenersEnabled =
      typeof allowMultipleListeners === 'function'
        ? allowMultipleListeners(listener, firebase._.listeners)
        : allowMultipleListeners;

    if (listenerExists) {
      firebase._.pathListenerCounts[path] -= 1;
      // If we aren't supposed to have listners for this path, then remove them
      if (
        firebase._.pathListenerCounts[path] === 0 ||
        multipleListenersEnabled
      ) {
        unsetListener(firebase, dispatch, listener);
      }
    }
  });
}

export default {
  setListener,
  setListeners,
  unsetListener,
  unsetListeners,
};
