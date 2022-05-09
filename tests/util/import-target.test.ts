import assert from 'assert';
import path from 'path';

import { DirResult, dirSync } from 'tmp';
import mkdirp from 'mkdirp';

import { importTarget } from '../../src/util/node-imports';

describe('import target', () => {
  let tmpDir: DirResult;
  let dir: string;

  beforeEach(async () => {
    tmpDir = dirSync({ unsafeCleanup: true });
    const targetDir = path.join(tmpDir.name, 'foo', 'bar');
    dir = (await mkdirp(targetDir)) ?? targetDir;
  });

  afterEach(() => {
    tmpDir?.removeCallback();
  });

  it('resolves built-in modules', () => {
    assert.equal(importTarget(dir, 'http'), 'http');
    assert.equal(importTarget(dir, 'internal/foo'), 'internal/foo');
  });

  it.skip('resolves relatives', () => {
    assert.equal(importTarget(dir, './a'), path.resolve(dir, './a'));
  });
});
