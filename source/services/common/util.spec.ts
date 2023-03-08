/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommonUtil } from './util';

const COMMON_UTIL = new CommonUtil();

// TODO: make sure to test every edge case
describe('CommonUtil', () => {
    describe('areNonEmptyStrings', () => {
        test('is true when passed non-empty strings', () => {
            expect(COMMON_UTIL.areNonEmptyStrings(["non", "empty"])).toBeTruthy()
        });

        test('is false when an element is undefined', () => {
            expect(COMMON_UTIL.areNonEmptyStrings(["string", undefined])).toBeFalsy()
        })

        test('is false when an element is empty', () => {
            expect(COMMON_UTIL.areNonEmptyStrings(["", "string"])).toBeFalsy()
        })
    });

    describe('isObjectEmpty', () => {
        test('success', (done) => {
            done();
        });
    });

    describe('getErrorObject', () => {
        test('success', (done) => {
            done();
        });
    });

    describe('sendAnonymousMetric', () => {
        test('success', (done) => {
            done();
        });
    });
});