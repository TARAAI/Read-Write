/* eslint-disable jsdoc/require-param */
import { wrapInDispatch } from '../dispatchWrapper';

let dispatchSpy;
describe('dispath wrapper', () => {
  beforeEach(() => {
    dispatchSpy = jest.fn();
  });

  describe('wrapInDispatch', () => {
    it('is exported', () => {
      expect(typeof wrapInDispatch).toBe('function');
    });

    it('calls dispatch', () => {
      wrapInDispatch(dispatchSpy, {
        ref: { test: () => Promise.resolve() },
        types: ['test', 'test'],
        method: 'test',
      });
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('handles Object action types', () => {
      wrapInDispatch(dispatchSpy, {
        ref: { test: () => Promise.resolve() },
        types: [{ type: 'test' }, { type: 'test' }],
        method: 'test',
      });
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('handles function payload types', () => {
      const opts = {
        ref: { test: () => Promise.resolve() },
        types: [{ type: 'test' }, { type: 'test', payload: () => ({}) }],
        method: 'test',
      };
      wrapInDispatch(dispatchSpy, opts);
      expect(dispatchSpy).toHaveBeenCalled();
    });

    it('dispatches success with preserve parameter', async () => {
      const preserve = { some: 'thing' };
      const opts = {
        ref: { test: () => Promise.resolve() },
        meta: 'meta',
        types: [
          { type: 'test' },
          { type: 'test2', preserve, payload: () => 'some' },
        ],
        method: 'test',
      };
      await wrapInDispatch(dispatchSpy, opts);
      expect(dispatchSpy).toHaveBeenCalledWith({
        meta: 'meta',
        payload: undefined,
        type: 'test',
      });
      expect(dispatchSpy).toHaveBeenLastCalledWith({
        meta: 'meta',
        payload: 'some',
        preserve: { some: 'thing' },
        type: 'test2',
      });
    });

    it('handles rejection', () => {
      const opts = {
        ref: { test: () => Promise.reject(new Error('test rejection')) },
        types: [{ type: 'test' }, { type: 'test', payload: () => ({}) }],
        method: 'test',
      };

      expect(() => wrapInDispatch(dispatchSpy, opts)).rejects.toThrowError(
        'test rejection',
      );
    });

    it('handles mutate action types', () => {
      const set = jest.fn(() => Promise.resolve());
      const doc = jest.fn(() => ({
        set,
        id: 'id',
        parent: { path: 'path' },
      }));
      const collection = jest.fn(() => ({ doc }));
      const firestore = jest.fn(() => ({ collection, doc }));
      wrapInDispatch(dispatchSpy, {
        ref: { firestore },
        types: ['mutate', 'mutate', 'mutate'],
        args: [{ collection: '/collection/path', doc: 'doc', data: { a: 1 } }],
        method: 'mutate',
      });
      expect(doc).toHaveBeenCalledWith('/collection/path/doc');
      expect(set).toHaveBeenCalledWith({ a: 1 }, { merge: true });
    });
  });
});
