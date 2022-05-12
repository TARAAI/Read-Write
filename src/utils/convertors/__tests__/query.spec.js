import {
  getQueryConfigs,
  getQueryName,
  firestoreRef,
  getBaseQueryName,
} from '..';

let meta;
let result;
let docSpy;
let fakeFirebase;
let dispatch;
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

    it('returns alias if manually set', () => {
      meta = { path: 'collection', storeAs: 'alias' };
      result = getQueryName(meta);
      expect(result).toBe(meta.storeAs);
      expect(getBaseQueryName(meta)).toBe(meta.path);
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
      meta = {
        collection: 'test',
        subcollections: [{ collection: 'test1' }, { collection: 'test2' }],
      };
      result = getQueryName(meta);
      console.log(result);
      expect(result).toBe(
        `${meta.collection}/${meta.subcollections[0].collection}/${meta.subcollections[1].collection}`,
      );
      // expect(getBaseQueryName(meta)).toBe(`${meta.collection}`);
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

  describe('getQueryConfigs', () => {
    it('is exported', () => {
      expect(typeof getQueryConfigs).toBe('function');
    });

    it('it throws for invalid input', () => {
      expect(() => getQueryConfigs(1)).toThrow(
        'Queries must be an Array or a string.',
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
        meta = { path: 'test', startAt: 'other' };
        const startAtSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ startAt: startAtSpy }) }),
        };
        result = firestoreRef(fakeFirebase, meta);
        expect(typeof result).toBe('object');
        expect(startAtSpy).toHaveBeenCalledWith(meta.startAt);
      });

      it('startAt supports firestore document references', () => {
        meta = { path: 'test', startAt: { toString: () => 'function' } };
        const startAtSpy = jest.fn(() => ({}));
        fakeFirebase = {
          firestore: () => ({ collection: () => ({ startAt: startAtSpy }) }),
        };
        result = getBaseQueryName(meta);

        expect(result).toBe('test?startAt=function');
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
});
