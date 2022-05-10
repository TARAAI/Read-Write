// wrap in dispatch
jest.mock('../../utils/actions', () => ({
  ...jest.requireActual('../../utils/actions'),
  wrapInDispatch: jest.fn(),
}));
const { wrapInDispatch } = require('../../utils/actions');
const { wrapInDispatch: dispatchActual } = jest.requireActual(
  '../../utils/actions',
);

// cache reducer mutation output
jest.mock('../../reducers/utils/mutate', () => ({
  ...jest.requireActual('../../reducers/utils/mutate'),
  mutationWriteOutput: jest.fn(),
}));
const { mutationWriteOutput } = require('../../reducers/utils/mutate');
const { mutationWriteOutput: mutationWriteOutputActual } = jest.requireActual(
  '../../reducers/utils/mutate',
);

// firebase
jest.mock('../../redux-firebase/useFirebase', () => ({
  ...jest.requireActual('../../redux-firebase/useFirebase'),
  useFirestore: jest.fn(),
}));
const { useFirestore } = require('../../redux-firebase/useFirebase');

export { dispatchActual, mutationWriteOutputActual };
