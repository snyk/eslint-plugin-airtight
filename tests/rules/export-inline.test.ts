import { join } from 'path';
import rule from '../../src/rules/export-inline';
import { RuleTester } from '@typescript-eslint/experimental-utils/dist/eslint-utils';

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    tsconfigRootDir: join(__dirname, '..'),
    project: './tsconfig.json',
  },
  parser: '@typescript-eslint/parser',
});

ruleTester.run('export-inline', rule, {
  valid: [
    `function test() {}`,
    `export function test() {}`,
    `export {}; function test() {}`,

    // not yet handled
    `export { a }; const a = 5; function test() {}`,
  ],
  invalid: [
    {
      // for some reason this doesn't get double fixed, despite being totally fixable
      // unclear if this is a test framework bug or a real rule bug (due to Program abuse?)
      code: `export { test }; function test(foo) {}`,
      output: `export {  }; export function test(foo) {}`,
      errors: [
        {
          line: 1,
          messageId: 'mustBeInline',
        },
      ],
    },
    {
      code: `export {  }; export function test(foo) {}`,
      output: ` export function test(foo) {}`,
      errors: [
        {
          line: 1,
          messageId: 'unnecessaryEmptyExport',
        },
      ],
    },
    {
      code: `export { test, a }; const a = 5; function test(foo) {}`,
      output: `export {  a }; const a = 5; export function test(foo) {}`,
      errors: [
        {
          line: 1,
          messageId: 'mustBeInline',
        },
      ],
    },
    {
      code: `import { foo } from './foo'; foo(); export { };`,
      output: `import { foo } from './foo'; foo(); `,
      errors: [
        {
          line: 1,
          messageId: 'unnecessaryEmptyExport',
        },
      ],
    },
  ]
});