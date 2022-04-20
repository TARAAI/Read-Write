import * as Firebase from 'firebase/compat/app';
import {
  AsyncThunkAction,
  ActionCreatorWithPreparedPayload,
} from '@reduxjs/toolkit';

/*******
 *    Redux-Firebase
 *******/

import * as React from 'react'
import { FirebaseNamespace } from '@firebase/app-types'
import * as FirestoreTypes from '@firebase/firestore-types'
import * as DatabaseTypes from '@firebase/database-types'
import * as StorageTypes from '@firebase/storage-types'
import * as AuthTypes from '@firebase/auth-types'
import { Dispatch } from 'redux'

/**
 * Diff / Omit taken from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html
 */
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>

type FileOrBlob<T> = T extends File ? File : Blob

/**
 * Injects props and removes them from the prop requirements.
 * Will not pass through the injected props if they are passed in during
 * render. Also adds new prop requirements from TNeedsProps.
 */
export interface InferableComponentEnhancerWithProps<
  TInjectedProps,
  TNeedsProps
  > {
  <P extends TInjectedProps>(
    component: React.ComponentType<P>
  ): React.ComponentType<Omit<P, keyof TInjectedProps> & TNeedsProps>
}

type mapper<TInner, TOutter> = (input: TInner) => TOutter

/**
 * Redux action types for react-redux-firebase
 * @see https://react-redux-firebase.com/docs/api/constants.html#actiontypes
 */


/**
 * Constants used within react-redux-firbease
 * @see https://react-redux-firebase.com/docs/api/constants.html
 */

/**
 * Promise which resolves when auth state has loaded.
 */
export function authIsReady(store: any, ...args: any[]): any

interface RemoveOptions {
  dispatchAction: boolean
}

/**
 * https://firebase.google.com/docs/reference/js/firebase.database
 */

interface FirebaseDatabaseService {
  database: {
    (app?: string): DatabaseTypes.FirebaseDatabase
    Reference: DatabaseTypes.Reference
    Query: DatabaseTypes.Query
    DataSnapshot: DatabaseTypes.DataSnapshot
    enableLogging: typeof DatabaseTypes.enableLogging
    ServerValue: DatabaseTypes.ServerValue
    Database: typeof DatabaseTypes.FirebaseDatabase
  }
}

/**
 * Firestore instance extended with methods which dispatch
 * redux actions.
 * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html
 */
interface BaseExtendedFirebaseInstance
  extends DatabaseTypes.FirebaseDatabase,
  FirebaseDatabaseService,
  ExtendedAuthInstance,
  ExtendedStorageInstance {
  initializeAuth: VoidFunction

  firestore: (() => ExtendedFirestoreInstance) & FirestoreStatics

  dispatch: Dispatch

  /**
   * Sets data to Firebase.
   * @param path - Path to location on Firebase which to set
   * @param value - Value to write to Firebase
   * @param onComplete - Function to run on complete (`not required`)
   * @returns Containing reference snapshot
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#set
   */
  set: (
    path: string,
    value: object | string | boolean | number | any,
    onComplete?: Function
  ) => Promise<DatabaseTypes.DataSnapshot>

  /**
   * Sets data to Firebase along with meta data. Currently,
   * this includes createdAt and createdBy. *Warning* using this function
   * may have unintended consequences (setting createdAt even if data already
   * exists)
   * @param path - Path to location on Firebase which to set
   * @param value - Value to write to Firebase
   * @param onComplete - Function to run on complete (`not required`)
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#setWithMeta
   */
  setWithMeta: (
    path: string,
    value: object | string | boolean | number,
    onComplete?: Function
  ) => Promise<DatabaseTypes.DataSnapshot>

  /**
   * Pushes data to Firebase.
   * @param path - Path to location on Firebase which to push
   * @param value - Value to push to Firebase
   * @param onComplete - Function to run on complete
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#push
   */
  push: (
    path: string,
    value: object | string | boolean | number,
    onComplete?: Function
  ) => Promise<DatabaseTypes.DataSnapshot>

  /**
   * Pushes data to Firebase along with meta data. Currently,
   * this includes createdAt and createdBy.
   * @param path - Path to location on Firebase which to set
   * @param value - Value to write to Firebase
   * @param onComplete - Function to run on complete
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#pushWithMeta
   */
  pushWithMeta: (
    path: string,
    value: object | string | boolean | number,
    onComplete: Function
  ) => Promise<DatabaseTypes.DataSnapshot>

  /**
   * Similar to the firebaseConnect Higher Order Component but
   * presented as a function (not a React Component). Useful for populating
   * your redux state without React, e.g., for server side rendering. Only
   * `once` type should be used as other query types such as `value` do not
   * return a Promise.
   * @param watchArray - Array of objects or strings for paths to sync
   * from Firebase. Can also be a function that returns the array. The function
   * is passed the props object specified as the next parameter.
   * @param options - The options object that you would like to pass to
   * your watchArray generating function.
   */
  promiseEvents: (
    watchArray: (string | object)[],
    options: object
  ) => Promise<any>

  /**
   * Updates data on Firebase and sends new data.
   * @param path - Path to location on Firebase which to update
   * @param value - Value to update to Firebase
   * @param onComplete - Function to run on complete (`not required`)
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#update
   */
  update: (
    path: string,
    value: object | string | boolean | number,
    onComplete?: Function
  ) => Promise<DatabaseTypes.DataSnapshot>

  /**
   * Updates data on Firebase along with meta. *Warning*
   * using this function may have unintented consequences (setting
   * createdAt even if data already exists)
   * @param path - Path to location on Firebase which to update
   * @param value - Value to update to Firebase
   * @param onComplete - Function to run on complete
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#updateWithMeta
   */
  updateWithMeta: (
    path: string,
    value: object | string | boolean | number,
    onComplete?: Function
  ) => Promise<DatabaseTypes.DataSnapshot>

  /**
   * Removes data from Firebase at a given path. **NOTE** A
   * seperate action is not dispatched unless `dispatchRemoveAction: true` is
   * provided to config on store creation. That means that a listener must
   * be attached in order for state to be updated when calling remove.
   * @param path - Path to location on Firebase which to remove
   * @param onComplete - Function to run on complete
   * @param options - Configuration for removal
   * @param [options.dispatchAction=true] - Whether or not to dispatch REMOVE action
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#remove
   */
  remove: (
    path: string,
    onComplete?: Function,
    options?: RemoveOptions
  ) => Promise<DatabaseTypes.DataSnapshot>

  /**
   * Sets data to Firebase only if the path does not already
   * exist, otherwise it rejects. Internally uses a Firebase transaction to
   * prevent a race condition between seperate clients calling uniqueSet.
   * @param path - Path to location on Firebase which to set
   * @param value - Value to write to Firebase
   * @param onComplete - Function to run on complete (`not required`)
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#uniqueset
   */
  uniqueSet: (
    path: string,
    value: object | string | boolean | number,
    onComplete?: Function
  ) => Promise<DatabaseTypes.DataSnapshot>

  /**
   * Watch a path in Firebase Real Time Database.
   * @param type - Type of event to watch for (defaults to value)
   * @param path - Path to watch with watcher
   * @param storeAs - Location within redux to store value
   * @param options - List of parameters for the query
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#watchevent
   */
  watchEvent: (
    type: string,
    path: string,
    storeAs: string,
    options?: object
  ) => Promise<any>

  /**
   * Unset a listener watch event. **Note:** this method is used
   * internally so examples have not yet been created, and it may not work
   * as expected.
   * @param type - Type of watch event
   * @param path - Path to location on Firebase which to unset listener
   * @param queryId - Id of the listener
   * @param options - Event options object
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#watchevent
   */
  unWatchEvent: (
    type: string,
    path: string,
    queryId: string,
    options?: string
  ) => Promise<any>
}

/**
 * OptionalOverride is left here in the event that any of the optional properties below need to be extended in the future.
 * Example: OptionalOverride<FirebaseNamespace, 'messaging', { messaging: ExtendedMessagingInstance }>
 */
type OptionalOverride<T, b extends string, P> = b extends keyof T ? P : {}
type OptionalPick<T, b extends string> = Pick<T, b & keyof T>

type ExtendedFirebaseInstance = BaseExtendedFirebaseInstance & OptionalPick<FirebaseNamespace, 'messaging' | 'performance' | 'functions' | 'analytics' | 'remoteConfig'>

