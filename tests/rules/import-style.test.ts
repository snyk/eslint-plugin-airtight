import { join } from 'path';
import rule from '../../src/rules/import-style';
import type { Options } from '../../src/rules/import-style';
import { RuleTester } from '@typescript-eslint/utils/dist/eslint-utils';

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    tsconfigRootDir: join(__dirname, '..'),
    project: './tsconfig.json',
  },
  parser: '@typescript-eslint/parser',
});

const manyTransforms: Options = [{
  wildNsToRequire: [ { path: './bar' }, { path: 'baz' } , { local: 'foo', path: './bar' }, { local: 'foo', path: 'baz' } ],
  requireToNamed: [ { path: './bar' }, { path: 'baz' } , { local: 'foo', path: './bar' }, { local: 'foo', path: 'baz' } ],
}];

ruleTester.run('import-style', rule, {
  valid: [
    { code: `import foo = require('foo');`, options: manyTransforms },
    { code: `import foo from 'foo';`, options: manyTransforms },
    // { code: `import * as foo from 'foo';`, options: manyTransforms },
    { code: `import { foo } from 'foo';`, options: manyTransforms },
    { code: `import { foo as food } from 'foo';`, options: manyTransforms },
    { code: `import foo = require('./foo');`, options: manyTransforms },
    // { code: `import * as foo from './foo';`, options: manyTransforms },
    { code: `import foo from './foo';`, options: manyTransforms },
    { code: `import { foo } from './foo';`, options: manyTransforms },
    { code: `import { foo as food } from './foo';`, options: manyTransforms },
  ],
  invalid: [
    {
      code: `import foo = require('./foo/bar');`,
      output: `import { foo } from './foo/bar';`,
      options: [{
        requireToNamed: [{local: 'foo', path: './foo/bar'}],
      }],
      errors: [
        {
          line: 1,
          messageId: 'useRegularImport',
        },
      ],
    },
    // {
    //   code: `import foo = require('././foo/bar');`,
    //   output: `import { foo } from '././foo/bar';`,
    //   options: [{
    //     requireToNamed: [{local: 'foo', path: './foo/bar'}],
    //   }],
    //   errors: [
    //     {
    //       line: 1,
    //       messageId: 'useRegularImport',
    //     },
    //   ],
    // },
    {
      code: `import * as foo from 'potato';`,
      output: `import foo = require('potato');`,
      options: [{
        wildNsToRequire: [{path: 'potato'}],
      }],
      errors: [
        {
          line: 1,
          messageId: 'useRegularImport',
        },
      ],
    },
  ]
});
