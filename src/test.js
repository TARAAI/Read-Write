/* istanbul ignore file */
export * from './index';

let isJest = false;
try {
  isJest = !!jest;
} catch (e) {}
const { shouldPass, shouldFail } = isJest
  ? require('./tests/shouldPassFail')
  : { shouldPass: () => null, shouldFail: () => null };

export {
  shouldPass,
  // shouldFail,
};

export default {
  shouldPass,
  // shouldFail,
};
