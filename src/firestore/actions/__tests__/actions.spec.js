import createFirestoreInstance, {
  getFirestore,
} from '../../extend/createFirestoreInstance';
import { firestoreActions } from '..';
import { setListeners } from '../snapshot-listener';
import { actionTypes, defaultConfig } from '../../../constants';

let dispatchSpy;
let fakeFirebase;
let listenerConfig;
let collectionClass;
let onSnapshotSpy;
let deleteSpy;
let addSpy;
let setSpy;
let getSpy;
let updateSpy;

const fakeConfig = {
  helpersNamespace: 'test',
};

const successRes = 'success';
let callErrorCallback = false;

describe('firestoreActions', () => {
  beforeEach(() => {
    dispatchSpy = jest.fn();
    addSpy = jest.fn(() => Promise.resolve(successRes));
    setSpy = jest.fn(() => Promise.resolve(successRes));
    getSpy = jest.fn(() => Promise.resolve(successRes));
    updateSpy = jest.fn(() => Promise.resolve(successRes));
    deleteSpy = jest.fn(() => Promise.resolve(successRes));
    onSnapshotSpy = jest.fn((func, func2) => {
      if (!callErrorCallback) {
        func(jest.fn());
      } else {
        func2(jest.fn());
      }
    });
    listenerConfig = {};
    collectionClass = () => ({
      doc: () => ({
        collection: collectionClass,
        onSnapshot: onSnapshotSpy,
        delete: deleteSpy,
        get: getSpy,
      }),
      add: addSpy,
      set: setSpy,
      get: getSpy,
      update: updateSpy,
      onSnapshot: onSnapshotSpy,
    });
    fakeFirebase = {
      _: { listeners: {}, pathListenerCounts: {}, config: defaultConfig },
      firestore: () => ({
        collection: collectionClass,
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    callErrorCallback = false;
  });

  describe('exports', () => {
    it('add', () => {
      expect(firestoreActions).toHaveProperty('add');
    });
  });

  describe('actions', () => {
    describe('getFirestore', () => {
      it('getFirestore returns instance', async () => {
        const instance = createFirestoreInstance(
          fakeFirebase,
          { helpersNamespace: 'test' },
          dispatchSpy,
        );

        expect(getFirestore()).toBe(instance);
      });
    });

    describe('add', () => {
      it('throws if Firestore is not initialized', () => {
        expect(() => {
          const instance = createFirestoreInstance(
            {},
            { helpersNamespace: 'test' },
          );
          instance.test.add({ collection: 'test' });
        }).toThrow();
      });

      it('calls dispatch with correct action types', async () => {
        const instance = createFirestoreInstance(
          fakeFirebase,
          { helpersNamespace: 'test' },
          dispatchSpy,
        );
        await instance.test.add({ collection: 'test' }, { some: 'thing' });

        expect(dispatchSpy.mock.calls[0][0]).toHaveProperty(
          'type',
          '::readwrite/ADD_REQUEST',
        );
        expect(dispatchSpy.mock.calls[1][0]).toHaveProperty(
          'type',
          '::readwrite/ADD_SUCCESS',
        );
        expect(mockAddSpy).toHaveBeenCalled();
      });
    });

    describe('set', () => {
      it('throws if Firestore is not initialized', () => {
        expect(() => {
          const instance = createFirestoreInstance(
            {},
            { helpersNamespace: 'test' },
          );
          instance.test.set({ collection: 'test' });
        }).toThrow();
      });

      it('calls dispatch with correct action types', async () => {
        const instance = createFirestoreInstance(
          fakeFirebase,
          { helpersNamespace: 'test' },
          dispatchSpy,
        );
        await instance.test.set({ collection: 'test' }, { some: 'thing' });
        expect(dispatchSpy.mock.calls[0][0]).toHaveProperty(
          'type',
          '::readwrite/SET_REQUEST',
        );
        expect(dispatchSpy.mock.calls[1][0]).toHaveProperty(
          'type',
          '::readwrite/SET_SUCCESS',
        );
        expect(setSpy).toHaveBeenCalled();
      });
    });

    describe('update', () => {
      it('throws if Firestore is not initialized', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() => instance.test.update({ collection: 'test' })).toThrowError(
          'Firestore must be required and initalized.',
        );
      });

      it('calls dispatch with correct action types', async () => {
        const instance = createFirestoreInstance(
          fakeFirebase,
          { helpersNamespace: 'test' },
          dispatchSpy,
        );
        await instance.test.update({ collection: 'test' }, { some: 'thing' });
        expect(dispatchSpy.mock.calls[0][0]).toHaveProperty(
          'type',
          '::readwrite/UPDATE_REQUEST',
        );
        expect(dispatchSpy.mock.calls[1][0]).toHaveProperty(
          'type',
          '::readwrite/UPDATE_SUCCESS',
        );
        expect(updateSpy).toHaveBeenCalled();
      });
    });

    describe('deleteRef', () => {
      it('calls delete with dispatches before and after', async () => {
        const instance = createFirestoreInstance(
          fakeFirebase,
          { helpersNamespace: 'test' },
          dispatchSpy,
        );
        const res = await instance.test.deleteRef({
          collection: 'test',
          doc: 'test',
        });
        expect(dispatchSpy.mock.calls.length).toBe(2);
        expect(res).toBe(successRes);
      });

      it('throws if attempting to delete a collection', async () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        try {
          await instance.test.deleteRef({ collection: 'test' });
        } catch (err) {
          expect(err.message).toBe('Only documents can be deleted.');
        }
      });

      it('calls onAttemptCollectionDelete if provided', async () => {
        const funcSpy = jest.fn(() => Promise.resolve('test'));
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test', onAttemptCollectionDelete: funcSpy },
        );
        const res = await instance.test.deleteRef({ collection: 'test' });
        expect(funcSpy).toHaveBeenCalled();
        expect(res).toBe('test');
      });
    });

    describe('get', () => {
      it('throws if attempting to delete a collection', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() => instance.test.get({ collection: 'test' })).toThrowError(
          'Firestore must be required and initalized.',
        );
      });

      it('throws if attempting to delete a sub-collection', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() =>
          instance.test.get({
            collection: 'test',
            doc: 'testing',
            subcollection: [{ collection: 'test' }],
          }),
        ).toThrowError('Firestore must be required and initalized.');
      });

      it('throws if attempting to delete a nested sub-collection', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() =>
          instance.test.get({
            collection: 'test',
            doc: 'testing',
            subcollection: [
              { collection: 'test', doc: 'asdf' },
              { collection: 'test2' },
            ],
          }),
        ).toThrowError('Firestore must be required and initalized.');
      });

      it('calls dispatch twice', async () => {
        const instance = createFirestoreInstance(
          fakeFirebase,
          { helpersNamespace: 'test' },
          dispatchSpy,
        );
        const res = await instance.test.get({ collection: 'test' });
        expect(res).toBe(successRes);
        expect(dispatchSpy.mock.calls.length).toBe(2);
      });
    });

    describe('setListener', () => {
      describe('docChanges', () => {
        afterEach(() => {
          const thing = jest.fn();
          onSnapshotSpy = jest.fn((func, func2) => {
            if (!callErrorCallback) {
              func(thing);
            } else {
              func2(thing);
            }
          });
          jest.clearAllMocks();
        });

        it('calls success callback if provided', async () => {
          listenerConfig = {
            collection: 'test',
            doc: '1',
            subcollections: [{ collection: 'test2', doc: 'test3' }],
          };
          const instance = createFirestoreInstance(
            fakeFirebase,
            fakeConfig,
            dispatchSpy,
          );
          const successSpy = jest.fn();
          await instance.test.setListener(listenerConfig, successSpy);
          expect(successSpy).toHaveBeenCalled();
        });

        it('calls error callback if provided', async () => {
          callErrorCallback = true;
          listenerConfig = {
            collection: 'test',
            doc: '1',
            subcollections: [{ collection: 'test2', doc: 'test3' }],
          };
          const instance = createFirestoreInstance(
            fakeFirebase,
            fakeConfig,
            dispatchSpy,
          );
          const successSpy = jest.fn();
          const errorSpy = jest.fn();
          await instance.test.setListener(listenerConfig, successSpy, errorSpy);
          expect(successSpy.mock.calls.length).toBe(0);
          expect(errorSpy).toHaveBeenCalled();
          callErrorCallback = false;
        });

        describe('as a parameter', () => {
          it('updates single root-level doc in state when docChanges includes single doc change with type: "modified"', async () => {
            onSnapshotSpy = jest.fn((func) => {
              func({
                docChanges: [
                  {
                    doc: {
                      id: '123ABC',
                      data: () => ({ some: 'value' }),
                      ref: {
                        path: 'test/1',
                        parent: {
                          path: 'test',
                        },
                      },
                    },
                    newIndex: 1,
                    oldIndex: 0,
                    type: 'modified',
                  },
                ],
                size: 2,
                doc: {
                  id: '123ABC',
                  parent: {
                    path: 'test',
                  },
                },
              });
            });
            listenerConfig = {
              collection: 'test',
              doc: '1',
            };
            const instance = createFirestoreInstance(
              fakeFirebase,
              fakeConfig,
              dispatchSpy,
            );
            await instance.test.setListener(listenerConfig);
            expect(onSnapshotSpy).toHaveBeenCalled();

            expect(dispatchSpy.mock.calls.length).toBe(2);
            expect(dispatchSpy.mock.calls[0][0]).toStrictEqual({
              meta: {
                collection: 'test',
                doc: '123ABC',
                path: 'test',
                reprocess: true,
              },
              payload: {
                data: { id: '123ABC', path: 'test', some: 'value' },
                ordered: { newIndex: 1, oldIndex: 0 },
              },
              type: '::readwrite/DOCUMENT_MODIFIED',
            });
            expect(dispatchSpy.mock.calls[0][0]).toHaveProperty(
              'type',
              actionTypes.DOCUMENT_MODIFIED,
            );
            expect(dispatchSpy.mock.calls[1][0]).toHaveProperty(
              'type',
              actionTypes.SET_LISTENER,
            );
          });

          it('updates single doc in state when docChanges includes single doc change with type: "modified"', async () => {
            onSnapshotSpy = jest.fn((func) => {
              func({
                docChanges: [
                  {
                    doc: {
                      id: '123ABC',
                      data: () => ({ some: 'value' }),
                      ref: {
                        path: 'test/1/test2/test3',
                        parent: {
                          path: 'test/1/test2',
                        },
                      },
                    },
                    type: 'modified',
                  },
                ],
                size: 2,
                doc: {
                  id: '123ABC',
                  parent: {
                    path: 'test/1/test2',
                  },
                },
              });
            });
            listenerConfig = {
              collection: 'test',
              doc: '1',
              subcollections: [{ collection: 'test2', doc: 'test3' }],
            };
            const instance = createFirestoreInstance(
              fakeFirebase,
              fakeConfig,
              dispatchSpy,
            );
            await instance.test.setListener(listenerConfig);
            expect(onSnapshotSpy).toHaveBeenCalled();
            // SET_LISTENER, DOCUMENT_MODIFIED
            expect(dispatchSpy.mock.calls.length).toBe(2);
            expect(dispatchSpy.mock.calls[0][0]).toHaveProperty(
              'type',
              actionTypes.DOCUMENT_MODIFIED,
            );
            expect(dispatchSpy.mock.calls[1][0]).toHaveProperty(
              'type',
              actionTypes.SET_LISTENER,
            );
          });

          it('updates multiple docs in state when docChanges includes multiple doc changes', async () => {
            const docChanges = [
              {
                doc: {
                  id: '123ABC',
                  data: () => ({ some: 'value' }),
                  ref: {
                    path: 'test/1/test2/123ABC',
                    parent: {
                      path: 'test/1/test2',
                    },
                  },
                },
                type: 'modified',
              },
              {
                doc: {
                  id: '234ABC',
                  data: () => ({ some: 'value' }),
                  ref: {
                    path: 'test/1/test2/234ABC',
                    parent: {
                      path: 'test/1/test2',
                    },
                  },
                },
                type: 'modified',
              },
            ];
            onSnapshotSpy = jest.fn((func) => {
              func({
                docChanges,
                size: 3,
                doc: { id: '123ABC' },
              });
            });
            // subcollection level listener
            listenerConfig = {
              collection: 'test',
              doc: '1',
              subcollections: [{ collection: 'test2' }],
            };
            const instance = createFirestoreInstance(
              fakeFirebase,
              fakeConfig,
              dispatchSpy,
            );

            await instance.test.setListener(listenerConfig);

            expect(onSnapshotSpy).toHaveBeenCalled();
            // SET_LISTENER, DOCUMENT_MODIFIED, DOCUMENT_MODIFIED
            expect(dispatchSpy.mock.calls.length).toBe(3);

            expect(dispatchSpy.mock.calls[1][0]).toHaveProperty(
              'type',
              actionTypes.DOCUMENT_MODIFIED,
            );
            expect(dispatchSpy.mock.calls[2][0]).toHaveProperty(
              'type',
              actionTypes.SET_LISTENER,
            );
          });

          it('still dispatches LISTENER_RESPONSE action type if whole collection is being updated (i.e. docChanges.length === size)', async () => {
            onSnapshotSpy = jest.fn((success) => {
              success({
                docChanges: [
                  {
                    doc: {
                      id: '123ABC',
                      data: () => ({ some: 'value' }),
                      ref: {
                        parent: {
                          path: 'test/1/test2',
                        },
                      },
                    },
                    type: 'modified',
                  },
                  {
                    doc: {
                      id: '123ABC',
                      data: () => ({ some: 'value' }),
                      ref: {
                        parent: {
                          path: 'test/1/test2',
                        },
                      },
                    },
                    type: 'modified',
                  },
                ],
                size: 2,
                doc: { id: '123ABC' },
              });
            });
            listenerConfig = {
              collection: 'test',
              doc: '1',
              subcollections: [{ collection: 'test2', doc: 'test3' }],
            };
            const instance = createFirestoreInstance(
              fakeFirebase,
              fakeConfig,
              dispatchSpy,
            );
            const expectedAction = {
              meta: { ...listenerConfig },
              payload: { name: 'test/1/test2/test3' },
              type: actionTypes.SET_LISTENER,
            };
            const expectedAction2 = {
              meta: listenerConfig,
              payload: { data: null, ordered: [], fromCache: true },
              merge: { collections: true, docs: true },
              type: actionTypes.LISTENER_RESPONSE,
            };
            await instance.test.setListener(listenerConfig);
            expect(dispatchSpy).toHaveBeenCalledWith(expectedAction);
            expect(dispatchSpy).toHaveBeenCalledWith(expectedAction2);
            expect(onSnapshotSpy).toHaveBeenCalled();
            // expect(dispatchSpy.withArgs(expectedAction)).toHaveBeenCalled();
            // expect(dispatchSpy.getCall(2)).toHaveBeenCalledWith(expectedAction2);
            // expect(dispatchSpy.firstCall).toHaveBeenCalledWith(expectedAction);
            // expect(dispatchSpy.secondCall).toHaveBeenCalledWith(expectedAction2);
            // expect(dispatchSpy.getCall(2)).toHaveBeenCalledWith(expectedAction2);
            expect(dispatchSpy.mock.calls.length).toBe(2);
          });
        });

        describe('as a method', () => {
          it('updates single doc in state when docChanges includes single doc change with type: "modified"', async () => {
            const docChanges = [
              {
                doc: {
                  id: '123ABC',
                  data: () => ({ some: 'value' }),
                  ref: {
                    path: 'test/1/test2/123ABC',
                    parent: {
                      path: 'test/1/test2',
                    },
                  },
                },
                type: 'modified',
              },
            ];
            onSnapshotSpy = jest.fn((func) => {
              func({
                docChanges: () => docChanges,
                size: 2,
                doc: {
                  id: '123ABC',
                  ref: {
                    parent: {
                      path: 'test/1/test2',
                    },
                  },
                },
              });
            });
            // Listener on subcollection level
            listenerConfig = {
              collection: 'test',
              doc: '1',
              subcollections: [{ collection: 'test2' }],
            };
            const instance = createFirestoreInstance(
              fakeFirebase,
              fakeConfig,
              dispatchSpy,
            );
            const expectedAction = {
              meta: { ...listenerConfig },
              payload: { name: `test/1/test2` },
              type: actionTypes.SET_LISTENER,
            };
            await instance.test.setListener(listenerConfig);
            expect(onSnapshotSpy).toHaveBeenCalled();
            // SET_LISTENER, LISTENER_RESPONSE
            expect(dispatchSpy.mock.calls.length).toBe(2);
            expect(dispatchSpy).toHaveBeenCalledWith(expectedAction);
          });

          it('updates multiple docs in state when docChanges includes multiple doc changes', async () => {
            const docChanges = [
              {
                doc: {
                  id: '123ABC',
                  data: () => ({ some: 'value' }),
                  ref: {
                    path: 'test/1/test2/123ABC',
                    parent: {
                      path: 'test/1/test2',
                    },
                  },
                },
                type: 'modified',
              },
              {
                doc: {
                  id: '234ABC',
                  data: () => ({ some: 'value' }),
                  ref: {
                    path: 'test/1/test2/234ABC',
                    parent: {
                      path: 'test/1/test2',
                    },
                  },
                },
                type: 'modified',
              },
            ];
            onSnapshotSpy = jest.fn((func) => {
              func({
                docChanges: () => docChanges,
                size: 3,
                doc: { id: '123ABC' },
              });
            });
            listenerConfig = {
              collection: 'test',
              doc: '1',
              subcollections: [{ collection: 'test2', doc: 'test3' }],
            };
            const instance = createFirestoreInstance(
              fakeFirebase,
              fakeConfig,
              dispatchSpy,
            );
            await instance.test.setListener(listenerConfig);
            expect(onSnapshotSpy).toHaveBeenCalled();
            // SET_LISTENER, DOCUMENT_MODIFIED, DOCUMENT_MODIFIED
            expect(dispatchSpy.mock.calls.length).toBe(3);

            expect(dispatchSpy.mock.calls[1][0]).toHaveProperty(
              'type',
              actionTypes.DOCUMENT_MODIFIED,
            );
            expect(dispatchSpy.mock.calls[2][0]).toHaveProperty(
              'type',
              actionTypes.SET_LISTENER,
            );
          });

          it('still dispatches LISTENER_RESPONSE action type if whole collection is being updated (i.e. docChanges.length === size)', async () => {
            onSnapshotSpy = jest.fn((success) => {
              success({
                docChanges: () => [
                  {
                    doc: {
                      id: '123ABC',
                      data: () => ({ some: 'value' }),
                      ref: {
                        parent: {
                          path: 'test/1/test2',
                        },
                      },
                    },
                    type: 'modified',
                  },
                  {
                    doc: {
                      id: '123ABC',
                      data: () => ({ some: 'value' }),
                      ref: {
                        parent: {
                          path: 'test/1/test2',
                        },
                      },
                    },
                    type: 'modified',
                  },
                ],
                size: 2,
                doc: { id: '123ABC' },
              });
            });
            listenerConfig = {
              collection: 'test',
              doc: '1',
              subcollections: [{ collection: 'test2', doc: 'test3' }],
            };
            const instance = createFirestoreInstance(
              fakeFirebase,
              fakeConfig,
              dispatchSpy,
            );
            const expectedAction = {
              meta: { ...listenerConfig },
              payload: { name: 'test/1/test2/test3' },
              type: actionTypes.SET_LISTENER,
            };
            const expectedAction2 = {
              meta: listenerConfig,
              payload: { data: null, ordered: [], fromCache: true },
              merge: { collections: true, docs: true },
              type: actionTypes.LISTENER_RESPONSE,
            };
            await instance.test.setListener(listenerConfig);
            expect(dispatchSpy).toHaveBeenCalledWith(expectedAction);
            expect(dispatchSpy).toHaveBeenCalledWith(expectedAction2);
            expect(onSnapshotSpy).toHaveBeenCalled();
            expect(dispatchSpy.mock.calls.length).toBe(2);
          });
        });
      });
      describe('populates', () => {
        it('calls success callback if provided', async () => {
          listenerConfig = {
            collection: 'test',
            doc: '1',
            populates: [{ root: 'users', child: 'asdf' }],
          };
          const instance = createFirestoreInstance(
            fakeFirebase,
            fakeConfig,
            dispatchSpy,
          );
          await instance.test.setListener(listenerConfig);
          expect(dispatchSpy).toHaveBeenCalled();
        });
      });
    });

    describe('setListeners', () => {
      it('throws if listeners config is not an array', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() =>
          instance.test.setListeners({ collection: 'test' }),
        ).toThrowError(
          'Listeners must be an Array of listener configs (Strings/Objects).',
        );
      });

      it('calls dispatch if listeners provided', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() =>
          instance.test.setListeners({ collection: 'test' }),
        ).toThrowError(
          'Listeners must be an Array of listener configs (Strings/Objects).',
        );
      });

      it('maps listeners array', () => {
        setListeners(fakeFirebase, dispatchSpy, [
          { collection: 'test' },
          { collection: 'test2' },
        ]);
        expect(onSnapshotSpy.mock.calls.length).toBe(2);
      });

      it('supports subcollections', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() =>
          instance.test.setListeners({
            collection: 'test',
            doc: '1',
            subcollections: [{ collection: 'test2' }],
          }),
        ).toThrowError(
          'Listeners must be an Array of listener configs (Strings/Objects).',
        );
      });

      describe('allowMultipleListeners', () => {
        it('works with one listener', async () => {
          const fakeFirebaseWithOneListener = {
            _: {
              listeners: {},
              config: { ...defaultConfig, allowMultipleListeners: false },
            },
            firestore: () => ({
              collection: collectionClass,
            }),
          };
          const instance = createFirestoreInstance(
            fakeFirebaseWithOneListener,
            { helpersNamespace: 'test' },
            dispatchSpy,
          );
          const listeners = [
            {
              collection: 'test',
              doc: '1',
              subcollections: [{ collection: 'test2' }],
            },
          ];

          await instance.test.setListeners(listeners);

          // SET_LISTENER, LISTENER_RESPONSE
          expect(dispatchSpy.mock.calls.length).toBe(2);
        });

        it('works with two listeners of the same path (only attaches once)', async () => {
          const fakeFirebaseWithOneListener = {
            _: {
              listeners: {},
              config: { ...defaultConfig, allowMultipleListeners: false },
            },
            firestore: () => ({
              collection: collectionClass,
            }),
          };
          const instance = createFirestoreInstance(
            fakeFirebaseWithOneListener,
            { helpersNamespace: 'test' },
            dispatchSpy,
          );
          const listeners = [
            {
              collection: 'test',
              doc: '1',
              subcollections: [{ collection: 'test3' }],
            },
            {
              collection: 'test',
              doc: '1',
              subcollections: [{ collection: 'test3' }],
            },
          ];

          await instance.test.setListeners(listeners);

          // expect(instance.test.setListener.mock.calls.length).toBe(1);
          // SET_LISTENER, LISTENER_RESPONSE
          expect(dispatchSpy.mock.calls.length).toBe(2);
        });
      });
    });

    describe('unsetListener', () => {
      it('throws if invalid path config is provided', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() => instance.test.unsetListener()).toThrowError(
          'Invalid Path Definition: Only Strings and Objects are accepted.',
        );
      });

      it('throws if dispatch is not a function', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() =>
          instance.test.unsetListener({ collection: 'test' }),
        ).toThrowError('dispatch is not a function');
      });
    });

    describe('unsetListeners', () => {
      it('throws if listeners config is not an array', () => {
        const instance = createFirestoreInstance(
          {},
          { helpersNamespace: 'test' },
        );
        expect(() =>
          instance.test.unsetListeners({ collection: 'test' }),
        ).toThrowError(
          'Listeners must be an Array of listener configs (Strings/Objects)',
        );
      });

      it('dispatches UNSET_LISTENER action', () => {
        const instance = createFirestoreInstance(
          { _: { pathListenerCounts: { test: 1 } } },
          { helpersNamespace: 'test' },
          dispatchSpy,
        );
        instance.test.unsetListeners([{ collection: 'test' }]);
        expect(dispatchSpy).toHaveBeenCalledWith({
          meta: { collection: 'test' },
          payload: { name: 'test', preserveCache: true },
          type: actionTypes.UNSET_LISTENER,
        });
      });

      it('dispatches UNSET_LISTENER action with preserveCache: false', async () => {
        const instance = createFirestoreInstance(
          {
            _: {
              pathListenerCounts: { test: 1 },
              config: { preserveCacheAfterUnset: false },
            },
          },
          { helpersNamespace: 'test' },
          dispatchSpy,
        );
        instance.test.unsetListeners([{ collection: 'test' }]);
        expect(dispatchSpy).toHaveBeenCalledWith({
          meta: { collection: 'test' },
          payload: { name: 'test', preserveCache: false },
          type: actionTypes.UNSET_LISTENER,
        });
      });

      describe('allowMultipleListeners option enabled', () => {
        it('dispatches UNSET_LISTENER action', async () => {
          const fakeFirebaseWithOneListener = {
            _: {
              listeners: {},
              config: { ...defaultConfig, allowMultipleListeners: false },
            },
            firestore: () => ({
              collection: collectionClass,
            }),
          };
          const instance = createFirestoreInstance(
            fakeFirebaseWithOneListener,
            { helpersNamespace: 'test' },
            dispatchSpy,
          );
          await instance.test.unsetListeners([{ collection: 'test' }]);
          expect(dispatchSpy.mock.calls.length).toBe(0);
        });

        it('dispatches UNSET_LISTENER action if there is more than one listener', async () => {
          const fakeFirebaseWithOneListener = {
            _: {
              listeners: {},
              config: { ...defaultConfig, allowMultipleListeners: false },
            },
            firestore: () => ({
              collection: collectionClass,
            }),
          };
          const instance = createFirestoreInstance(
            fakeFirebaseWithOneListener,
            { helpersNamespace: 'test' },
            dispatchSpy,
          );
          await instance.test.setListeners([
            { collection: 'test' },
            { collection: 'test' },
          ]);
          await instance.test.unsetListeners([{ collection: 'test' }]);
          // UNSET_LISTENER, LISTENER_RESPONSE
          expect(dispatchSpy.mock.calls.length).toBe(2);
        });
      });
    });

    describe('runTransaction', () => {
      it('throws if invalid path config is provided', () => {
        const instance = createFirestoreInstance(fakeFirebase, {
          helpersNamespace: 'test',
        });
        expect(() => instance.test.runTransaction()).toThrowError(
          'dispatch is not a function',
        );
      });
    });

    describe('Global Convertor', () => {
      it('converts a snapshot into a custom object', async () => {
        const globalDataConvertor = {
          toFirestore: (snap) => ({ 'firestore-prop': snap.prop }),
          fromFirestore: (snap) => ({ prop: snap.id }),
        };
        // Firestore internally calls to/from firestore on get/set/onSnapshot
        const doc = jest.fn(() => {
          let _convert;
          const ref = {
            withConverter: jest.fn((val) => {
              _convert = val;
              return ref;
            }),
            get: jest.fn(() => Promise.resolve(_convert.fromFirestore(ref))),
            id: 'id',
            parent: { path: 'path' },
          };
          return ref;
        });
        const collection = jest.fn(() => ({ doc }));
        const firestore = jest.fn(() => ({ collection, doc }));

        const instance = createFirestoreInstance(
          { firestore },
          {
            helpersNamespace: 'test',
            globalDataConvertor,
          },
          dispatchSpy,
        );

        const res = await instance.test.get({ collection: 'test', doc: 'id' });
        expect(res).toStrictEqual({ prop: 'id' });
      });
    });

    describe('mutate', () => {
      it('handles mutate action types', () => {
        const set = jest.fn(() => Promise.resolve());
        const doc = jest.fn(() => ({
          set,
          id: 'id',
          parent: { path: 'path' },
        }));
        const collection = jest.fn(() => ({ doc }));
        const firestore = jest.fn(() => ({ collection, doc }));

        const instance = createFirestoreInstance(
          { firestore },
          { helpersNamespace: 'test' },
          dispatchSpy,
        );
        instance.test.mutate({
          collection: '/collection/path',
          doc: 'doc',
          data: { a: 1 },
        });

        expect(set).toHaveBeenCalledWith({ a: 1 }, { merge: true });
      });
    });
  });
});
