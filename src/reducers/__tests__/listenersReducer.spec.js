import listenersReducer from '../listenersReducer';
import { actionTypes } from '../../constants';

let state;
let action;

describe('listenersReducer', () => {
  it('is exported', () => {
    expect(listenersReducer).not.toBeNull();
  });
  it('is a function', () => {
    expect(typeof listenersReducer).toBe('function');
  });
  it('returns state for undefined actionType', () => {
    expect(listenersReducer({}, {})).not.toBeNull();
  });
  it('exports both byId and allIds state', () => {
    const result = listenersReducer({}, {});
    expect(result).toHaveProperty('byId');
    expect(result).toHaveProperty('allIds');
  });
  describe('allIds sub-reducer', () => {
    describe('actionTypes', () => {
      describe('SET_LISTENER', () => {
        it('returns state if payload is not defined', () => {
          action = {
            meta: { collection: 'test' },
            type: actionTypes.SET_LISTENER,
          };
          state = { allIds: [], byId: {} };
          expect(listenersReducer(state, action).allIds).toHaveLength(0);
        });

        it('returns state if payload is defined', () => {
          action = {
            meta: { collection: 'test' },
            type: actionTypes.SET_LISTENER,
            payload: { name: 'data' },
          };
          state = { allIds: [], byId: {} };
          expect(listenersReducer(state, action).allIds).toHaveLength(1);
        });
      });

      describe('UNSET_LISTENER', () => {
        it('returns state if payload is not defined', () => {
          action = {
            type: actionTypes.UNSET_LISTENER,
          };
          state = { allIds: [], byId: {} };
          expect(listenersReducer(state, action).allIds).toHaveLength(0);
        });

        it('returns state if payload is defined', () => {
          action = {
            type: actionTypes.UNSET_LISTENER,
            payload: { name: 'test' },
          };
          state = { allIds: ['test'], byId: {} };
          expect(listenersReducer(state, action).allIds).toHaveLength(0);
        });
      });
    });
  });
});
