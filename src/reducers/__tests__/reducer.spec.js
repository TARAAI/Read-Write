import reducer from '..';

describe('reducer', () => {
  it('is exported', () => {
    expect(reducer).not.toBeNull();
  });
  it('is a function', () => {
    expect(reducer).not.toBeNull();
  });
  it('returns state for undefined actionType', () => {
    expect(reducer({}, {})).not.toBeNull();
  });
});

describe('reducers', () => {
  describe('errors reducer', () => {
    it('returns state for undefined actionType', () => {
      expect(reducer({}, {})).toHaveProperty('errors');
    });
  });
  describe('status reducer', () => {
    it('returns state for undefined actionType', () => {
      expect(reducer({}, {})).toHaveProperty('status');
    });
  });
});
