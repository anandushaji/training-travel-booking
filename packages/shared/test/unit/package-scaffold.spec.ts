import * as path from 'path';

describe('package-scaffold', () => {
  it('should resolve @travel/shared from workspace', () => {
    // require.resolve will throw MODULE_NOT_FOUND if not in workspace
    expect(() => {
      require.resolve('@travel/shared', {
        paths: [path.resolve(__dirname, '../../../')],
      });
    }).not.toThrow();
  });
});
