// wrap in dispatch
jest.mock('../../firestore/extend/dispatchWrapper', () => ({
  ...jest.requireActual('../../firestore/extend/dispatchWrapper'),
  wrapInDispatch: jest.fn(),
}));
const { wrapInDispatch } = require('../../firestore/extend/dispatchWrapper');
const { wrapInDispatch: dispatchActual } = jest.requireActual(
  '../../firestore/extend/dispatchWrapper',
);

// cache reducer mutation output
jest.mock('../../reducers/cacheReducer/mutation', () => ({
  ...jest.requireActual('../../reducers/cacheReducer/mutation'),
  mutationWriteOutput: jest.fn(),
}));
const { mutationWriteOutput } = require('../../reducers/cacheReducer/mutation');
const { mutationWriteOutput: mutationWriteOutputActual } = jest.requireActual(
  '../../reducers/cacheReducer/mutation',
);

// firebase
jest.mock('../../redux-firebase/useFirebase', () => ({
  ...jest.requireActual('../../redux-firebase/useFirebase'),
  useFirestore: jest.fn(),
}));
const { useFirestore } = require('../../redux-firebase/useFirebase');

export { dispatchActual, mutationWriteOutputActual };
