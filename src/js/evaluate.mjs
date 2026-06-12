/*
evaluate.mjs - Borrowed from Strudel (had a nicer implementation!)
Copyright (C) 2024 Strudel contributors and Evan Raskob - see <https://github.com/tidalcycles/strudel/blob/main/packages/core/evaluate.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { guiError } from "./liveprinter.ui";

const AsyncFunction = async function () {}.constructor;

/**
 * Build the scope for running evalated functions by importing them into globalThis namespace (onyl need to do this once)
 * @param  {...any} args List of modules (variables) to import into globalThis namespace for use in the evaluated function
 * @returns {Array} List of modules
 */
export const evalScope = async (...args) => {
  const results = await Promise.allSettled(args);
  const modules = results
    .filter((result) => result.status === "fulfilled")
    .map((r) => r.value);
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.warn(
        `evalScope: module with index ${i} could not be loaded:`,
        result.reason,
      );
    }
  });
  // Object.assign(globalThis, ...modules);
  // below is a fix for above commented out line
  // same error as https://github.com/vitest-dev/vitest/issues/1807 when running this on astro server
  modules.forEach((module) => {
    Object.entries(module).forEach(([name, value]) => {
      globalThis[name] = value;
    });
  });
  return modules;
};

/**
 * Safely (?) builds a new function from the code given in the code argument
 * @param {String} code 
 * @returns {Function} async function to run
 */
function safeEvalFunction(code) {
  if (code == undefined || code == null || typeof code != "string") {
    throw new SyntaxError(
      `safeEvalFunction::string to evaluate is not a string or not included [${code}]`,
    );
  }

  if (code[code.length - 1] !== ";") {
    code += ";"; // ensure it ends with a semicolon
  }  

  // remove all unescaped newlines
  const body = `"use strict";${code}`.replaceAll(/\r?\n|\r/gm, "");

  // make async function
  const result = new AsyncFunction(body);
  
  return result;
}
/**
 * Transpile code and return results for later use (evaluated function object and transpiled code)
 * @param {String} code Code to transpile and turn into an AsyncFunction object for later use
 * @param {Object} transpiler Transpiler object
 * @param {Object} transpilerOptions Options for transpiler like {errorHandler: function}
 * @returns {Object} Returns object of the form: { mode: "javascript", result: AsyncFunction, code: "transpiled code" }
 */
export async function buildEvaluateFunction(
  {
    code, transpiler, options
  },
) {
  const result = { mode: "javascript", result: null, code };
  const errorHandler = (options?.errorHandler || guiError);
  try {
    // transform liveprinter grammar and javascript mix into javascript code
    const transpiled = transpiler(code, options?.objName || undefined);
    result.newcode = transpiled;
  } catch (err) {
    errorHandler(`transpile error: ${terr}`);
  }
  try {
    const evaluateFunction = safeEvalFunction(result.newcode);
    result.result = evaluateFunction;
  } catch (err) {
    console.log(
      `ERROR evaluating transpiled code ${JSON.stringify(err, null, 2)}`,
    );
    err.message = `Error evaluating transpiled code: ${err.message}`;
    errorHandler(err);
  }
  return result;
}
