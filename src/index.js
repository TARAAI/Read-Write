/* istanbul ignore file */
import * as reduxFirestore from './redux-firebase';
import enhancer from './store/enhancer';
import reducer from './reducers';
import { firestoreActions } from './firestore/actions';
import createFirestoreInstance, {
  getFirestore,
} from './firestore/extend/createFirestoreInstance';
import constants, { actionTypes } from './constants';
import { getSnapshotByObject } from './utils/listener';
import createMutate from './mutate/createMutate';
import useRead from './hooks/useRead';
import useCache from './hooks/useCache';

// converted with transform-inline-environment-variables
export const version = process.env.npm_package_version;

const {
  getFirebase,
  useFirebase,
  firebaseReducer,
  ReactReduxFirebaseProvider,
} = reduxFirestore;

/**
 * @deprecated useRead/Cache directly properly creates the Redux selectors
 **/
const useFirestore = reduxFirestore.useFirestore;

/**
 * @deprecated useRead/Cache directly properly creates the Redux selectors
 **/
const useFirestoreConnect = reduxFirestore.useFirestoreConnect;

/**
 * @deprecated MongoDB population don't work in a high-latency situations like a client-side DB
 **/
const populate = reduxFirestore.populate;

/**
 * @deprecated undefined results are not loaded yet
 **/
const isLoaded = reduxFirestore.isLoaded;

export {
  useRead,
  useCache,
  createMutate,
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
  getSnapshotByObject,
  constants,
  actionTypes,
  useFirestoreConnect,
  populate,
  isLoaded,
};

export default {
  useRead,
  useCache,
  createMutate,
  version,
  reducer,
  firestoreReducer: reducer,
  firebaseReducer,
  enhancer,
  getFirebase,
  useFirebase,
  ReactReduxFirebaseProvider,
  reduxFirestore: enhancer,
  createFirestoreInstance,
  actions: firestoreActions,
  getFirestore,
  getSnapshotByObject,
  constants,
  actionTypes,
  useFirestore,
  useFirestoreConnect,
  populate,
  isLoaded,
};
