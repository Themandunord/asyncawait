﻿import references = require('references');
import Promise = require('bluebird');
import _ = require('../util');
export = mods;


///** TODO */
var mods = [
    {
        name: 'async.promise',
        base: null,
        override: overrideAsync
    },
    {
        name: 'await.promise',
        base: null,
        override: overrideAwait
    }
];


/** Provides appropriate handling for promise-returning suspendable functions. */
function overrideAsync(base, options) {
    return {

        /** Sets up a promise resolver and synchronously returns a promise. */
        begin: (fi) => {
            var resolver = fi.context = Promise.defer<any>();
            fi.resume();
            return resolver.promise;
        },

        /** Calls the promise's progress() handler whenever the function yields, then continues execution. */
        suspend: (fi, error?, value?) => {
            if (error) throw error; // NB: not handled - throw in fiber
            fi.context.progress(value); // NB: fiber does NOT yield here, it continues
        },

        /** Resolves or rejects the promise, depending on whether the function returned or threw. */
        end: (fi, error?, value?) => {
            if (error) fi.context.reject(error); else fi.context.resolve(value);
        }
    };
}


//TODO: but overrideHandler call needs (REALLY??? check) to happen *after* user has a chance to set options
//      with config(...). So, builders must call the override...() func lazily ie when first
//      async(...) or await(...) call is made.
function overrideAwait(base, options) {
    return {

        singular: (fi, arg) => {
            if (!_.isPromise(arg)) return _.notHandled;
            arg.then(val => fi.resume(null, val), fi.resume);
        },

        variadic: (fi, args) => {
            if (!_.isPromise(args[0])) return _.notHandled;
            args[0].then(val => fi.resume(null, val), fi.resume);
        },

        elements: (values: any[], result: (err: Error, value: any, index: number) => void) => {

            // TODO: temp testing...
            var k = 0;
            values.forEach((value, i) => {
                if (_.isPromise(value)) {
                    value.then(val => result(null, val, i), err => result(err, null, i));
                    ++k;
                }
            });
            return k;
        }
    };
}