/**
 * Create an extended firebase instance that has methods attached
 * which dispatch redux actions.
 * @param firebase - Firebase instance which to extend
 * @param configs - Configuration object
 * @param dispatch - Action dispatch function
 * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html
 */
export function createFirebaseInstance(
  firebase: any,
  configs: Partial<ReduxFirestoreConfig>,
  dispatch: Dispatch
): ExtendedFirebaseInstance

export type QueryParamOption =
  | 'orderByKey'
  | 'orderByChild'
  | 'orderByPriority'
  | 'limitToFirst'
  | 'limitToLast'
  | 'notParsed'
  | 'parsed'

export type QueryParamOptions = QueryParamOption | string[]

/**
 * Options which can be passed to firebase query through react-redux-firebase
 * @see https://react-redux-firebase.com/docs/queries.html
 */
export interface ReactReduxFirebaseQuerySetting {
  path: string
  type?:
  | 'value'
  | 'once'
  | 'child_added'
  | 'child_removed'
  | 'child_changed'
  | 'child_moved'
  queryParams?: QueryParamOptions
  storeAs?: string
  populates?: { child: string; root: string }[]
}

/**
 * List of query configuration objects for react-redux-firebase
 */
export type ReactReduxFirebaseQueries =
  | (ReactReduxFirebaseQuerySetting | string)[]
  | (ReactReduxFirebaseQuerySetting | string)

/**
 * Function that recieves component props and returns
 * a list of query configuration objects for react-redux-firebase
 */
export type ReactReduxFirebaseQueriesFunction = (
  props?: any
) => ReactReduxFirebaseQueries

/**
 * @see https://github.com/prescottprue/redux-firestore#query-options
 */
type WhereOptions = [string, FirestoreTypes.WhereFilterOp, any]
type OrderByOptions = [string, FirestoreTypes.OrderByDirection]

/**
 * Options which can be passed to firestore query through
 * redux-firestore or react-redux-firebase.
 * @see https://github.com/prescottprue/redux-firestore#query-options
 */
export interface ReduxFirestoreQuerySetting {
  /**
   * Collection name
   * @see https://github.com/prescottprue/redux-firestore#collection
   */
  collection?: string
  /**
   * Collection Group name
   * @see https://github.com/prescottprue/redux-firestore#collection-group
   */
  collectionGroup?: string
  /**
   * Document id
   * @see https://github.com/prescottprue/redux-firestore#document
   */
  doc?: string
  /**
   * Subcollection path settings
   * @see https://github.com/prescottprue/redux-firestore#sub-collections
   */
  subcollections?: ReduxFirestoreQuerySetting[]
  /**
   * Where settings
   * @see https://github.com/prescottprue/redux-firestore#where
   */
  where?: WhereOptions | WhereOptions[]
  /**
   * @see https://github.com/prescottprue/redux-firestore#orderby
   */
  orderBy?: OrderByOptions | OrderByOptions[]
  /**
   * @see https://github.com/prescottprue/redux-firestore#limit
   */
  limit?: number
  /**
   * @see https://github.com/prescottprue/redux-firestore#storeas
   */
  storeAs?: string
  /**
   * @see https://github.com/prescottprue/redux-firestore#startat
   */
  startAt?: FirestoreTypes.DocumentSnapshot | any | any[]
  /**
   * @see https://github.com/prescottprue/redux-firestore#startafter
   */
  startAfter?: FirestoreTypes.DocumentSnapshot | any | any[]
  /**
   * @see https://github.com/prescottprue/redux-firestore#endat
   */
  endAt?: FirestoreTypes.DocumentSnapshot | any | any[]
  /**
   * @see https://github.com/prescottprue/redux-firestore#endbefore
   */
  endBefore?: FirestoreTypes.DocumentSnapshot | any | any[]
  /**
   * @see https://github.com/prescottprue/redux-firestore#population
   */
  populates?: { child: string; root: string }[]
}

/**
 * List of query configuration objects for redux-firestore
 */
export type ReduxFirestoreQueries =
  | (ReduxFirestoreQuerySetting | string)[]
  | (ReduxFirestoreQuerySetting | string)

/**
 * Function that receives component props and returns
 * a list of query configuration objects for redux-firestore
 */
export type ReduxFirestoreQueriesFunction = (
  props?: any
) => ReduxFirestoreQueries

/**
 * Firestore instance extended with methods which dispatch redux actions.
 * @see https://github.com/prescottprue/redux-firestore#api
 */
interface ExtendedFirestoreInstance
  extends FirestoreTypes.FirebaseFirestore, FirestoreStatics {
  /**
   * Get data from firestore.
   * @see https://github.com/prescottprue/redux-firestore#get
   */
  get: <T>(
    docPath: string | ReduxFirestoreQuerySetting
  ) => Promise<FirestoreTypes.DocumentSnapshot<Partial<T>>>

  /**
   * Set data to firestore.
   * @see https://github.com/prescottprue/redux-firestore#set
   */
  set: <T>(
    docPath: string | ReduxFirestoreQuerySetting,
    data: Partial<T>,
    options?: FirestoreTypes.SetOptions
  ) => Promise<FirestoreTypes.DocumentSnapshot<Partial<T>>>

  /**
   * Add document to firestore.
   * @see https://github.com/prescottprue/redux-firestore#add
   */
  add: <T>(
    collectionPath: string | ReduxFirestoreQuerySetting,
    data: Partial<T>
  ) => Promise<{ id: string }>

  /**
   * Update document within firestore.
   * @see https://github.com/prescottprue/redux-firestore#update
   */
  update: <T>(
    docPath: string | ReduxFirestoreQuerySetting,
    data: Partial<T>
  ) => Promise<FirestoreTypes.DocumentSnapshot<Partial<T>>>

  /**
   * Delete a document within firestore.
   * @see https://github.com/prescottprue/redux-firestore#delete
   */
  delete: <T>(docPath: string | ReduxFirestoreQuerySetting) => Promise<T>

  /**
   * Executes the given updateFunction and then attempts to commit the changes applied within the
   * transaction.
   * @see https://github.com/prescottprue/redux-firestore#runtransaction
   */
  runTransaction: typeof FirestoreTypes.FirebaseFirestore.prototype.runTransaction

  /**
   * Sets a listener within redux-firestore
   * @see https://github.com/prescottprue/redux-firestore#onsnapshotsetlistener
   */
  onSnapshot: (options: ReduxFirestoreQuerySetting) => Promise<void>

  /**
   * Sets a listener within redux-firestore
   * @see https://github.com/prescottprue/redux-firestore#onsnapshotsetlistener
   */
  setListener: (options: ReduxFirestoreQuerySetting) => Promise<void>

  /**
   * Sets multiple firestore listeners created within redux-firestore
   * @see https://github.com/prescottprue/redux-firestore#onsnapshotsetlisteners
   */
  setListeners: (optionsArray: ReduxFirestoreQuerySetting[]) => Promise<void>

  /**
   * Unset firestore listener created within redux-firestore
   * @see https://github.com/prescottprue/redux-firestore#unsetlistener--unsetlistener
   */
  unsetListener: (options: ReduxFirestoreQuerySetting) => void

  /**
   * Unset multiple firestore listeners created within redux-firestore
   * @see https://github.com/prescottprue/redux-firestore#unsetlistener--unsetlisteners
   */
  unsetListeners: (options: ReduxFirestoreQuerySetting[]) => void
}

/**
 * @see https://github.com/prescottprue/redux-firestore#other-firebase-statics
 */
interface FirestoreStatics {
  FieldValue: typeof FirestoreTypes.FieldValue
  FieldPath: FirestoreTypes.FieldPath
  setLogLevel: (logLevel: FirestoreTypes.LogLevel) => void
  Blob: FirestoreTypes.Blob
  CollectionReference: FirestoreTypes.CollectionReference
  DocumentReference: FirestoreTypes.DocumentReference
  DocumentSnapshot: FirestoreTypes.DocumentSnapshot
  GeoPoint: FirestoreTypes.GeoPoint
  Query: FirestoreTypes.Query
  QueryDocumentSnapshot: FirestoreTypes.QueryDocumentSnapshot
  QuerySnapshot: FirestoreTypes.QuerySnapshot
  Timestamp: typeof FirestoreTypes.FieldValue
  Transaction: FirestoreTypes.Transaction
  WriteBatch: FirestoreTypes.WriteBatch
}

