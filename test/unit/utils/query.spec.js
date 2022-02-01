import {
  attachListener,
  detachListener,
  getQueryConfigs,
  getQueryName,
  firestoreRef,
  orderedFromSnap,
  dataByIdSnapshot,
  getSnapshotByObject,
} from 'utils/query';
import { actionTypes, defaultConfig } from 'constants';
import { getBaseQueryName } from '../../../src/utils/query';

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

describe('query utils', () => {
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

  describe('getQueryName', () => {
    it('throws for no collection name', () => {
      expect(() => getQueryName({})).toThrowError(
        'Path or Collection Group is required to build query name',
      );
      expect(() => getBaseQueryName({})).toThrowError(
        'Path or Collection Group is required to build query name',
      );
    });

    it('returns meta if it is a string (path presumed as name)', () => {
      meta = 'test';
      result = getQueryName(meta);
      expect(result).toBe(meta);
      expect(getBaseQueryName(meta)).toBe(meta);
    });

    it('returns collection name', () => {
      meta = { collection: 'test' };
      result = getQueryName(meta);
      expect(result).toBe(meta.collection);
      expect(getBaseQueryName(meta)).toBe(meta.collection);
    });

    it('returns collectionGroup name', () => {
      meta = { collectionGroup: 'test' };
      result = getQueryName(meta);
      expect(result).toBe(meta.collectionGroup);
      expect(getBaseQueryName(meta)).toBe(meta.collectionGroup);
    });

    it('returns collection/doc', () => {
      meta = { collection: 'test', doc: 'doc' };
      result = getQueryName(meta);
      expect(result).toBe(`${meta.collection}/${meta.doc}`);
      expect(getBaseQueryName(meta)).toBe(`${meta.collection}`);
    });

    describe('where parameter', () => {
      it('is appended if valid', () => {
        meta = { collection: 'test', doc: 'doc', where: 'some' };
        expect(() => getQueryName(meta)).toThrowError(
          'where parameter must be an array.',
        );
        expect(() => getBaseQueryName(meta)).toThrowError(
          'where parameter must be an array.',
        );
      });

      it('is appended if valid', () => {
        meta = {
          collection: 'test',
          doc: 'doc',
          where: [
            ['some', '==', 'other'],
            ['other', '>', 'more'],
          ],
        };
        expect(getQueryName(meta)).toBe(
          `${meta.collection}/${meta.doc}?where=some:==:other,where=other:>:more`,
        );
        expect(getBaseQueryName(meta)).toBe(
          `${meta.collection}?where=some:==:other,where=other:>:more`,
        );
      });
    });

    describe('limit parameter', () => {
      it('is appended if valid', () => {
        meta = {
          collection: 'test',
          doc: 'doc',
          limit: 10,
        };
        result = getQueryName(meta);
        expect(result).toBe('test/doc?limit=10');
        expect(getBaseQueryName(meta)).toBe('test?limit=10');
      });
    });

    describe('startAt parameter', () => {
      it('is appended if valid string', () => {
        meta = {
          collection: 'test',
          startAt: 'asdf',
        };
        result = getQueryName(meta);
        expect(result).toBe('test?startAt=asdf');
        expect(getBaseQueryName(meta)).toBe('test?startAt=asdf');
      });

      it('is appended if valid array', () => {
        meta = {
          collection: 'test',
          startAt: ['asdf', 1234, 'qwerty'],
        };
        result = getQueryName(meta);
        expect(result).toBe('test?startAt=asdf:1234:qwerty');
        expect(getBaseQueryName(meta)).toBe('test?startAt=asdf:1234:qwerty');
      });

      it('appends passed date objects', () => {
        meta = {
          collection: 'test',
          startAt: new Date(2020, 2, 2, 2, 2, 2),
        };
        result = getQueryName(meta).substr(0, 37);
        expect(result).toBe('test?startAt=3/2/20, 02:02');
        expect(getBaseQueryName(meta)).toBe('test?startAt=3/2/20, 02:02');
      });
    });
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
          type: '@@reduxFirestore/SET_LISTENER',
        });
      });

      it('for collection and document', () => {
        meta = { collection: 'test', doc: 'doc' };
        attachListener({ _: { listeners: {} } }, dispatch, meta);
        expect(dispatch).toHaveBeenCalledWith({
          meta,
          payload: { name: `${meta.collection}/${meta.doc}` },
          type: '@@reduxFirestore/SET_LISTENER',
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
          type: '@@reduxFirestore/SET_LISTENER',
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

  describe('getQueryConfigs', () => {
    it('is exported', () => {
      expect(typeof getQueryConfigs).toBe('function');
    });

    it('it throws for invalid input', () => {
      expect(() => getQueryConfigs(1)).toThrow(
        'Querie(s) must be an Array or a string',
      );
    });

    describe('array', () => {
      it('with collection in string', () => {
        expect(getQueryConfigs(['test'])).toHaveProperty('0.collection');
      });

      it('with collection in an object', () => {
        expect(getQueryConfigs([{ collection: 'test' }])).toHaveProperty(
          '0.collection',
        );
      });

      it('with collection and doc in an object', () => {
        meta = [{ collection: 'test', doc: 'other' }];
        result = getQueryConfigs(meta);
        expect(result).toHaveProperty('0.collection');
        expect(result).toHaveProperty('0.doc');
      });

      it('throws invalid object', () => {
        meta = [{ test: 'test' }];
        expect(() => getQueryConfigs(meta)).toThrow(
          'Path, Collection Group and/or Id are required parameters within query definition object.',
        );
      });
    });

    describe('string', () => {
      it('with collection', () => {
        expect(getQueryConfigs('test')).toHaveProperty('collection');
      });

      it('with nested subcollections', () => {
        meta = {
          collection: 'test',
          doc: 'other',
          subcollections: [
            {
              collection: 'col2',
              doc: 'doc2',
              subcollections: [
                {
                  collection: 'col3',
                  doc: 'doc3',
                  subcollections: [{ collection: 'col4' }],
                },
              ],
            },
          ],
        };
        result = getQueryConfigs('/test/other/col2/doc2/col3/doc3/col4');
        expect(result).toStrictEqual(meta);
      });
    });

    describe('object', () => {
      it('with collection', () => {
        expect(getQueryConfigs({ collection: 'test' })).toHaveProperty(
          '0.collection',
        );
      });

      it('with doc', () => {
        meta = { collection: 'test', doc: 'other' };
        result = getQueryConfigs(meta);
        expect(result).toHaveProperty('0.collection');
        expect(result).toHaveProperty('0.doc');
      });

      it('with subcollections', () => {
        meta = {
          collection: 'test',
          doc: 'other',
          subcollections: [{ collection: 'thing' }],
        };
        result = getQueryConfigs(meta);
        expect(result).toHaveProperty('0.collection');
        expect(result).toHaveProperty('0.doc');
        expect(result).toHaveProperty('0.subcollections.0.collection');
      });

      it('with nested subcollections', () => {
        meta = {
          collection: 'test',
          doc: 'other',
          subcollections: [
            {
              collection: 'col2',
              doc: 'doc2',
              subcollections: [
                {
                  collection: 'col3',
                  doc: 'doc3',
                  subcollections: [{ collection: 'col4' }],
                },
              ],
            },
          ],
        };
        result = getQueryConfigs(meta);
        expect(result).toStrictEqual([meta]);
      });
    });
  });

  describe('firestoreRef', () => {
    beforeEach(() => {
      dispatch = jest.fn();
    });

    describe('doc', () => {
      it('creates ref', () => {
        meta = { collection: 'test', doc: 'other' };
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ doc: docSpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(docSpy).toHaveBeenCalledWith(meta.doc);
      });
    });

    describe('collectionGroup', () => {
      it('throws if path and collectionGroup are both provided', () => {
        const queryMeta = { collectionGroup: 'test', collection: 'other' };
        expect(() => firestoreRef(fakeFirebase, queryMeta)).toThrow(
          'Reference cannot contain both Path and CollectionGroup.',
        );
      });

      it('calls collectionGroup', () => {
        const queryMeta = { collectionGroup: 'test' };
        const collectionGroupSpy = jest.fn();
        fakeFirebase = {
          firestore: () => ({ collectionGroup: collectionGroupSpy }),
        };
        firestoreRef(fakeFirebase, queryMeta);
        expect(collectionGroupSpy).toHaveBeenCalledWith(
          queryMeta.collectionGroup,
        );
      });
    });

    describe('subcollections', () => {
      it('throws if trying to get doc not provided', () => {
        const subcollection = 'thing';
        meta = {
          collection,
          subcollections: [{ collection: subcollection, doc: 'again' }],
        };
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({
              doc: () => ({
                collection: () => ({ doc: docSpy }),
              }),
            }),
          }),
        };
        expect(() => firestoreRef(fakeFirebase, meta)).toThrowError(
          `Collection can only be run on a document. Check that query config for subcollection: "${subcollection}" contains a doc parameter.`,
        );
      });

      it('creates ref with collection', () => {
        meta = {
          collection: 'test',
          doc: 'other',
          subcollections: [{ collection: 'thing' }],
        };
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({
              doc: () => ({
                collection: () => ({ doc: docSpy }),
              }),
            }),
          }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
      });

      it('creates ref with nested collection', () => {
        const collectionSpy = jest.fn(() => ({ doc: 'data' }));
        meta = {
          collection: 'test',
          doc: 'other',
          subcollections: [
            {
              collection: 'thing',
              doc: 'again',
              subcollections: [{ collection: 'thing2' }],
            },
          ],
        };
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({
              doc: () => ({
                collection: () => ({
                  doc: () => ({
                    collection: collectionSpy,
                  }),
                }),
              }),
            }),
          }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(result).toStrictEqual({ doc: 'data' });
        expect(collectionSpy).toBeCalledTimes(1);
      });

      it('creates ref with doc', () => {
        meta = {
          collection: 'test',
          doc: 'other',
          subcollections: [{ collection: 'thing', doc: 'again' }],
        };
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({
              doc: () => ({
                collection: () => ({ doc: docSpy }),
              }),
            }),
          }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(docSpy).toHaveBeenCalledWith(meta.subcollections[0].doc);
        expect(getBaseQueryName(meta)).toBe('test/thing/again');
      });

      it('calls where if provided where parameter', () => {
        const testVal = 'some';
        meta = {
          collection: 'test',
          doc: 'other',
          subcollections: [
            { collection: 'thing', doc: 'again', where: [testVal] },
          ],
        };
        const whereSpy = jest.fn();
        docSpy = jest.fn(() => ({ where: whereSpy }));
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({
              doc: () => ({
                collection: () => ({ doc: docSpy }),
              }),
            }),
          }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(docSpy).toHaveBeenCalledWith(meta.subcollections[0].doc);
        expect(whereSpy).toHaveBeenCalledWith(testVal);
      });

      describe('orderBy', () => {
        it('calls orderBy if valid', () => {
          meta = {
            collection: 'test',
            doc: 'other',
            subcollections: [
              { collection: 'thing', doc: 'again', orderBy: 'some' },
            ],
          };
          const orderBySpy = jest.fn(() => ({}));
          docSpy = jest.fn(() => ({ orderBy: orderBySpy }));
          fakeFirebase = {
            firestore: () => ({
              collection: () => ({
                doc: () => ({
                  collection: () => ({ doc: docSpy }),
                }),
              }),
            }),
          };
          result = firestoreRef(fakeFirebase, meta);
          expect(typeof result).toBe('object');
          expect(orderBySpy).toHaveBeenCalledWith(
            meta.subcollections[0].orderBy,
          );
        });
      });

      describe('limit', () => {
        it('calls limit if valid', () => {
          meta = {
            collection: 'test',
            doc: 'other',
            subcollections: [
              { collection: 'thing', doc: 'again', limit: 'some' },
            ],
          };
          const limitSpy = jest.fn(() => ({}));
          docSpy = jest.fn(() => ({ limit: limitSpy }));
          fakeFirebase = {
            firestore: () => ({
              collection: () => ({
                doc: () => ({
                  collection: () => ({ doc: docSpy }),
                }),
              }),
            }),
          };
          result = firestoreRef(fakeFirebase, meta);
          expect(typeof result).toBe('object');
          expect(limitSpy).toHaveBeenCalledWith(meta.subcollections[0].limit);
        });
      });

      describe('startAt', () => {
        it('calls startAt if valid', () => {
          const { theFirebase, theSpy, theMeta } = fakeFirebaseWith('startAt');
          result = firestoreRef(theFirebase, theMeta);
          expect(typeof result).toBe('object');
          expect(theSpy).toHaveBeenCalledWith(
            theMeta.subcollections[0].startAt,
          );
        });
      });

      describe('startAfter', () => {
        it('calls startAfter if valid', () => {
          const { theFirebase, theSpy, theMeta } =
            fakeFirebaseWith('startAfter');
          result = firestoreRef(theFirebase, theMeta);
          expect(typeof result).toBe('object');
          expect(theSpy).toHaveBeenCalledWith(
            theMeta.subcollections[0].startAfter,
          );
        });
      });

      describe('endAt', () => {
        it('calls endAt if valid', () => {
          meta = {
            collection: 'test',
            doc: 'other',
            subcollections: [
              { collection: 'thing', doc: 'again', endAt: 'some' },
            ],
          };
          const { theFirebase, theSpy } = fakeFirebaseWith('endAt');
          result = firestoreRef(theFirebase, meta);
          expect(typeof result).toBe('object');
          expect(theSpy).toHaveBeenCalledWith(meta.subcollections[0].endAt);
        });
      });

      describe('endBefore', () => {
        it('calls endBefore if valid', () => {
          meta = {
            collection: 'test',
            doc: 'other',
            subcollections: [
              { collection: 'thing', doc: 'again', endBefore: 'some' },
            ],
          };
          const { theFirebase, theSpy } = fakeFirebaseWith('endBefore');
          result = firestoreRef(theFirebase, meta);
          expect(typeof result).toBe('object');
          expect(theSpy).toHaveBeenCalledWith(meta.subcollections[0].endBefore);
        });
      });
    });

    describe('where', () => {
      it("throws if query doesn't have path.", () => {
        expect(() => firestoreRef(fakeFirebase, { where: ['other'] })).toThrow(
          "Query References must include a 'path' property.",
        );
      });
      it('calls where if valid', () => {
        meta = { path: 'test', where: ['other'] };
        const whereSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ where: whereSpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(whereSpy).toHaveBeenCalledWith(meta.where[0]);
      });

      it('handles array of arrays', () => {
        const where1 = ['other', '===', 'test'];
        const where2 = ['second', '===', 'value'];
        meta = { collection: 'test', where: [where1, where2] };
        const where2Spy = jest.fn(() => ({}));
        const whereSpy = jest.fn(() => ({ where: where2Spy }));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ where: whereSpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(whereSpy).toHaveBeenCalledWith(...where1);
        expect(where2Spy).toHaveBeenCalledWith(...where2);
      });

      it('throws for invalid where parameter', () => {
        meta = { collection: 'test', where: 'other' };
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ where: () => ({}) }) }),
        };
        expect(() => firestoreRef(fakeFirebase, meta)).toThrowError(
          'where parameter must be an array.',
        );
      });
    });

    describe('orderBy', () => {
      it('calls orderBy if valid', () => {
        meta = { collection: 'test', orderBy: ['other'] };
        const orderBySpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ orderBy: orderBySpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(orderBySpy).toHaveBeenCalledWith(meta.orderBy[0]);
      });

      it('handles array of arrays', () => {
        meta = { collection: 'test', orderBy: [['other']] };
        const orderBySpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ orderBy: orderBySpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(orderBySpy).toHaveBeenCalledWith(meta.orderBy[0][0]);
      });

      it('throws for invalid orderBy parameter', () => {
        meta = { collection: 'test', orderBy: () => {} };
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ orderBy: () => ({}) }) }),
        };
        expect(() => firestoreRef(fakeFirebase, meta)).toThrowError(
          'orderBy parameter must be an array or string.',
        );
      });
    });

    describe('limit', () => {
      it('calls limit if valid', () => {
        meta = { collection: 'test', limit: 'other' };
        const limitSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ limit: limitSpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(limitSpy).toHaveBeenCalledWith(meta.limit);
      });
    });

    describe('startAt', () => {
      it('calls startAt if valid', () => {
        meta = { collection: 'test', startAt: 'other' };
        const startAtSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ startAt: startAtSpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(startAtSpy).toHaveBeenCalledWith(meta.startAt);
      });

      it('calls startAt if valid array', () => {
        meta = { collection: 'test', startAt: ['other', 'another'] };
        const startAtSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({ startAt: startAtSpy }),
          }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(startAtSpy).toHaveBeenCalledWith(...meta.startAt);
      });
    });

    describe('startAfter', () => {
      it('calls startAfter if valid', () => {
        meta = { collection: 'test', startAfter: 'other' };
        const startAfterSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({ startAfter: startAfterSpy }),
          }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(startAfterSpy).toHaveBeenCalledWith(meta.startAfter);
      });

      it('calls startAfter if valid array', () => {
        meta = { collection: 'test', startAfter: ['other', 'another'] };
        const startAfterSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({ startAfter: startAfterSpy }),
          }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(startAfterSpy).toHaveBeenCalledWith(...meta.startAfter);
      });
    });

    describe('endAt', () => {
      it('calls endAt if valid', () => {
        meta = { collection: 'test', endAt: 'other' };
        const endAtSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ endAt: endAtSpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(endAtSpy).toHaveBeenCalledWith(meta.endAt);
      });

      it('calls endAt if valid array', () => {
        meta = { collection: 'test', endAt: ['other', 'another'] };
        const endAtSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ endAt: endAtSpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(endAtSpy).toHaveBeenCalledWith(...meta.endAt);
      });
    });

    describe('endBefore', () => {
      it('calls endBefore if valid', () => {
        meta = { collection: 'test', endBefore: 'other' };
        const endBeforeSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({ endBefore: endBeforeSpy }),
          }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(endBeforeSpy).toHaveBeenCalledWith(meta.endBefore);
      });

      it('calls endBefore if valid array', () => {
        meta = { collection: 'test', endBefore: ['other', 'another'] };
        const endBeforeSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({
            collection: () => ({ endBefore: endBeforeSpy }),
          }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(endBeforeSpy).toHaveBeenCalledWith(...meta.endBefore);
      });
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
