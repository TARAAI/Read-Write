import {
  chunk,
  cloneDeep,
  flatten,
  isFunction,
  isPlainObject,
  mapValues,
  isEmpty,
  has,
} from 'lodash';
import debug from 'debug';
import { firestoreRef } from './query';
import mark from './profiling';

const info = debug('w3:mutate');

const docRef = (firestore, collection, doc) =>
  firestore.doc(`${collection}/${doc}`);

const promiseAllObject = async (object) =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(object).map(([key, promise]) =>
        promise.then((value) => [key, value]),
      ),
    ),
  );

const isAsync = (fnc) => fnc.constructor.name === 'AsyncFunction';

const isBatchedWrite = (operations) => Array.isArray(operations);

export const isDocRead = ({ doc, id } = {}) =>
  typeof id === 'string' || typeof doc === 'string';
export const isProviderRead = (read) =>
  has(read, '::w3Provider') || isFunction(read);
export const getRead = (read) => {
  if (has(read, '::w3Provider')) return read['::w3Provider'];
  if (isFunction(read)) return read();
  return read;
};

const isSingleWrite = ({ collection, path } = {}) =>
  typeof path === 'string' || typeof collection === 'string';

const hasNothing = (snapshot) =>
  !snapshot ||
  (has(snapshot, 'empty') && snapshot.empty()) ||
  (has(snapshot, 'exists') && snapshot.exists);

const getFieldValue = (firebase) =>
  firebase.firestore.FieldValue || firebase.firebase.firestore.FieldValue;

// ----- FieldValue support -----

const primaryValue = (arr) =>
  Array.isArray(arr) && typeof arr[0] === 'string' && arr[0].indexOf('::') === 0
    ? null
    : arr;

const arrayUnion = (firebase, key, ...val) => {
  if (key !== '::arrayUnion') return null;
  return getFieldValue(firebase).arrayUnion(...val);
};

const arrayRemove = (firebase, key, ...val) => {
  if (key !== '::arrayRemove') return null;
  return getFieldValue(firebase).arrayRemove(...val);
};

const increment = (firebase, key, val) =>
  key === '::increment' &&
  typeof val === 'number' &&
  getFieldValue(firebase).increment(val);

const serverTimestamp = (firebase, key) =>
  key === '::serverTimestamp' && getFieldValue(firebase).serverTimestamp();

/**
 * Process Mutation to a vanilla JSON
 * @param {object} firebase - firebase
 * @param {*} operation - payload mutation
 * @returns
 */
function atomize(firebase, operation) {
  let requiresUpdate = false;
  return [
    Object.keys(operation).reduce((data, key) => {
      const clone = { ...data };
      const val = clone[key];
      if (key.includes('.')) {
        requiresUpdate = true;
      }
      if (!val) return clone;

      const value =
        primaryValue(val) ||
        serverTimestamp(firebase, val[0]) ||
        arrayUnion(firebase, val[0], val[1]) ||
        arrayRemove(firebase, val[0], val[1]) ||
        increment(firebase, val[0], val[1]);

      if (Array.isArray(val) && val.length > 0 && isPlainObject(val[0])) {
        clone[key] = val.map((obj) => {
          const [object, update] = atomize(firebase, obj);
          if (update) requiresUpdate = true;
          return object;
        });
      } else if (Array.isArray(val) && val.length > 0) {
        // eslint-disable-next-line no-param-reassign
        clone[key] = value;
      } else if (isPlainObject(val)) {
        const [object, update] = atomize(firebase, val);
        clone[key] = object;
        if (update) requiresUpdate = true;
      }
      return clone;
    }, cloneDeep(operation)),
    requiresUpdate,
  ];
}

// ----- write functions -----

/**
 * For details between set & udpate see:
 * https://firebase.google.com/docs/reference/js/firebase.firestore.Transaction#update
 * @param {object} firebase
 * @param {Mutation_v1 | Mutation_v2} operation
 * @param {Batch | Transaction} writer
 * @returns {Promise | Doc} - Batch & Transaction .set/update change internal state & returns null
 */
