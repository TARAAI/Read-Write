import {
  getDotStrPath,
  pathFromMeta,
  getSlashStrPath,
  preserveValuesFromState,
  updateItemInArray,
  createReducer,
} from '..';

let subcollections;
let config;

describe('reducer utils', () => {
  describe('getSlashStrPath', () => {
    it('is exported', () => {
      expect(typeof getSlashStrPath).toBe('function');
    });
    it('converts dot path to slash path', () => {
      expect(getSlashStrPath('some.other.thing')).toBe('some/other/thing');
    });
    it('removes leading .', () => {
      expect(getSlashStrPath('.some.other.thing')).toBe('some/other/thing');
    });
    it('returns empty string for undefined input', () => {
      expect(getSlashStrPath()).toBe('');
    });
  });

  describe('getDotStrPath', () => {
    it('is exported', () => {
      expect(typeof getDotStrPath).toBe('function');
    });
    it('converts slash path to dot path', () => {
      expect(getDotStrPath('some/other/thing')).toBe('some.other.thing');
    });
    it('removes leading /', () => {
      expect(getDotStrPath('/some/other/thing')).toBe('some.other.thing');
    });
    it('returns empty string for undefined input', () => {
      expect(getDotStrPath()).toBe('');
    });
  });

  describe('pathFromMeta', () => {
    it('is exported', () => {
      expect(typeof pathFromMeta).toBe('function');
    });

    it('throws for no meta data passed (first argument)', () => {
      expect(() => pathFromMeta()).toThrowError(
        'Action meta is required to build path for reducers.',
      );
    });

    it('returns undefined if provided nothing', () => {
      expect(() => pathFromMeta({})).toThrowError(
        'Collection or Collection Group is required to construct reducer path.',
      );
    });

    it('returns collection if provided', () => {
      expect(pathFromMeta({ collection: 'test' })).toStrictEqual(['test']);
    });

    it('returns collection group if provided', () => {
      expect(pathFromMeta({ collectionGroup: 'test' })).toStrictEqual(['test']);
    });

    it('returns collection doc combined into dot path if both provided', () => {
      const result = pathFromMeta({ collection: 'first', doc: 'second' });
      expect(result).toStrictEqual(['first', 'second']);
    });

    it('uses storeAs as path if provided', () => {
      pathFromMeta({ storeAs: 'testing' });
    });

    it('uses path as path if provided', () => {
      expect(pathFromMeta({ path: 'testing' })).toStrictEqual(['testing']);
    });

    describe('updateItemInArray', () => {
      it('is exported', () => {
        expect(typeof updateItemInArray).toBe('function');
      });

      it('returns an array when no arguments are passed', () => {
        expect(updateItemInArray([], '123', () => ({}))).toBeInstanceOf(Array);
      });

      it('preserves items which do not have matching ids', () => {
        const testId = '123ABC';
        const result = updateItemInArray(
          [{ id: 'other' }, { id: testId }],
          testId,
          () => 'test',
        );
        expect(result[0]).toHaveProperty('id');
      });

      it('updates item with matching id', () => {
        const testId = '123ABC';
        const result = updateItemInArray(
          [{ id: testId }],
          testId,
          () => 'test',
        );
        expect(result).toStrictEqual(['test']);
      });
    });

    describe('supports a subcollection', () => {
      it('with collection', () => {
        subcollections = [{ collection: 'third' }];
        config = { collection: 'first', doc: 'second', subcollections };
        const result = pathFromMeta(config);
        expect(result).toStrictEqual(['first', 'second', 'third']);
      });

      it('with doc', () => {
        subcollections = [{ collection: 'third', doc: 'fourth' }];
        config = { collection: 'first', doc: 'second', subcollections };
        const result = pathFromMeta(config);
        expect(result).toStrictEqual(['first', 'second', 'third', 'fourth']);
      });
    });

    it('supports multiple subcollections', () => {
      subcollections = [
        { collection: 'third', doc: 'fourth' },
        { collection: 'fifth' },
      ];
      config = { collection: 'first', doc: 'second', subcollections };
      const result = pathFromMeta(config);
      expect(result).toStrictEqual([
        'first',
        'second',
        'third',
        'fourth',
        'fifth',
      ]);
    });
  });

  describe('createReducer', () => {
    it('calls handler mapped to action type', () => {
      const actionHandler = jest.fn();
      const newReducer = createReducer({}, { test: actionHandler });
      newReducer({}, { type: 'test' });
      expect(actionHandler).toHaveBeenCalledTimes(1);
    });

    it('returns state for action types not within handlers', () => {
      const newReducer = createReducer({}, {});
      const state = {};
      expect(newReducer(state, { type: 'testing' })).toStrictEqual(state);
    });
  });

  describe('preserveValuesFromState', () => {
    it('is exported', () => {
      expect(typeof preserveValuesFromState).toBe('function');
    });

    describe('passing boolean', () => {
      it('returns original state for true', () => {
        const result = preserveValuesFromState({}, true);
        expect(typeof result).toBe('object');
        expect(result).toStrictEqual({});
      });

      it('extends state with next state if provided', () => {
        const testVal = 'val';
        const result = preserveValuesFromState({}, true, { testVal });
        expect(result).toHaveProperty('testVal');
      });
    });

    describe('passing function', () => {
      it('returns original state for true', () => {
        const result = preserveValuesFromState({}, () => ({}));
        expect(typeof result).toBe('object');
        expect(result).toStrictEqual({});
      });
    });

    describe('passing an array of keys', () => {
      it('returns original state for true', () => {
        const result = preserveValuesFromState({ some: 'val' }, ['some']);
        expect(result).toHaveProperty('some');
      });
    });

    describe('passing invalid preserve option', () => {
      it('throws', () => {
        expect(() =>
          preserveValuesFromState({ some: 'val' }, 'some'),
        ).toThrowError(
          'Invalid preserve parameter. It must be an Object or an Array.',
        );
      });
    });
  });
});
