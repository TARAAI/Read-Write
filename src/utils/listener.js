/* eslint-disable jsdoc/require-param */
import isObject from 'lodash/isObject';
import cloneDeep from 'lodash/cloneDeep';
import { actionTypes } from '../constants';
import { firestoreRef, getQueryName } from './convertors';

export const snapshotCache = new WeakMap();
/**
 * Get DocumentSnapshot and QuerySnapshot with object from either data or
 * ordered firestore state. If provided with doc data, it will return
 * DocumentSnapshot, providing with a collection from data or an array from
 * ordered state will return QuerySnapshot, except ordered state that generated
 * as DocumentRef will return DocumentSnapshot
 * Note: the cache is local and, not persistance. Passing an object from initial
 * state or from SSR state will yield undefined.
 * @param {object|Array} obj - The object from data or ordered state
 * @returns {firebase.firestore.DocumentSnapshot|firebase.firestore.QuerySnapshot}
 * DocumentSnapshot or QuerySnapshot depend on type of object provided
 */
export function getSnapshotByObject(obj) {
  return snapshotCache.get(obj);
}

/**
 * Confirm that meta object exists and that listeners object exists on internal
 * firebase instance. If these required values do not exist, an error is thrown.
 * @param {object} firebase - Internal firebase object
 * @param {object} meta - Metadata object
 */
function confirmMetaAndConfig(firebase, meta) {
  if (!meta) {
    throw new Error('Meta data is required to attach listener.');
  }
  if (!firebase || !firebase._ || !firebase._.listeners) {
    throw new Error(
      'Internal Firebase object required to attach listener. Confirm that reduxFirestore enhancer was added when you were creating your store',
    );
  }
}

/**
 * @description Update the number of watchers for a query
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {object} meta - Metadata
 * @param {Function} unsubscribe - Unsubscribe function
 * @returns {object} Object containing all listeners
 */
export function attachListener(firebase, dispatch, meta, unsubscribe) {
  confirmMetaAndConfig(firebase, meta);

  const name = getQueryName(meta);
  if (!firebase._.listeners[name]) {
    firebase._.listeners[name] = unsubscribe; // eslint-disable-line no-param-reassign
  }

  dispatch({
    type: actionTypes.SET_LISTENER,
    meta,
    payload: { name },
  });

  return firebase._.listeners;
}

/**
 * Remove/Unset a watcher
 * @param {object} firebase - Internal firebase object
 * @param {Function} dispatch - Redux's dispatch function
 * @param {object} meta - Metadata
 * @param {string} meta.collection - Collection name
 * @param {string} meta.doc - Document name
 */
export function detachListener(firebase, dispatch, meta) {
  const name = getQueryName(meta);
  if (firebase._.listeners[name]) {
    firebase._.listeners[name]();
    delete firebase._.listeners[name]; // eslint-disable-line no-param-reassign
  }
  const { preserveCacheAfterUnset: preserveCache } = firebase._.config || {};

  dispatch({
    type: actionTypes.UNSET_LISTENER,
    meta,
    payload: { name, preserveCache },
  });
}

/**
 * Get ordered array from snapshot
 * @param {firebase.database.DataSnapshot} snap - Data for which to create
 * an ordered array.
 * @returns {Array|null} Ordered list of children from snapshot or null
 */
export function orderedFromSnap(snap) {
  const ordered = [];
  if (snap.data && snap.exists) {
    const {
      id,
      ref: {
        parent: { path },
      },
    } = snap;
    const obj = isObject(snap.data())
      ? { ...(snap.data() || snap.data), id, path }
      : { id, path, data: snap.data() };
    snapshotCache.set(obj, snap);
    ordered.push(obj);
  } else if (snap.forEach) {
    snap.forEach((doc) => {
      const {
        id,
        ref: {
          parent: { path },
        },
      } = doc;
      const obj = isObject(doc.data())
        ? { ...(doc.data() || doc.data), id, path }
        : { id, path, data: doc.data() };
      snapshotCache.set(obj, doc);
      ordered.push(obj);
    });
  }
  snapshotCache.set(ordered, snap);
  return ordered;
}

/**
 * Create data object with values for each document with keys being doc.id.
 * @param {firebase.database.DataSnapshot} snap - Data for which to create
 * an ordered array.
 * @returns {object|null} Object documents from snapshot or null
 */
