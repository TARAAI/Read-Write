/* istanbul ignore file */
import * as reduxFirestore from './redux-firebase';
import enhancer from './store/enhancer';
import reducer from './reducers';
import { firestoreActions } from './actions';
import createFirestoreInstance, {
  getFirestore,
} from './sdk/createFirestoreInstance';
import constants, { actionTypes } from './constants';
import middleware, { CALL_FIRESTORE } from './store/middleware';
import { getSnapshotByObject } from './utils/query';
import createMutate from './utils/createMutate';
import useRead from './hooks/useRead';
import useCache from './hooks/useCache';

// converted with transform-inline-environment-variables
export const version = process.env.npm_package_version;

const {
  getFirebase,
  useFirestore,
  useFirebase,
  populate,
  firebaseReducer,
  ReactReduxFirebaseProvider,
} = reduxFirestore;

/**
 * @deprecated useRead/Cache directly properly creates the Redux selectors
 **/
const useFirestoreConnect = reduxFirestore.useFirestoreConnect;

/**
 * @deprecated undefined results are not loaded yet
 **/
const isLoaded = reduxFirestore.isLoaded;

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
  populate,
  isLoaded,
};