export interface WithFirestoreProps {
  firestore: ExtendedFirestoreInstance
  firebase: ExtendedFirebaseInstance
  dispatch: Dispatch
}

interface CreateUserCredentials {
  email: string
  password: string
  signIn?: boolean // default true
}

type Credentials =
  | CreateUserCredentials
  | {
    provider: 'facebook' | 'google' | 'twitter' | 'github' | 'microsoft.com' | 'apple.com' | 'yahoo.com'
    type: 'popup' | 'redirect'
    scopes?: string[]
  }
  | {
    credential: AuthTypes.AuthCredential
  }
  | {
    token: string
    profile: Object
  }
  | {
    phoneNumber: string
    applicationVerifier: AuthTypes.ApplicationVerifier
  }

type UserProfile<P extends object = {}> = P

/**
 * Firebase JS SDK Auth instance extended with methods which dispatch redux actions.
 * @see https://react-redux-firebase.com/docs/auth.html
 */
interface ExtendedAuthInstance {
  auth: () => AuthTypes.FirebaseAuth

  /**
   * Logs user into Firebase.
   * @param credentials - Credentials for authenticating
   * @param credentials.provider - External provider (google |
   * facebook | twitter)
   * @param credentials.type - Type of external authentication
   * (popup | redirect) (only used with provider)
   * @param credentials.email - Credentials for authenticating
   * @param credentials.password - Credentials for authenticating (only used with email)
   * @see https://react-redux-firebase.com/docs/auth.html#logincredentials
   */
  login: (credentials: Credentials) => Promise<AuthTypes.UserCredential>

  /**
   * Creates a new user in Firebase authentication. If
   * `userProfile` config option is set, user profiles will be set to this
   * location.
   * @param credentials - Credentials for authenticating
   * @param profile - Data to include within new user profile
   * @see https://react-redux-firebase.com/docs/auth.html#createusercredentials-profile
   */
  createUser: (
    credentials: CreateUserCredentials,
    profile?: UserProfile
  ) => Promise<AuthTypes.UserInfo>

  /**
   * Logs user out of Firebase and empties firebase state from
   * redux store.
   * @see https://react-redux-firebase.com/docs/auth.html#logout
   */
  logout: () => Promise<void>

  /**
   * Sends password reset email.
   * @param email - Email to send recovery email to
   * @see https://react-redux-firebase.com/docs/auth.html#resetpasswordcredentials
   */
  resetPassword: (email: string) => Promise<any>

  /**
   * Confirm that a user's password has been reset.
   * @param code - Password reset code to verify
   * @param password - New Password to confirm reset to
   * @see https://react-redux-firebase.com/docs/auth.html#confirmpasswordresetcode-newpassword
   */
  confirmPasswordReset: AuthTypes.FirebaseAuth['confirmPasswordReset']

  // https://react-redux-firebase.com/docs/auth.html#verifypasswordresetcodecode
  verifyPasswordResetCode: AuthTypes.FirebaseAuth['verifyPasswordResetCode']

  // https://react-redux-firebase.com/docs/auth.html#applyactioncode
  applyActionCode: AuthTypes.FirebaseAuth['applyActionCode']

  /**
   * Signs in using a phone number in an async pattern (i.e. requires calling a second method).
   * @param phoneNumber - Update to be auth object
   * @param appVerifier - Update in profile
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#signinwithphonenumber
   */
  signInWithPhoneNumber: AuthTypes.FirebaseAuth['signInWithPhoneNumber']

  /**
   * Update user's email
   * @param newEmail - Update to be auth object
   * @param updateInProfile - Update in profile
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#updateemail
   */
  updateEmail: (newEmail: string, updateInProfile?: boolean) => Promise<void>

  /**
   * Links the user account with the given credentials. Internally
   * calls `firebase.auth().currentUser.reload`.
   * @param credential - The auth credential
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#reloadauth
   */
  reloadAuth: (credential?: AuthTypes.AuthCredential | any) => Promise<void>

  /**
   * Links the user account with the given credentials. Internally
   * calls `firebase.auth().currentUser.linkWithCredential`.
   * @param credential - Credential with which to link user account
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#linkwithcredential
   */
  linkWithCredential: (
    credential: AuthTypes.AuthCredential
  ) => Promise<AuthTypes.User>

  /**
   * Update Auth Object
   * @param authUpdate - Update to be auth object
   * @param updateInProfile - Update in profile
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#updateauth
   */
  updateAuth: (
    authUpdate: {
      displayName?: string | null
      photoURL?: string | null
    },
    updateInProfile?: boolean
  ) => Promise<void>

  /**
   * Update user profile on Firebase Real Time Database or
   * Firestore (if `useFirestoreForProfile: true` config passed to
   * reactReduxFirebase). Real Time Database update uses `update` method
   * internally while updating profile on Firestore uses `set` with merge.
   * @param profileUpdate - Profile data to place in new profile
   * @param options - Options object (used to change how profile
   * update occurs)
   * @param [options.useSet=true] - Use set with merge instead of
   * update. Setting to `false` uses update (can cause issue of profile document
   * does not exist). Note: Only used when updating profile on Firestore
   * @param [options.merge=true] - Whether or not to use merge when
   * setting profile. Note: Only used when updating profile on Firestore
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#updateprofile
   * @see https://react-redux-firebase.com/docs/recipes/profile.html#update-profile
   */
  updateProfile: (profile: Partial<ProfileType>, options?: Object) => Promise<void>

  /**
   * Logs user into Firebase using external.
   * @param authData - Auth data from Firebase's getRedirectResult
   * @returns Resolves with user's profile
   * @see https://react-redux-firebase.com/docs/recipes/auth.html
   */
  handleRedirectResult: (authData: any) => Promise<any>

  /**
   * Re-authenticate user into Firebase. For examples, visit the
   * [auth section of the docs](https://react-redux-firebase.com/docs/auth.html) or the
   * [auth recipes section](https://react-redux-firebase.com/docs/recipes/auth.html).
   * @param credentials - Credentials for authenticating
   * @param credentials.provider - External provider (google |
   * facebook | twitter)
   * @param credentials.type - Type of external authentication
   * (popup | redirect) (only used with provider)
   * @returns Resolves with user's auth data
   * @see https://react-redux-firebase.com/docs/auth.html#logincredentials
   * @see https://react-redux-firebase.com/docs/api/firebaseInstance.html#login
   */
  reauthenticate: (credentials: any) => Promise<any>
}

/**
 * Instance of Firebase Storage with methods that dispatch redux actions.
 * @see https://react-redux-firebase.com/docs/storage.html
 */
interface ExtendedStorageInstance {
  storage: () => StorageTypes.FirebaseStorage

  /**
   * Delete a file from Firebase Storage with the option to
   * remove its metadata in Firebase Database.
   * @param path - Path to location on Firebase which to set
   * @param dbPath - Database path to place uploaded file metadata
   * @see https://react-redux-firebase.com/docs/api/storage.html#deletefile
   */
  deleteFile: (
    path: string,
    dbPath?: string
  ) => Promise<{ path: string; dbPath: string }>

  /**
   * Upload a file to Firebase Storage with the option to store
   * its metadata in Firebase Database.
   * @param path - Path to location on Firebase which to set
   * @param file - File object to upload (usually first element from
   * array output of select-file or a drag/drop `onDrop`)
   * @param dbPath - Database path to place uploaded file metadata
   * @param options - Options
   * @param options.name - Name of the file
   * @param options.metadata - Metadata associated with the file to upload to storage
   * @param options.documentId - Id of document to update with metadata if using Firestore
   * @see https://react-redux-firebase.com/docs/api/storage.html#uploadFile
   */
  uploadFile: <T extends File | Blob>(
    path: string,
    file: FileOrBlob<T>,
    dbPath?: string,
    options?: UploadFileOptions<T>
  ) => Promise<{ uploadTaskSnapshot: StorageTypes.UploadTaskSnapshot }>

