import * as fs from 'fs';
import * as path from 'path';

describe('build-output', () => {
  it('dist/index.js and dist/index.d.ts exist after build', () => {
    const distDir = path.resolve(__dirname, '../../dist');
    expect(fs.existsSync(path.join(distDir, 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'index.d.ts'))).toBe(true);
  });
});
