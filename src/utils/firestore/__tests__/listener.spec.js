import {
  attachListener,
  detachListener,
  orderedFromSnap,
  dataByIdSnapshot,
  getSnapshotByObject,
} from '../listener';
import { actionTypes, defaultConfig } from '../../../constants';

let dispatch = jest.fn();
let meta;
let result;
let docSpy;
let fakeFirebase;
const collection = 'test';
const fakeFirebaseWith = (spyedName) => {
  const theSpy = jest.fn(() => ({}));
  const theFirebase = {
    firestore: () => ({
      collection: () => ({
        doc: () => ({
          collection: () => ({ doc: () => ({ [spyedName]: theSpy }) }),
        }),
      }),
    }),
  };
  const theMeta = {
    collection: 'test',
    doc: 'other',
    subcollections: [
      { collection: 'thing', doc: 'again', [spyedName]: 'some' },
    ],
  };
  return { theSpy, theFirebase, theMeta };
};

describe('utils/listener', () => {
  beforeEach(() => {
    dispatch = jest.fn();
    docSpy = jest.fn(() => ({}));
    fakeFirebase = {
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            collection: () => ({ doc: docSpy }),
          }),
        }),
      }),
    };
  });

  describe('attachListener', () => {
    it('is exported', () => {
      expect(typeof attachListener).toBe('function');
    });

    it('converts slash path to dot path', () => {
      attachListener({ _: { listeners: {} } }, dispatch, {
        collection: 'test',
      });
      expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('throws if meta is not included', () => {
      expect(() => attachListener({}, dispatch)).toThrow(
        'Meta data is required to attach listener.',
      );
    });

    it('throws if _ variable is not defined on Firebase', () => {
      expect(() =>
        attachListener({}, dispatch, { collection: 'test' }),
      ).toThrow(
        'Internal Firebase object required to attach listener. Confirm that reduxFirestore enhancer was added when you were creating your store',
      );
    });

    describe('converts slash path to dot path', () => {
      beforeEach(() => {
        dispatch = jest.fn();
      });

      it('for collection', () => {
        meta = { collection: 'test' };
        attachListener({ _: { listeners: {} } }, dispatch, meta);
        expect(dispatch).toHaveBeenCalledWith({
          meta,
          payload: { name: 'test' },
          type: '::readwrite/SET_LISTENER',
        });
      });

      it('for collection and document', () => {
        meta = { collection: 'test', doc: 'doc' };
        attachListener({ _: { listeners: {} } }, dispatch, meta);
        expect(dispatch).toHaveBeenCalledWith({
          meta,
          payload: { name: `${meta.collection}/${meta.doc}` },
          type: '::readwrite/SET_LISTENER',
        });
      });

      it('for collection, document, and subcollections', () => {
        meta = {
          collection: 'test',
          doc: 'doc',
          subcollections: [{ collection: 'test' }],
        };
        attachListener({ _: { listeners: {} } }, dispatch, meta);
        expect(dispatch).toHaveBeenCalledWith({
          meta,
          payload: {
            name: `${meta.collection}/${meta.doc}/${meta.subcollections[0].collection}`,
          },
          type: '::readwrite/SET_LISTENER',
        });
      });
    });

    it('throws if meta is not included', () => {
      expect(() => attachListener({}, dispatch)).toThrow(
        'Meta data is required to attach listener.',
      );
    });

    it('throws if _ variable is not defined on Firebase', () => {
      expect(() =>
        attachListener({}, dispatch, { collection: 'test' }),
      ).toThrow(
        'Internal Firebase object required to attach listener. Confirm that reduxFirestore enhancer was added when you were creating your store',
      );
    });
  });

  describe('detachListener', () => {
    it('is exported', () => {
      expect(typeof detachListener).toBe('function');
    });

    it('calls dispatch with unlisten actionType', () => {
      const callbackSpy = jest.fn();
      detachListener(
        { _: { listeners: { test: callbackSpy }, config: defaultConfig } },
        dispatch,
        { collection },
      );
      expect(dispatch).toHaveBeenCalledWith({
        type: actionTypes.UNSET_LISTENER,
        meta: { collection },
        payload: { name: collection, preserveCache: true },
      });
    });

    it('calls unlisten if listener exists', () => {
      const callbackSpy = jest.fn();
      detachListener({ _: { listeners: { test: callbackSpy } } }, dispatch, {
        collection: 'test',
      });
      expect(dispatch).toBeCalledTimes(1);
    });

    it('detaches listener if it exists', () => {
      const callbackSpy = jest.fn();
      detachListener({ _: { listeners: { test: callbackSpy } } }, dispatch, {
        collection: 'test',
      });
      expect(dispatch).toBeCalledTimes(1);
    });
  });

  describe('orderedFromSnap', () => {
    it('returns empty array if data does not exist', () => {
      result = orderedFromSnap({});
      expect(result).toBeInstanceOf(Array);
      expect(result).toStrictEqual([]);
    });

    it('returns an array containing data if it exists', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const fakeData = { some: 'thing' };
      result = orderedFromSnap({ id, ref, data: () => fakeData, exists: true });
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('some');
    });

    it('returns an array non object data within an object containing id and data parameters', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const fakeData = 'some';
      result = orderedFromSnap({ id, ref, data: () => fakeData, exists: true });
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('path');
      expect(result[0]).toHaveProperty('data');
    });

    it('returns an array containing children if they exist', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const fakeData = 'some';
      result = orderedFromSnap({
        forEach: (func) => func({ data: () => fakeData, ref, id }),
      });
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('path');
    });
  });

  describe('dataByIdSnapshot', () => {
    it('sets data by id if valid', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const fakeData = { some: 'thing' };
      result = dataByIdSnapshot({
        id,
        ref,
        data: () => fakeData,
        exists: true,
      });

      expect(result[id]).toHaveProperty('id');
      expect(result[id]).toHaveProperty('path');
      expect(result[id]).toHaveProperty('some');
    });

    it('supports collection data', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const empty = false;
      const fakeData = { some: 'thing' };
      result = dataByIdSnapshot({
        empty,
        forEach: (func) => func({ data: () => fakeData, ref, id }),
      });

      expect(result[id]).toHaveProperty('id');
      expect(result[id]).toHaveProperty('path');
      expect(result[id]).toHaveProperty('some');
    });

    it('returns null if no data returned for collection', () => {
      const forEach = () => ({});
      const empty = true;
      result = dataByIdSnapshot({ forEach, empty });
      expect(result).toBeNull();
    });

    it('returns object with null id if no data returned for a doc', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const data = () => ({});
      const exists = false;
      result = dataByIdSnapshot({ id, ref, exists, data });

      expect(typeof result).toBe('object');
      expect(result).toHaveProperty(id);
    });
  });

  describe('snapshotCache', () => {
    it('retrieve snapshot with data from data state ', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const fakeData = { some: 'thing' };
      const fakeSnap = { id, ref, data: () => fakeData, exists: true };
      result = dataByIdSnapshot(fakeSnap);
      expect(getSnapshotByObject(result)).toBe(fakeSnap);
    });

    it('retrieve snapshot with data from data collection state ', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const fakeData = { some: 'thing' };
      const fakeDocSnap = { id, ref, data: () => fakeData, exists: true };
      const docArray = [fakeDocSnap];
      const fakeSnap = { forEach: docArray.forEach.bind(docArray) };
      result = dataByIdSnapshot(fakeSnap);
      expect(getSnapshotByObject(result)).toBe(fakeSnap);
    });

    it('retrieve snapshot with data from ordered state', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const fakeData = { some: 'thing' };
      const fakeSnap = { id, ref, data: () => fakeData, exists: true };
      result = orderedFromSnap(fakeSnap);
      expect(getSnapshotByObject(result)).toBe(fakeSnap);
    });

    it('retrieve snapshot with data from ordered collection state ', () => {
      const id = 'someId';
      const ref = { parent: { path: 'collection' } };
      const fakeData = { some: 'thing' };
      const fakeDocSnap = { id, ref, data: () => fakeData, exists: true };
      const docArray = [fakeDocSnap];
      const fakeSnap = { forEach: docArray.forEach.bind(docArray) };
      result = orderedFromSnap(fakeSnap);
      expect(getSnapshotByObject(result)).toBe(fakeSnap);
      expect(getSnapshotByObject(result[0])).toBe(fakeDocSnap);
    });
  });
});