  /**
   * Upload multiple files to Firebase Storage with the option
   * to store their metadata in Firebase Database.
   * @param path - Path to location on Firebase which to set
   * @param files - Array of File objects to upload (usually from
   * a select-file or a drag/drop `onDrop`)
   * @param dbPath - Database path to place uploaded files metadata.
   * @param options - Options
   * @param options.name - Name of the file
   * @param options.metadata - Metadata associated with the file to upload to storage
   * @param options.documentId - Id of document to update with metadata if using Firestore
   * @see https://react-redux-firebase.com/docs/api/storage.html#uploadFiles
   */
  uploadFiles: <T extends File | Blob>(
    path: string,
    files: FileOrBlob<T>[],
    dbPath?: string,
    options?: UploadFileOptions<T>
  ) => Promise<{ uploadTaskSnapshot: StorageTypes.UploadTaskSnapshot }[]>
}

/**
 * Configuration object passed to uploadFile and uploadFiles functions
 */
export interface UploadFileOptions<T extends File | Blob> {
  name?:
  | string
  | ((
    file: FileOrBlob<T>,
    internalFirebase: WithFirebaseProps<ProfileType>['firebase'],
    uploadConfig: {
      path: string
      file: FileOrBlob<T>
      dbPath?: string
      options?: UploadFileOptions<T>
    }
  ) => string)
  documentId?:
  | string
  | ((
    uploadRes: StorageTypes.UploadTaskSnapshot,
    firebase: WithFirebaseProps<ProfileType>['firebase'],
    metadata: StorageTypes.UploadTaskSnapshot['metadata'],
    downloadURL: string
  ) => string)
  useSetForMetadata?: boolean
  metadata?: StorageTypes.UploadMetadata
  metadataFactory?: (
    uploadRes: StorageTypes.UploadTaskSnapshot,
    firebase: WithFirebaseProps<ProfileType>['firebase'],
    metadata: StorageTypes.UploadTaskSnapshot['metadata'],
    downloadURL: string
  ) => object
}

export interface WithFirebaseProps<ProfileType> {
  firebase: ExtendedFirebaseInstance
}

/**
 * React Higher Order Component that automatically listens/unListens to
 * Firebase Real Time Database on mount/unmount of the component. This uses
 * React's Component Lifecycle hooks.
 * @see https://react-redux-firebase.com/docs/api/firebaseConnect.html
 */
export function firebaseConnect<ProfileType, TInner = {}>(
  queriesConfig?:
    | mapper<TInner, ReactReduxFirebaseQueries>
    | ReactReduxFirebaseQueries
): InferableComponentEnhancerWithProps<
  TInner & WithFirebaseProps<ProfileType>,
  WithFirebaseProps<ProfileType>
>

/**
 * Reducer for Firebase state
 * @param state - Current Firebase Redux State (state.firebase)
 * @param action - Action which will modify state
 * @param action.type - Type of Action being called
 * @param action.path - Path of action that was dispatched
 * @param action.data - Data associated with action
 * @see https://react-redux-firebase.com/docs/getting_started.html#add-reducer
 */
export function firebaseReducer<
  ProfileType extends Record<string, any> = {},
  Schema extends Record<string, any> = {}
>(state: any, action: any): FirebaseReducer.Reducer<ProfileType, Schema>

export function makeFirebaseReducer<
  ProfileType extends Record<string, any> = {},
  Schema extends Record<string, any> = {}
>(): (state: any, action: any) => FirebaseReducer.Reducer<ProfileType, Schema>

/**
 * React HOC that attaches/detaches Cloud Firestore listeners on mount/unmount
 * @see https://react-redux-firebase.com/docs/api/firestoreConnect.html
 */
export function firestoreConnect<TInner = {}>(
  connect?: mapper<TInner, ReduxFirestoreQueries> | ReduxFirestoreQueries
): InferableComponentEnhancerWithProps<
  TInner & WithFirestoreProps,
  WithFirestoreProps
>

/**
 * Reducer for Firestore state
 * @param state - Current Firebase Redux State (state.firestore)
 * @param action - Action which will modify state
 * @param action.type - Type of Action being called
 * @param action.path - Path of action that was dispatched
 * @param action.data - Data associated with action
 * @see https://react-redux-firebase.com/docs/api/reducer.html
 */
export function firestoreReducer(
  state: any,
  action: any
): FirestoreReducer.Reducer

/**
 * Fix path by adding "/" to path if needed
 * @param path - Path string to fix
 */
export function fixPath(path: string): string

/**
 * Get internal Firebase instance with methods which are wrapped with action dispatches. Useful for
 * integrations into external libraries such as redux-thunk and redux-observable.
 * @see https://react-redux-firebase.com/docs/api/getFirebase.html
 */
export function getFirebase(): ExtendedFirebaseInstance

/**
 * Get a value from firebase using slash notation.  This enables an easy
 * migration from v1's dataToJS/pathToJS/populatedDataToJS functions to v2 syntax
 * **NOTE:** Setting a default value will cause `isLoaded` to always return true
 * @param firebase - Firebase instance (state.firebase)
 * @param path - Path of parameter to load
 * @param notSetValue - Value to return if value is not
 * found in redux. This will cause `isLoaded` to always return true (since
 * value is set from the start).
 * @returns Data located at path within firebase.
 * @see https://react-redux-firebase.com/docs/api/helpers.html#getval
 */
export function getVal(firebase: any, path: string, notSetValue?: any): any

/**
 * Detect whether items are empty or not
 * @param item - Item to check loaded status of. A comma seperated list
 * is also acceptable.
 * @returns Whether or not item is empty
 * @see https://react-redux-firebase.com/docs/api/helpers.html#isempty
 */
export function isEmpty(...args: any[]): boolean

/**
 * Detect whether data from redux state is loaded yet or not
 * @param item - Item to check loaded status of. A comma separated
 * list is also acceptable.
 * @returns Whether or not item is loaded
 * @see https://react-redux-firebase.com/docs/api/helpers.html#isloaded
 */
export function isLoaded<T>(arg: T | null | undefined): arg is T
export function isLoaded(...args: any[]): boolean

/**
 * React hook that provides `firebase` object. Extended Firebase
 * instance is gathered from `ReactReduxFirebaseContext`.
 * @see https://react-redux-firebase.com/docs/api/useFirebase.html
 */
export function useFirebase(): ExtendedFirebaseInstance

/**
 * React hook that automatically listens/unListens
 * to provided Cloud Firestore paths. Make sure you have required/imported
 * Cloud Firestore, including it's reducer, before attempting to use.
 * @param queriesConfig - An object or string for paths to sync
 * from firestore. Can also be a function that returns the object or string.
 * @param deps - Dependency for memoizing query object. It's recommend
 * to include deps if using object, array or function as a query.
 * @see https://react-redux-firebase.com/docs/api/useFirestoreConnect.html
 */
export function useFirebaseConnect(
  querySettings?: ReactReduxFirebaseQueries | ReactReduxFirebaseQueriesFunction
): void

/**
 * React hook that return firestore object.
 * Firestore instance is gathered from `store.firestore`, which is attached
 * to store by the store enhancer (`reduxFirestore`) during setup of
 * [`redux-firestore`](https://github.com/prescottprue/redux-firestore).
 * @see https://react-redux-firebase.com/docs/api/useFirestore.html
 */
export function useFirestore(): ExtendedFirestoreInstance

/**
 * React hook that automatically listens/unListens
 * to provided Cloud Firestore paths. Make sure you have required/imported
 * Cloud Firestore, including it's reducer, before attempting to use.
 * @param queriesConfig - An object or string for paths to sync
 * from firestore. Can also be a function that returns the object or string.
 * @see https://react-redux-firebase.com/docs/api/useFirestoreConnect.html
 */
export function useFirestoreConnect<TInner>(
  queriesConfig?:
    | mapper<TInner, (string | ReduxFirestoreQuerySetting)[]>
    | ReduxFirestoreQuerySetting[]
    | string[]
    | mapper<TInner, string | ReduxFirestoreQuerySetting>
    | ReduxFirestoreQuerySetting
    | string
): void

/**
 * Populate with data from multiple paths within redux.
 * @param state - Firebase state object (state.firebase in redux store)
 * @param path - Path of parameter to load
 * @param populates - Array of populate config objects
 * @param notSetValue - Value to return if value is not found
 * @see https://react-redux-firebase.com/docs/populate.html
 */
export function populate(
  state: object,
  path: string,
  populates: any[],
  notSetValue?: any
): any

/**
 * React Context provider for Firebase instance (with methods wrapped in dispatch).
 * Needed to use HOCs like firebaseConnect and withFirebase.
 * @see https://react-redux-firebase.com/docs/api/ReactReduxFirebaseProvider.html
 */
