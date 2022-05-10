import { createStore, compose } from 'redux';
import reduxFirestore, { getFirestore } from '../enhancer';

const reducer = jest.fn();
const generateCreateStore = () =>
  compose(
    reduxFirestore(
      { firestore: () => ({ collection: () => ({}) }) },
      {
        userProfile: 'users',
      },
    ),
  )(createStore);

const store = generateCreateStore()(reducer);

describe('enhancer', () => {
  it('exports a function', () => {
    expect(typeof reduxFirestore).toBe('function');
  });

  it('adds firestore to store', () => {
    expect(store).toHaveProperty('firestore');
  });

  it('adds extended methods', () => {
    expect(typeof store.firestore.setListener).toBe('function');
  });

  it('preserves unmodified internal Firebase methods', () => {
    expect(typeof store.firestore.collection).toBe('function');
  });
});

describe('getFirestore', () => {
  it('returns firestore instance created by enhancer', () => {
    expect(typeof getFirestore()).toBe('object');
  });
});
