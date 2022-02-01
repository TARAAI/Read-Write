import statusReducer from 'reducers/statusReducer';
import { actionTypes } from 'constants';

const state = {};
let collection = 'test'; // eslint-disable-line prefer-const
let action = {};
let payload = {};
let meta = {};
let result = {};

describe('statusReducer', () => {
  beforeEach(() => {
    result = {};
    meta = {};
    action = {};
  });

  it('is exported', () => {
    expect(statusReducer).not.toBeNull();
  });

  it('is a function', () => {
    expect(typeof statusReducer).toBe('function');
  });

  it('returns state slices (requesting, requested, timestampes)', () => {
    expect(statusReducer({}, {})).toStrictEqual({
      requested: {},
      requesting: {},
      timestamps: {},
    });
  });

  describe('actionTypes', () => {
    describe('LISTENER_RESPONSE', () => {
      it('returns state if payload is not defined', () => {
        action = { meta: { collection }, type: actionTypes.LISTENER_RESPONSE };
        result = statusReducer(state, action);
        expect(result.requesting).toHaveProperty(collection);
      });

      it('returns state if payload does not contain data', () => {
        action = {
          meta: { collection },
          payload: {},
          type: actionTypes.LISTENER_RESPONSE,
        };
        result = statusReducer(state, action);
        expect(result.requesting).toHaveProperty(collection);
      });
    });

    describe('SET_LISTENER', () => {
      it('returns state if payload does not contain data', () => {
        meta = { collection };
        payload = {};
        action = { meta, payload, type: actionTypes.SET_LISTENER };
        expect(statusReducer(state, action).requesting).toHaveProperty(
          collection,
        );
        expect(statusReducer(state, action).requested).toHaveProperty(
          collection,
        );
        expect(statusReducer(state, action).timestamps).toHaveProperty(
          collection,
        );
      });
    });

    describe('LISTENER_ERROR', () => {
      it('returns state if payload is not defined', () => {
        meta = { collection };
        action = { meta, type: actionTypes.LISTENER_ERROR };
        result = statusReducer(state, action);
        expect(result.requesting).toHaveProperty(collection);
      });
    });

    describe('UNSET_LISTENER', () => {
      it('sets requesting status to false when unsetting listener', () => {
        action = { meta: 'test', type: actionTypes.UNSET_LISTENER };
        expect(statusReducer(state, action).requesting).toStrictEqual({
          test: false,
        });
      });
    });
  });
});