export function ReactReduxFirebaseProvider(
  props: ReactReduxFirebaseProviderProps
): any

/**
 * Props passed to ReactReduxFirebaseContext component
 * @see https://react-redux-firebase.com/docs/api/ReactReduxFirebaseProvider.html
 */
export interface ReactReduxFirebaseProviderProps {
  firebase: any
  config: Partial<ReactReduxFirebaseConfig>
  dispatch: Dispatch
  children?: React.ReactNode
  initializeAuth?: boolean
  createFirestoreInstance?: (
    firebase: any,
    configs: Partial<ReduxFirestoreConfig>,
    dispatch: Dispatch
  ) => object
}

/**
 * React Context for Firebase instance.
 */
export namespace ReduxFirestoreContext {
  const prototype: {}
}

interface ReactReduxFirebaseConfig {
  attachAuthIsReady: boolean
  autoPopulateProfile: boolean
  dispatchOnUnsetListener: boolean
  dispatchRemoveAction: boolean
  enableEmptyAuthChanges: boolean
  /**
   * @deprecated
   */
  enableLogging: boolean
  enableRedirectHandling: boolean
  firebaseStateName: string
  logErrors: boolean
  onAuthStateChanged: (user: AuthTypes.User | null, _firebase: any, dispatch: Dispatch) => void
  presence: any
  preserveOnEmptyAuthChange: any
  preserveOnLogout: any
  resetBeforeLogin: boolean
  sessions: string
  setProfilePopulateResults: boolean
  updateProfileOnLogin: boolean
  userProfile: string | null
  // Use Firestore for Profile instead of Realtime DB
  useFirestoreForProfile?: boolean
  useFirestoreForStorageMeta?: boolean
  enableClaims?: boolean
  /**
   * Function for changing how profile is written to database (both RTDB and Firestore).
   */
  profileFactory?: (
    userData?: AuthTypes.User,
    profileData?: any,
    firebase?: WithFirebaseProps<ProfileType>['firebase']
  ) => Promise<any> | any
  /**
   * Function that returns that meta data object stored after a file is uploaded (both RTDB and Firestore).
   */
  fileMetadataFactory?: (
    uploadRes: StorageTypes.UploadTaskSnapshot,
    firebase: WithFirebaseProps<ProfileType>['firebase'],
    metadata: StorageTypes.FullMetadata,
    downloadURL: string
  ) => object
}

/**
 * Configuration for redux-firestore
 * @see https://github.com/prescottprue/redux-firestore#config-options
 */
export interface ReduxFirestoreConfig {
  /**
   * @deprecated
   */
  enableLogging: boolean

  helpersNamespace: string | null

  /**
   * @see https://github.com/prescottprue/redux-firestore#loglistenererror
   */
  logListenerError: boolean

  /**
   * @see https://github.com/prescottprue/redux-firestore#enhancernamespace
   */
  enhancerNamespace: string

  /**
   * @see https://github.com/prescottprue/redux-firestore#allowmultiplelisteners
   */
  allowMultipleListeners:
  | ((listenerToAttach: any, currentListeners: any) => boolean)
  | boolean

  /**
   * @see https://github.com/prescottprue/redux-firestore#preserveondelete
   */
  preserveOnDelete: null | object

  /**
   * @see https://github.com/prescottprue/redux-firestore#preserveonlistenererror
   */
  preserveOnListenerError: null | object

  /**
   * @see https://github.com/prescottprue/redux-firestore#onattemptcollectiondelete
   */
  onAttemptCollectionDelete:
  | null
  | ((queryOption: any, dispatch: any, firebase: any) => void)

  /**
   * @see https://github.com/prescottprue/redux-firestore#mergeordered
   */
  mergeOrdered: boolean

  /**
   * @see https://github.com/prescottprue/redux-firestore#mergeordereddocupdate
   */
  mergeOrderedDocUpdate: boolean

  /**
   * @see https://github.com/prescottprue/redux-firestore#mergeorderedcollectionupdates
   */
  mergeOrderedCollectionUpdates: boolean
}

/**
 * Props passed to ReactReduxFirebaseProvider
 * @see https://react-redux-firebase.com/docs/api/ReactReduxFirebaseProvider.html
 */
export interface ReduxFirestoreProviderProps {
  firebase: any
  config: Partial<ReactReduxFirebaseConfig>
  dispatch: (action: object) => void
  createFirestoreInstance: (
    firebase: any,
    configs: Partial<ReduxFirestoreConfig>,
    dispatch: Dispatch
  ) => object
  children?: React.ReactNode
  initializeAuth?: boolean
}

/**
 * React Context provider for Firestore instance (with methods wrapped in dispatch). Needed to use HOCs
 * like firestoreConnect and withFirestore.
 * @see https://react-redux-firebase.com/docs/api/ReactReduxFirebaseProvider.html
 */
export function ReduxFirestoreProvider(props: ReduxFirestoreProviderProps): any

/**
 * React Higher Order Component that passes firebase as a prop (comes from context.store.firebase).
 * @see https://react-redux-firebase.com/docs/api/withFirebase.html
 */
export function withFirebase<P extends object>(
  componentToWrap: React.ComponentType<P>
): React.FC<P & WithFirebaseProps<P>>

/**
 * React Higher Order Component that passes firestore as a prop (comes from context.store.firestore)
 * @see https://react-redux-firebase.com/docs/api/withFirestore.html
 */
export function withFirestore<P extends object>(
  componentToWrap: React.ComponentType<P>
): React.FC<P & WithFirestoreProps>

export namespace authIsReady {
  const prototype: {}
}

export namespace createFirebaseConnect {
  const prototype: {}
}

/**
 * Firebase/Firestore user profile object type
 * @see https://react-redux-firebase.com/recipes/profile.html
 */
export type ProfileType = {}

export interface Listeners {
  allIds: string[]
  byId: {
    [path: string]: {
      name: string
    }
  }
}

export type TypeWithId<T> = T & { id: string }

export interface Ordered<T extends FirestoreTypes.DocumentData> {
  [collection: string]: TypeWithId<T>[]
}

export interface Dictionary<T> {
  [documentId: string]: T
}

export interface Data<T extends FirestoreTypes.DocumentData> {
  [collection: string]: T
}

export namespace FirebaseReducer {
  export interface Reducer<
    ProfileType extends Record<string, any> = {},
    Schema extends Record<string, any> = {}
    > {
    auth: AuthState
    profile: Profile<ProfileType>
    authError: any
    data: { [T in keyof Schema]: Record<string, Schema[T]> }
    ordered: {
      [T in keyof Schema]: Array<{ key: string; value: Schema[T] }>
    }
    errors: any[]
    isInitializing: boolean
    listeners: Listeners
    requested: Dictionary<boolean>
    requesting: Dictionary<boolean>
    timestamps: Dictionary<number>
  }

  export interface AuthState extends AuthTypes.UserInfo {
    isLoaded: boolean
    isEmpty: boolean
    apiKey: string
    appName: string
    authDomain: string
    createdAt: string
    emailVerified: boolean
    isAnonymous: boolean
    lastLoginAt: string
    providerData: AuthTypes.UserInfo[] | null
    redirectEventId: null
    stsTokenManager: {
      accessToken: string
      apiKey: string
      expirationTime: number
      refreshToken: string
    }
  }

  // can be extended for optional properties from your database
  export type Profile<ProfileType> = {
    isLoaded: boolean
    isEmpty: boolean
    token?: {
      token: string
      expirationTime: string
      authTime: string
      issuedAtTime: string
      signInProvider: string
      signInSecondFactor: any
      claims: {
        name: string
        picture: string
        iss: string
        aud: string
        auth_time: number
        user_id: string
        sub: string
        iat: number
        exp: number
        email: string
        email_verified: boolean
        [key: string]: any
      };
    }
  } & ProfileType

  export namespace firebaseStateReducer {
    const prototype: {}
  }
}

export namespace FirestoreReducer {
  export interface Reducer {
    composite?: Data<any | Dictionary<any>>
    data: Data<any | Dictionary<any>>
    errors: {
      allIds: string[]
      byQuery: any[]
    }
    listeners: Listeners
    ordered: Ordered<any>
    queries: Data<ReduxFirestoreQuerySetting & (Dictionary<any> | any)>
    status: {
      requested: Dictionary<boolean>
      requesting: Dictionary<boolean>
      timestamps: Dictionary<number>
    }
  }

