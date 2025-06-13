/*
evaluate.mjs - Borrowed from Strudel (had a nicer implementation!)
Copyright (C) 2024 Strudel contributors and Evan Raskob - see <https://github.com/tidalcycles/strudel/blob/main/packages/core/evaluate.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { guiError } from "./liveprinter.ui";

const AsyncFunction = async function () {}.constructor;

export const evalScope = async (...args) => {
  const results = await Promise.allSettled(args);
  const modules = results
    .filter((result) => result.status === "fulfilled")
    .map((r) => r.value);
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.warn(
        `evalScope: module with index ${i} could not be loaded:`,
        result.reason
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

function safeEvalFunction(str, options = {}) {
  const { wrapExpression = true, wrapAsync = true } = options;
  if (wrapExpression) {
    str = `{${str}}`; // reset bail
  }
  if (str[str.length - 1] !== ";") {
    str += ";"; // ensure it ends with a semicolon
  }
  if (wrapAsync) {
    str = `try 
    {
      return (async ()=>
        {
          lp.bail(false);
            ${str}
          return true;
        })();
    } catch (err) {
      guiError(err); 
      return false;
    }`;
  }


  //console.log(\"ERROR in wrapped function [transpilation]: ${str.replaceAll(/'|"/gm, "\"")}\");

  // remove all unescaped newlines
  const body = `"use strict";${str}`.replaceAll(/\r?\n|\r/gm, "");

  let result = new AsyncFunction(`"use strict";return false`);
  try {
    result = new AsyncFunction(body);
  } catch (err) {
      // `Error creating new function: ${
      //   typeof err == "string" ? err : JSON.stringify(err, null, 2)
      // }`
    guiError( err  );
  }

  return result;
}

export async function buildEvaluateFunction(
  code,
  transpiler,
  transpilerOptions
) {
  let newcode = code;
  let result = { mode: "javascript", result: null, code: newcode };
  try {
    if (transpiler) {
      // transform liveprinter grammar and javascript mix into javascript code
      const transpiled = transpiler(code, transpilerOptions);
      newcode = transpiled;
    }
  } catch (terr) {
    guiError(`transpile error: ${terr}`);
  }
  // if no transpiler is given, we expect a single instruction (!wrapExpression)
  const options = { wrapExpression: !transpiler };
  try {
    const evaluateFunction = safeEvalFunction(newcode, options);
    result.result = evaluateFunction;
  } catch (err) {
    console.log(
      `ERROR evaluating transpiled code ${JSON.stringify(err, null, 2)}`
    );
    guiError(err);
  }
  return result;
}