export function dataByIdSnapshot(snap) {
  const data = {};
  if (snap.data) {
    const snapData = snap.exists ? snap.data() : null;
    if (snapData) {
      snapshotCache.set(snapData, snap);
      data[snap.id] = {
        ...snapData,
        id: snap.id,
        path: snap.ref.parent.path,
      };
    } else {
      data[snap.id] = null;
    }
  } else if (snap.forEach) {
    snap.forEach((doc) => {
      const snapData = doc.data() || doc;
      snapshotCache.set(snapData, doc);
      data[doc.id] = {
        ...snapData,
        id: doc.id,
        path: doc.ref.parent.path,
      };
    });
  }
  if (!!data && Object.keys(data).length) {
    snapshotCache.set(data, snap);
    return data;
  }
  return null;
}

/**
 * @private
 * @deprecated - populates is non-performant.
 * Create an array of promises for population of an object or list
 * @param {object} firebase - Internal firebase object
 * @param {object} populate - Object containing root to be populate
 * @param {object} populate.root - Firebase root path from which to load populate item
 * @param {string} id - String id
 * @returns {Promise} Resolves with populate child data
 */
/* istanbul ignore next: populates is deprecated and should not be used. */
export function getPopulateChild(firebase, populate, id) {
  return firestoreRef(firebase, { collection: populate.root, doc: id })
    .get()
    .then((snap) => ({ id, ...snap.data() }));
}

const changeTypeToEventType = {
  added: actionTypes.DOCUMENT_ADDED,
  removed: actionTypes.DOCUMENT_REMOVED,
  modified: actionTypes.DOCUMENT_MODIFIED,
};

/**
 * Action creator for document change event. Used to create action objects
 * to be passed to dispatch.
 * @param {object} change - Document change object from Firebase callback
 * @param {object} [originalMeta={}] - Original meta data of action
 * @returns {object} Resolves with doc change action object
 */
function docChangeEvent(change, originalMeta = {}) {
  const meta = { ...cloneDeep(originalMeta), path: change.doc.ref.parent.path };

  if (originalMeta.subcollections && !originalMeta.storeAs) {
    meta.subcollections[0] = { ...meta.subcollections[0], doc: change.doc.id };
  } else {
    meta.doc = change.doc.id;
  }
  const data = {
    id: change.doc.id,
    path: change.doc.ref.parent.path,
    ...change.doc.data(),
  };
  return {
    type: changeTypeToEventType[change.type] || actionTypes.DOCUMENT_MODIFIED,
    meta,
    payload: {
      data,
      ordered: { oldIndex: change.oldIndex, newIndex: change.newIndex },
    },
  };
}

/**
 * Dispatch action(s) response from listener response.
 * @private
 * @param {object} opts - Options object
 * @param {Function} opts.dispatch - Redux action dispatch function
 * @param {object} opts.firebase - Firebase instance
 * @param {object} opts.docData - Data object from document
 * @param {object} opts.meta - Meta data
 */
export function dispatchListenerResponse({
  dispatch,
  docData = {},
  meta,
  firebase,
}) {
  const {
    mergeOrdered,
    mergeOrderedDocUpdates,
    mergeOrderedCollectionUpdates,
  } = firebase._.config || {};
  const fromCache =
    docData && typeof docData.metadata.fromCache === 'boolean'
      ? docData.metadata.fromCache
      : true;
  const docChanges =
    typeof docData.docChanges === 'function'
      ? docData.docChanges()
      : docData.docChanges;
  // Dispatch different actions for doc changes (only update doc(s) by key)
  if (docChanges && docChanges.length < docData.size) {
    // Loop to dispatch for each change if there are multiple
    // TODO: Option for dispatching multiple changes in single action
    docChanges.forEach((change, index) => {
      const lastChange = index === docChanges.length - 1;
      dispatch(docChangeEvent(change, { reprocess: lastChange, ...meta }));
    });
  } else {
    // Dispatch action for whole collection change
    dispatch({
      type: actionTypes.LISTENER_RESPONSE,
      meta,
      payload: {
        data: dataByIdSnapshot(docData),
        ordered: orderedFromSnap(docData),
        fromCache,
      },
      merge: {
        docs: mergeOrdered && mergeOrderedDocUpdates,
        collections: mergeOrdered && mergeOrderedCollectionUpdates,
      },
    });
  }
}
