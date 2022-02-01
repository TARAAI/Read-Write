import createFirestoreInstance from 'createFirestoreInstance';

describe('createFirestoreInstance', () => {
  describe('exports', () => {
    it('a functions', () => {
      expect(typeof createFirestoreInstance).toBe('function');
    });
  });

  describe('firestoreInstance', () => {
    it('sets internal parameter _', () => {
      const instance = createFirestoreInstance({}, {});
      expect(instance).toHaveProperty('_');
    });

    it('attaches provided config to internal _.config object', () => {
      const testVal = 'test';
      const instance = createFirestoreInstance({}, { testVal });
      expect(instance).toHaveProperty('_.config.testVal');
    });

    describe('options - ', () => {
      describe('helpersNamespace -', () => {
        it('places helpers on namespace if passed', () => {
          const instance = createFirestoreInstance(
            {},
            { helpersNamespace: 'test' },
          );
          expect(instance).toHaveProperty('test');
        });
      });
    });
  });
});