  const prototype: {}
}

export namespace fixPath {
  const prototype: {}
}

export namespace getVal {
  const prototype: {}
}

export namespace isEmpty {
  const prototype: {}
}

export namespace isLoaded {
  const prototype: {}
}

export namespace populate {
  const prototype: {}
}

export namespace reactReduxFirebase {
  const prototype: {}
}

export namespace reduxFirebase {
  const prototype: {}
}

export namespace reduxReactFirebase {
  const prototype: {}
}

/*****
 *   Read-Write
 *****/

/**
 * Action types used within actions dispatched internally. These action types
 * can be manually dispatched to update state.
 */
export const actionTypes: {
  START: string;
  ERROR: string;
  CLEAR_DATA: string;
  CLEAR_ERROR: string;
  CLEAR_ERRORS: string;
  SET_LISTENER: string;
  UNSET_LISTENER: string;
  GET_REQUEST: string;
  GET_SUCCESS: string;
  GET_FAILURE: string;
  SET_REQUEST: string;
  SET_SUCCESS: string;
  SET_FAILURE: string;
  ADD_REQUEST: string;
  ADD_SUCCESS: string;
  ADD_FAILURE: string;
  UPDATE_REQUEST: string;
  UPDATE_SUCCESS: string;
  UPDATE_FAILURE: string;
  DELETE_REQUEST: string;
  DELETE_SUCCESS: string;
  DELETE_FAILURE: string;
  ATTACH_LISTENER: string;
  LISTENER_RESPONSE: string;
  LISTENER_ERROR: string;
  ON_SNAPSHOT_REQUEST: string;
  ON_SNAPSHOT_SUCCESS: string;
  ON_SNAPSHOT_FAILURE: string;
  DOCUMENT_ADDED: string;
  DOCUMENT_MODIFIED: string;
  DOCUMENT_REMOVED: string;
  TRANSACTION_START: string;
  TRANSACTION_SUCCESS: string;
  TRANSACTION_FAILURE: string;
  MUTATE_START: string;
  MUTATE_SUCCESS: string;
  MUTATE_FAILURE: string;
  //--- firebase
  SET: string
  REMOVE: string
  MERGE: string
  SET_PROFILE: string
  LOGIN: string
  LOGOUT: string
  LOGIN_ERROR: string
  NO_VALUE: string
  UNAUTHORIZED_ERROR: string
  AUTHENTICATION_INIT_FINISHED: string
  AUTHENTICATION_INIT_STARTED: string
  SESSION_START: string
  SESSION_END: string
  FILE_UPLOAD_START: string
  FILE_UPLOAD_ERROR: string
  FILE_UPLOAD_PROGRESS: string
  FILE_UPLOAD_COMPLETE: string
  FILE_DELETE_START: string
  FILE_DELETE_ERROR: string
  FILE_DELETE_COMPLETE: string
  AUTH_UPDATE_START: string
  AUTH_UPDATE_ERROR: string
  AUTH_UPDATE_SUCCESS: string
  AUTH_EMPTY_CHANGE: string
  AUTH_LINK_ERROR: string
  AUTH_LINK_START: string
  AUTH_LINK_SUCCESS: string
  AUTH_RELOAD_ERROR: string
  AUTH_RELOAD_START: string
  AUTH_RELOAD_SUCCESS: string
  EMAIL_UPDATE_ERROR: string
  EMAIL_UPDATE_START: string
  EMAIL_UPDATE_SUCCESS: string
  PROFILE_UPDATE_START: string
  PROFILE_UPDATE_ERROR: string
  PROFILE_UPDATE_SUCCESS: string
};

/**
 * Constants used within redux-firestore. Includes actionTypes, actionsPrefix,
 * and default config.
 */
export const constants: {
  actionTypes: typeof actionTypes;
  actionsPrefix: string;
  defaultConfig: Config;
};



export interface Config {
  enableLogging: boolean;

  helpersNamespace: string | null;

  // https://github.com/prescottprue/redux-firestore#loglistenererror
  logListenerError: boolean;

  // https://github.com/prescottprue/redux-firestore#enhancernamespace
  enhancerNamespace: string;

  // https://github.com/prescottprue/redux-firestore#allowmultiplelisteners
  allowMultipleListeners:
  | ((listenerToAttach: any, currentListeners: any) => boolean)
  | boolean;

  // https://github.com/prescottprue/redux-firestore#preserveondelete
  preserveOnDelete: null | object;

  // https://github.com/prescottprue/redux-firestore#preserveonlistenererror
  preserveOnListenerError: null | object;

  preserveCacheAfterUnset: boolean;

  // https://github.com/prescottprue/redux-firestore#onattemptcollectiondelete
  onAttemptCollectionDelete:
  | null
  | ((queryOption: string, dispatch: Dispatch, firebase: Object) => void);

  // https://github.com/prescottprue/redux-firestore#mergeordered
  mergeOrdered: boolean;

  // https://github.com/prescottprue/redux-firestore#mergeordereddocupdate
  mergeOrderedDocUpdate: boolean;

  // https://github.com/prescottprue/redux-firestore#mergeorderedcollectionupdates
  mergeOrderedCollectionUpdates: boolean;

  globalDataConvertor: {
    toFirestore: (snapshot) => null | object | array;
    fromFirestore: (snapshot) => any;
  };
}

/**
 *
 * mutate - Data-driven Design for writing, batching & transacting with Firestore
 *
 */
type ArrayUnion = ['::arrayUnion', any | any[]];
type ArrayRemove = ['::arrayRemove', any | any[]];
type Increment = ['::increment', number];
type ServerTimestamp = ['::serverTimestamp'];
type FieldValueTuple = ArrayUnion | ArrayRemove | Increment | ServerTimestamp;

type PathId = { id: string; path: string };
export type Read = PathId;
/**
 * As of Nov 2021, Firestore does not support transactional queries.
 * Queries are run as a standard read. Each document returned is read
 * a second time in the transaction. This is a best effort. Full
 * Transactional Query support is only available with firebase-admin.
 */
export type ReadQuery = Partial<Omit<ReduxFirestoreQuerySetting, 'storeAs'>> &
  Pick<PathId, 'path'> &
  Partial<Pick<PathId, 'id'>>;
export type ReadQueryInternal = ReadQuery & { alias: string };
export type ReadProvides = () => unknown;

export type Write = PathId & { [key: string]: FieldValueTuple | unknown };
export type WriteFn<Reads extends string> = (reads: { [Key in Reads]: any }) =>
  | Write
  | Write[];

export type Batch = Write[];

export type Transaction<Type extends Record<string, unknown>> = {
  reads: {
    [P in keyof Type]: ReadQuery | Read | ReadProvides;
  };
  writes:
  | WriteFn<Extract<keyof Type, string>>[]
  | WriteFn<Extract<keyof Type, string>>
  | Write
  | Write[];
};

/**
 * Mutate turns Firestore into immedaite mode. Calling getFirestore returns
 * a RRF wrapper around Firestore that included the mutate function.
 * The primary aim of mutate is to make firestore feel lighting fast to user.
 * Instead of Firestore's API which is async first, the mutate function
 * provides eventual consistency. Change requests synchronously update the
 * cache reducer. When the change is accepted or rejected it updated the
 * cache reducer to reflect data in firestore.
 */
export type mutate = <Reads extends Record<string, unknown>>(
  operations: Transaction<Reads> | Batch | Write,
) => Promise;

/**
 *
 * createMutate - Simple wrapper for Redux Toolkit async action creators
 *
 */
type Writer<ReadType extends Record<string, unknown>> =
  | WriteFn<Extract<keyof ReadType, string>>
  | Write;
type Writers<ReadType extends Record<string, unknown>> =
  | Writer<ReadType>
  | Writer<ReadType>[];

type SimpleRead<ReadType extends Record<string, unknown>> = {
  [P in keyof ReadType]: ReadProvides;
};
type TransactionRead<ReadType extends Record<string, unknown>> = {
  [P in keyof ReadType]: ReadQuery | Read | ReadProvides;
};

type SimpleReadFn<Payload, ReadType extends Record<string, unknown>> = (
  payload?: Payload,
) => SimpleRead<ReadType>;

