import { join } from 'path';
import rule from '../../src/rules/export-inline';
import { RuleTester } from '@typescript-eslint/utils/dist/eslint-utils';

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
    `export const a = 5;`,
    `export const a = () => {};`,
    `export const a = async () => {};`,
    `export {}; const a = 5;`,
    `export {}; const a = () => {};`,
    `export {}; const a = async () => {};`,
    `export {}; function test() {}`,
    `export {}; const a = 5;`,
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
      code: `export { a }; const a = 5;`,
      output: `export {  }; export const a = 5;`,
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
      code: `export { test, a }; let a = 5; function test(foo) {}`,
      output: `export {  a }; let a = 5; export function test(foo) {}`,
      errors: [
        {
          line: 1,
          messageId: 'mustBeInline',
        },
      ],
    },
    {
      // again, this doesn't seem to fix both, despite reporting both fixes?
      code: `export { test, a }; const a = 5; function test(foo) {}`,
      output: `export {  a }; const a = 5; export function test(foo) {}`,
      errors: [
        {
          line: 1,
          messageId: 'mustBeInline',
        },
        {
          line: 1,
          messageId: 'mustBeInline',
        },
      ],
    },
    {
      code: `export { a }; const a = 5; export function test(foo) {}`,
      output: `export {  }; export const a = 5; export function test(foo) {}`,
      errors: [
        {
          line: 1,
          messageId: 'mustBeInline',
        },
      ],
    },
    {
      code: `export { A }; interface A {}`,
      output: `export {  }; export interface A {}`,
      errors: [
        {
          line: 1,
          messageId: 'mustBeInline',
        },
      ],
    },
    {
      code: `export { A }; enum A { Foo, Bar };`,
      output: `export {  }; export enum A { Foo, Bar };`,
      errors: [
        {
          line: 1,
          messageId: 'mustBeInline',
        },
      ],
    },
    {
      code: `export { A }; const enum A { Foo, Bar };`,
      output: `export {  }; export const enum A { Foo, Bar };`,
      errors: [
        {
          line: 1,
          messageId: 'mustBeInline',
        },
      ],
    },
    {
      code: `export { A }; type A = string;`,
      output: `export {  }; export type A = string;`,
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
