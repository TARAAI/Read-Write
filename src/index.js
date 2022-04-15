/* istanbul ignore file */
import {
  getFirebase,
  useFirestore,
  useFirebase,
  useFirestoreConnect,
  WhereOptions,
  OrderByOptions,
  populate,
  isLoaded,
  firebaseReducer,
  ReactReduxFirebaseProvider,
} from 'react-redux-firebase';
import enhancer from './enhancer';
import reducer from './reducer';
import { firestoreActions } from './actions';
import createFirestoreInstance, {
  getFirestore,
} from './createFirestoreInstance';
import constants, { actionTypes } from './constants';
import middleware, { CALL_FIRESTORE } from './middleware';
import { getSnapshotByObject } from './utils/query';
import createMutate from './utils/createMutate';
import useRead from './hooks/useRead';
import useCache from './hooks/useCache';

// converted with transform-inline-environment-variables
export const version = process.env.npm_package_version;

export {
  reducer,
  reducer as firestoreReducer,
  enhancer,
  enhancer as reduxFirestore,
  firebaseReducer,
  createFirestoreInstance,
  firestoreActions as actions,
  ReactReduxFirebaseProvider,
  getFirestore,
  getFirebase,
  useFirestore,
  useFirebase,
  useRead,
  useCache,
  getSnapshotByObject,
  constants,
  actionTypes,
  middleware,
  CALL_FIRESTORE,
  createMutate,
  // will delete
  useFirestoreConnect,
  WhereOptions,
  OrderByOptions,
  populate,
  isLoaded,
};

export default {
  version,
  reducer,
  firestoreReducer: reducer,
  firebaseReducer,
  enhancer,
  useRead,
  useCache,
  getFirebase,
  useFirestore,
  useFirebase,
  ReactReduxFirebaseProvider,
  reduxFirestore: enhancer,
  createFirestoreInstance,
  actions: firestoreActions,
  getFirestore,
  getSnapshotByObject,
  constants,
  actionTypes,
  middleware,
  CALL_FIRESTORE,
  createMutate,
  // will delete
  useFirestoreConnect,
  WhereOptions,
  OrderByOptions,
  populate,
  isLoaded,
};