type TransactionReadFn<Payload, ReadType extends Record<string, unknown>> = (
  payload?: Payload,
) => TransactionRead<ReadType>;

type SimpleMutate<Payload, ReadType extends Record<string, unknown>> = {
  action: string;
  read: SimpleReadFn<Payload, ReadType>;
  write: Writer<ReadType>;
};
type ComplexMutate<Payload, ReadType extends Record<string, unknown>> = {
  action: string;
  readwrite: (payload: Payload, thunkAPI: FirebaseThunkAPI) => Writer<ReadType>;
};

type BatchMutate<Payload, ReadType extends Record<string, unknown>> = {
  action: string;
  read: SimpleReadFn<Payload, ReadType>;
  write: Writers<ReadType>;
};
type ComplexBatch<Payload, ReadType extends Record<string, unknown>> = {
  action: string;
  readwrite: (
    payload?: Payload,
    thunkAPI: FirebaseThunkAPI,
  ) => Writers<ReadType>;
};

type TransactionMutate<Payload, ReadType extends Record<string, unknown>> = {
  action: string;
  read: TransactionReadFn<Payload, ReadType>;
  write: Writers<ReadType>;
};
type ComplexTransaction<Payload, ReadType extends Record<string, unknown>> = {
  action: string;
  readwrite: (
    payload: Payload,
    thunkAPI: FirebaseThunkAPI,
  ) => {
    read: TransactionRead<ReadType>;
    write: Writers<ReadType>;
  };
};

type Mutations<Payload, ReadType extends Record<string, unknown>> =
  | SimpleMutate<Payload, ReadType>
  | ComplexMutate<Payload, ReadType>
  | BatchMutate<Payload, ReadType>
  | ComplexBatch<Payload, ReadType>
  | TransactionMutate<Payload, ReadType>
  | ComplexTransaction<Payload, ReadType>;

export function createMutate<Payload, ReadType extends Record<string, unknown>>(
  mutation: Mutations<Payload, ReadType, ReadType>,
): ((arg: Payload) => AsyncThunkAction<any, void, {}>) & {
  pending: ActionCreatorWithPreparedPayload<
    [string, void],
    undefined,
    string,
    never,
    {
      arg: Payload;
      requestId: string;
    }
  >;
  rejected: ActionCreatorWithPreparedPayload<
    [string, void],
    undefined,
    string,
    never,
    {
      arg: Payload;
      requestId: string;
    }
  >;
  fulfilled: ActionCreatorWithPreparedPayload<
    [string, void],
    undefined,
    string,
    never,
    {
      arg: Payload;
      requestId: string;
    }
  >;
  typePrefix: string;
};

export function ReactReduxFirebaseProvider(
  props: ReactReduxFirebaseProviderProps,
): any;

export interface ReactReduxFirebaseProviderProps {
  firebase: any;
  config: any;
  dispatch: Dispatch;
  children?: React.ReactNode;
  initializeAuth?: boolean;
  createFirestoreInstance?: (
    firebase: any,
    configs: any,
    dispatch: Dispatch,
  ) => object;
}

export namespace ReduxFirestoreContext {
  const prototype: {};
}

export function useFirestore(): any;

// -- useRead subscriptions

type Loading = undefined;
type NotFound = null;
type NoResults = [];
type AliasEnum = '::alias';
type ReadAlias = string;

/**
 * ### Query & subscribe to all results
 * [@see github.com/TARAAI/Read-Write/docs/read.md](https://github.com/TARAAI/Read-Write/blob/main/docs/read.md) \
 * **Note: Add a generic to get Typed responses:**
 * > ```ts
 * > let docs: MyDoc[] = useRead<MyDoc>(
 * >   { path: 'some-collection' },
 * > );
 * > ```
 * @param query - ReadQuery
 * @returns unknown | undefined | []
 */
export function useRead(
  query: Omit<ReadQuery, 'id'>,
): unknown | Loading | NoResults;
/**
 * ### Query & subscribe to all results
 * > ```ts
 * > let docs: MyDocument[] = useRead<MyDocument>({ path: 'coll' });
 * > ```
 * @param query - ReadQuery
 * @returns Doc[] | undefined | []
 */
export function useRead<Doc extends PathId>(
  query: Omit<ReadQuery, 'id'>,
): Doc[] | Loading | NoResults;
/**
 * ### Query & subscribe (single value)
 * > ```ts
 * > let props: (Doc['prop'])[] = useRead<Doc, 'prop'>(
 * >   { path: 'coll' },
 * >   'prop'
 * > );
 * > ```
 * @param query - ReadQuery
 * @param field - keyof Doc
 * @returns Doc[K][] | undefined | []
 */
export function useRead<Doc extends PathId, K extends keyof Doc>(
  query: Omit<ReadQuery, 'id'>,
  field: K,
): Doc[K][] | Loading | NoResults;
/**
 * ### Query & subscribe (subset of key/values)
 * > ```ts
 * > let subset: Pick<Doc, 'prop'>[] = useRead<Doc, 'prop'>(
 * >   { path: 'coll' },
 * >   ['prop']
 * > );
 * > ```
 * @param query - ReadQuery
 * @param fields - (keyof Doc)[]
 * @returns Pick<Doc, K>[] | undefined | []
 */
export function useRead<Doc extends PathId, K extends keyof Doc>(
  query: Omit<ReadQuery, 'id'>,
  fields: K[],
): Pick<Doc, K>[] | Loading | NoResults;
/**
 * ### Query & subscribe (only get alias for later access)
 * > ```ts
 * > let myAlias = useRead({ path: 'tasks' }, '::alias');
 * > let ids = useCache<{ id:string; }, 'id'>({ path: 'tasks' }, 'id');
 * > ```
 * @param query - ReadQuery
 * @param alias - '::alias'
 * @returns string
 */
export function useRead(
  query: Omit<ReadQuery, 'id'>,
  alias: AliasEnum,
): ReadAlias;
/**
 * ### Query & subscribe (single document)
 * > ```ts
 * > let subset: Doc = useRead<Doc>(
 * >   { path: 'coll', id: 'doc-id' }
 * > );
 * > ```
 * @param pathId - { path: string; id: string; }
 * @returns Doc | undefined | null
 */
export function useRead<Doc extends PathId>(
  pathId: PathId,
): Doc | Loading | NotFound;
/**
 * ### Query & subscribe (single value of a single document)
 * > ```ts
 * > let myProp: Doc['prop'] = useRead<Doc, 'prop'>(
 * >   { path: 'coll', id: 'doc-id' },
 * >   'prop'
 * > );
 * > ```
 * @param pathId - { path: string; id: string; }
 * @param field - keyof Doc
 * @returns Doc[keyof Doc] | undefined | null
 */
export function useRead<Doc extends PathId, K extends keyof Doc>(
  pathId: PathId,
  field: K,
): Doc[K] | Loading | NotFound;
/**
 * ### Query & subscribe (subset of a single document)
 * > ```ts
 * > let subset: Pick<Doc, 'prop'> = useRead<Doc, 'prop'>(
 * >   { path: 'coll', id: 'doc-id' },
 * >   ['prop']
 * > );
 * > ```
 * @param pathId - { path: string; id: string; }
 * @param fields - (keyof Doc)[]
 * @returns Pick<Doc, keyof Doc> | undefined | null
 */
export function useRead<Doc extends PathId, K extends keyof Doc>(
  pathId: PathId,
  fields: K[],
): Pick<Doc, K> | Loading | NotFound;
/**
 * ### Only access from Redux Store; NO query, NO loading
 * **NOTE**: If you ment to get a Pick/Partial, add a second \
 * parameter (ie `useRead<MyDoc, 'prop'>(...);` )
 * > ```ts
 * > let docs: Doc[] = useRead<Doc>(someAlias);
 * > ```
 * @param alias - string
 * @returns Doc[] | undefined | []
 */
export function useRead<Doc extends PathId>(
  alias: ReadAlias,
): Doc[] | Loading | NoResults;
/**
 * ### Only access from Redux Store; NO query, NO loading
 * > ```ts
 * > let props: Doc['prop'][] = useRead<Doc, 'prop'>(someAlias, 'prop');
 * > ```
 * @param alias - string
 * @param field - keyof Doc
 * @returns Doc[keyof Doc] | undefined | []
 */
