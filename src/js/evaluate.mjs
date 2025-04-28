/*
evaluate.mjs - Borrowed from Strudel (had a nicer implementation!)
Copyright (C) 2024 Strudel contributors and Evan Raskob - see <https://github.com/tidalcycles/strudel/blob/main/packages/core/evaluate.mjs>
This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

export const evalScope = async (...args) => {
    const results = await Promise.allSettled(args);
    const modules = results.filter((result) => result.status === 'fulfilled').map((r) => r.value);
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.warn(`evalScope: module with index ${i} could not be loaded:`, result.reason);
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
      str = `{${str}}`;
    }
    if (wrapAsync) {
      str = `(async ()=>${str})()`;
    }
    const body = `"use strict";return (${str})`;
    return new Function(body);
  }
  
  export const buildEvaluateFunction = async (code, transpiler, transpilerOptions) => {
    let newcode = code;
    if (transpiler) {
      // transform liveprinter grammar and javascript mix into javascript code
      const transpiled = transpiler(code, transpilerOptions);
      newcode = transpiled;
    }
    // if no transpiler is given, we expect a single instruction (!wrapExpression)
    const options = { wrapExpression: !!transpiler };
    const  evaluateFunction = safeEvalFunction(newcode, options);    
    return { mode: 'javascript', result: evaluateFunction, code:newcode };
  };