function write(firebase, operation = {}, writer = null) {
  if (isEmpty(operation)) return Promise.resolve();
  const { collection, path, doc, id, data, ...rest } = operation;
  const ref = docRef(firebase.firestore(), path || collection, id || doc);
  const [changes, requiresUpdate = false] = atomize(firebase, data || rest);

  if (writer) {
    const writeType = writer.commit ? 'Batching' : 'Transaction.set';
    if (info.enabled) {
      /* istanbul ignore next */
      info(
        writeType,
        JSON.stringify(
          { id: ref.id, path: ref.parent.path, ...changes },
          null,
          2,
        ),
      );
    }

    if (requiresUpdate) {
      writer.update(ref, changes);
    } else {
      writer.set(ref, changes, { merge: true });
    }
    return { id: ref.id, path: ref.parent.path, ...changes };
  }
  if (info.enabled) {
    /* istanbul ignore next */
    info(
      'Writing',
      JSON.stringify(
        { id: ref.id, path: ref.parent.path, ...changes },
        null,
        2,
      ),
    );
  }

  if (requiresUpdate) {
    return ref.update(changes);
  }

  return ref.set(changes, { merge: true });
}

/**
 * @param {object} firebase
 * @param {object} operations
 * @returns {Promise}
 */
function writeSingle(firebase, operations) {
  const done = mark('mutate.writeSingle');
  const promise = write(firebase, operations);
  done();
  return promise;
}

const MAX_BATCH_COUNT = 500;

/**
 * @param {object} firebase
 * @param {object} operations
 * @returns {Promise}
 */
async function writeInBatch(firebase, operations) {
  const done = mark('mutate.writeInBatch');

  const committedBatchesPromised = chunk(operations, MAX_BATCH_COUNT).map(
    (operationsChunk) => {
      const batch = firebase.firestore().batch();
      const writesBatched = operationsChunk.map((operation) =>
        write(firebase, operation, batch),
      );

      return batch.commit().then(() => writesBatched);
    },
  );

  done();

  return Promise.all(committedBatchesPromised).then(flatten);
}

/**
 * @param {object} firebase
 * @param {object} operations
 * @returns {Promise}
 */
async function writeInTransaction(firebase, operations) {
  return firebase.firestore().runTransaction(async (transaction) => {
    const serialize = (doc) =>
      !doc
        ? null
        : { ...doc.data(), id: doc.ref.id, path: doc.ref.parent.path };
    const getter = (ref) => {
      if (info.enabled) {
        /* istanbul ignore next */
        info('Transaction.get ', { id: ref.id, path: ref.parent.path });
      }

      return transaction.get(ref);
    };

    const done = mark('mutate.writeInTransaction:reads');
    const readsPromised = mapValues(operations.reads, async (read) => {
      if (isProviderRead(read)) {
        return getRead(read);
      }

      if (isDocRead(read)) {
        const doc = firestoreRef(firebase, read);
        const snapshot = await getter(doc);
        return serialize(hasNothing(snapshot) ? null : snapshot);
      }

      // else query
      const query = firestoreRef(firebase, read);

      // (As of 7/2021, client-side Firestore doesn't include queries in transactions)
      const nonTransactionQuery = await query.get();
      if (
        hasNothing(nonTransactionQuery) ||
        nonTransactionQuery.docs.length === 0
      )
        return [];

      // followed by transactional get on each document in the result
      const transactionDocs = await Promise.all(
        nonTransactionQuery.docs.map(({ ref }) => getter(ref)),
      );
      return transactionDocs.map(serialize);
    });

    done();
    const reads = await promiseAllObject(readsPromised);

    const writes = [];

    operations.writes.forEach((writeFnc) => {
      if (isAsync(writeFnc))
        throw new Error('Writes must be synchronous, unary functions.');

      const complete = mark('mutate.writeInTransaction:writes');
      const operation =
        typeof writeFnc === 'function' ? writeFnc(reads) : writeFnc;

      if (Array.isArray(operation)) {
        operation.map((op) => write(firebase, op, transaction));
        writes.push(operation);
      } else {
        writes.push(write(firebase, operation, transaction));
      }

      complete();
    });

    // Firestore Transaction return null.
    // Instead we'll return the results of all read data & writes.
    return { reads, writes };
  });
}

export function convertReadProviders(mutations) {
  const shouldMakeProvidesIdempotent = mutations.reads;
  if (!shouldMakeProvidesIdempotent) return;

  Object.keys(mutations.reads).forEach((key) => {
    const read = mutations.reads[key];
    const isReadProvider = isFunction(read);
    if (isAsync(read))
      throw new Error('Read Providers must be synchronous, nullary functions.');
    mutations.reads[key] = isReadProvider ? { '::w3Provider': read() } : read;
  }, mutations);
}

/**
 * @public
 * Write any data to Firestore.
 * @param {object} firestore
 * @param {object} operations
 * @returns {Promise}
 */
export default function mutate(firestore, operations) {
  if (isSingleWrite(operations)) {
    return writeSingle(firestore, operations);
  }

  if (isBatchedWrite(operations)) {
    return writeInBatch(firestore, operations);
  }

  convertReadProviders(operations);

  return writeInTransaction(firestore, operations);
}