export function useRead<Doc extends PathId, K extends keyof Doc>(
  alias: ReadAlias,
  field: K,
): Doc[K] | Loading | NoResults;
/**
 * ### Only access from Redux Store; NO query, NO loading
 * > ```ts
 * > let subsets: Pick<Doc, 'prop'>[] = useRead<Doc, 'prop'>(
 * >   someAlias,
 * >   ['prop']
 * > );
 * > ```
 * @param alias - string
 * @param fields - (keyof Doc)[]
 * @returns Pick<Doc, keyof Doc> | undefined | []
 */
export function useRead<Doc extends PathId, K extends keyof Doc>(
  alias: ReadAlias,
  fields: K[],
): Pick<Doc, K> | Loading | NoResults;
export function useRead(args: unknown): any;

// -- useCache reads from cache

/**
 * ### Read from the cache
 * [@see https://github.com/TARAAI/Read-Write/blob/main/docs/read.md#advanced-usage](https://github.com/TARAAI/Read-Write/blob/main/docs/read.md#advanced-usage)
 * **Note: Add a generic to get Typed responses:**
 * > ```ts
 * > let docs: MyDoc[] = useCache<MyDoc>(
 * >   { path: 'some-collection' },
 * > );
 * > ```
 * @param query - ReadQuery
 * @returns - unknown | undefined | []
 */
export function useCache(
  query: Omit<ReadQuery, 'id'>,
): unknown | Loading | NoResults;
/**
 * ### Read from the cache (single document)
 * > ```ts
 * > let subset: Doc = useCache<Doc>(
 * >   { path: 'colection', id: 'doc-id' }
 * > )
 * > ```
 * @param pathId - { path: string; id: string; }
 * @returns Doc | undefined | null
 */
export function useCache<Doc extends PathId>(
  pathId: PathId,
): Doc | Loading | NotFound;
/**
 * ### Read from the cache (single value of a single document)
 * > ```ts
 * > let myProp: Doc['prop'] = useCache<Doc, 'prop'>(
 * >   { path: 'collection', id: 'doc-id' },
 * >   'prop'
 * > );
 * > ```
 * @param pathId PathId - { path: string; id: string }
 * @param field - keyof Doc
 * @returns Doc[keyof Doc] | undefined | null
 */
export function useCache<Doc extends PathId, K extends keyof Doc>(
  pathId: PathId,
  field: K,
): Doc[K] | Loading | NotFound;
/**
 * ### Read from the cache (subset of a single document)
 * > ```ts
 * > let subset: Pick<Doc, 'prop'> = useCache<Doc, 'prop'>(
 * >   { path: 'collection', id: 'doc-id' },
 * >   ['prop']
 * > );
 * @param pathId { path: string; id: string; }
 * @param field (keyof Doc)[]
 * @returns Pick<Doc, keyof Doc> | undefined | null
 */
export function useCache<Doc extends PathId, K extends keyof Doc>(
  pathId: PathId,
  fields: K[],
): Pick<Doc, K> | Loading | NotFound;
/**
 * ### Read from the cache (using an alias)
 * > ```ts
 * > let docs: Doc[] = useCache<Doc>(someAlias);
 * > ```
 * @param alias - string
 * @returns Doc[] | undefined | []
 */
export function useCache<Doc extends PathId>(
  alias: string,
): Doc[] | Loading | NoResults;
/**
 * ### Read from the cache (single value of a document, using an alias)
 * > ```ts
 * > let props: Doc['prop'][] = useCache<Doc, 'prop'>(someAlias, 'prop');
 * > ```
 * @param alias - string
 * @param field - keyof Doc
 * @returns Doc[keyof Doc] | undefined | []
 */
export function useCache<Doc extends PathId, K extends keyof Doc>(
  alias: string,
  field: K,
): Doc[K] | Loading | NoResults;
/**
 * ### Read from the cache (a subset of a document, using an alias)
 * > ```ts
 * > let subsets: Pick<Doc, 'prop'>[] = useRead<Doc, 'prop'>(
 * >   someAlias,
 * >   ['prop']
 * > );
 * > ```
 * @param alias string
 * @param fields keys of doc
 * @returns Select keys from doc
 */
export function useCache<Doc extends PathId, K extends keyof Doc>(
  alias: string,
  fields: K[],
): Pick<Doc, K>[] | undefined;
export function useCache(args: unknown): any;

// -- setCache for storybook

export function setCache(aliases: Record<string, any>, middlewares?: any): any;

export function shouldPass(actionCreatorFnc: any): any;
export function shouldPass(testname: string, actionCreatorFnc: any): any;
export function shouldFail(actionCreatorFnc: any): any;
export function shouldFail(testname: string, actionCreatorFnc: any): any;

/**
 * A redux store enhancer that adds store.firebase (passed to React component
 * context through react-redux's <Provider>).
 */
export function reduxFirestore(
  firebaseInstance: typeof Firebase,
  otherConfig?: Partial<Config>,
): Firebase.default.firestore & { mutate: mutate };

/**
 * Get extended firestore instance (attached to store.firestore)
 */
export function getFirestore(
  firebaseInstance: typeof Firebase,
  otherConfig?: Partial<Config>,
): Firebase.default.firestore & { mutate: mutate };

export function getFirebase(
  firebaseInstance: typeof Firebase,
  otherConfig?: Partial<Config>,
): Firebase.default.firebase;

/**
 * Reducer for Firestore state
 * @param state - Current Firebase Redux State (state.firestore)
 * @param action - Action which will modify state
 * @param action.type - Type of Action being called
 * @param action.path - Path of action that was dispatched
 * @param action.data - Data associated with action
 * @see https://react-redux-firebase.com/docs/api/reducer.html
 */
export function firestoreReducer<Schema extends Record<string, any> = {}>(
  state: any,
  action: any,
): Reducer<FirestoreReducer.State<Schema>>;

/**
 * Create a firestore instance that has helpers attached for dispatching actions
 */
export function createFirestoreInstance(
  firebaseInstance: typeof Firebase,
  configs: Partial<Config>,
  dispatch: Dispatch,
): object;

/**
 * A redux store reducer for Firestore state
 */
export namespace firestoreReducer {
  const prototype: {};
}

/**
 * A redux store reducer for Firestore state
 */
export namespace reduxFirestore {
  const prototype: {};
}

export namespace FirebaseReducer {
  const prototype: {};
  export interface Reducer<Schema extends Record<string, any> = {}> {
    profile: any;
  }
}

export namespace FirestoreReducer {
  declare const entitySymbol: unique symbol;
  declare const entityPath: unique symbol;
  declare const entityId: unique symbol;
  declare const queryAlias: unique symbol;

  export type Entity<T> = T & {
    [entitySymbol]: never;
  };
  export type EntityWithId<T> = T & { id: entityId };
  export type EntityWithIdPath<T> = EntityWithId<T> & { path: entityPath };
  export type FirestoreData<Schema extends Record<string, any>> = {
    [T in keyof Schema]: Record<
      string,
      Schema[T] extends Entity<infer V> ? V : FirestoreData<Schema[T]>
    >;
  };

  export type OrderedData<Schema extends Record<string, any>> = {
    [T in keyof Schema]: Schema[T] extends Entity<infer V>
    ? EntityWithId<V>[]
    : OrderedData<EntityWithId<Schema[T]>>[];
  };

  export interface CacheDatabase<T> {
    [entityPath]: { entityId: Entity<T> };
  }
  export type CachedData<Schema extends Record<string, any>> = {
    [T in keyof Schema]: Schema[T] extends Entity<infer V>
    ? EntityWithIdPath<V>[]
    : CachedData<EntityWithIdPath<Schema[T]>>[];
  };

  export interface Reducer<Schema extends Record<string, any> = {}> {
    errors: {
      allIds: string[];
      byQuery: any[];
    };
    listeners: Listeners;
    queries: Data<ReduxFirestoreQuerySetting & (Dictionary<any> | any)>;
    cache: CachedData<Schema> & {
      database: CacheDatabase<Schema>;
      databaseOverrides: CacheDatabase<Schema> | null;
      [queryAlias]: ReduxFirestoreQuerySetting & {
        ordered: [entityId, entityPath][];
      };
    };
    status: {
      requested: Dictionary<boolean>;
      requesting: Dictionary<boolean>;
      timestamps: Dictionary<number>;
    };
  }

  const prototype: {};
}
