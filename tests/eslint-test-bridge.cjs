const mocha = require('mocha');
const { RuleTester } = require('@typescript-eslint/rule-tester');

RuleTester.afterAll = mocha.after;
