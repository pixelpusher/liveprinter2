/**
 * Code execution, processing, and recording functionality for LivePrinter.
 * @module EditorExecution
 */

import $ from "jquery";
import * as math from "mathjs";
import { setDoError, debug, logError } from "./logging-utils.js";
import { buildEvaluateFunction } from "./evaluate.mjs";
import { transpile } from "lp-language";
import { blinkElem, clearError, guiError } from "./liveprinter.ui";
import { getDateString } from "./liveprinter.editor-utils.js";

// Regular expressions for preprocessing
const mathjsRegex = /(m\')(.*?)(\')/g; // matches mathjs function calls like m'sin(0.5)'
const asyncOpenRegex = /{{/g
const asyncCloseRegex = /}}/g
const asyncOpenReplaceString = '( async ()=> {\n\t';
const asyncCloseReplaceString = '\n\t});\n';

let limiter = null; // limiter for async queue

// global variables
globalThis.math = math; // make mathjs available globally
globalThis.parser = math.parser(); // make parser available globally (see runCode)
globalThis.virtualmode = false; // when not connected to a printer

// Hack to catch ALL errors in the interactive editor that might slip through because of forgotten await/catch() etc on async functions
window.addEventListener('unhandledrejection', function(event) {
  
  // Prevent the default browser console error
  event.preventDefault();
  
  // console.error("Unhandled promise (error in evaluated code?):", event);
  historyAndGUIError(event.reason);
  
});

/**
 * Log code to history editor window
 * @param {String} code
 */
export function recordCode(code) {
  if (!globalThis.HistoryCodeEditor) return;
  
  // add comment with date and time
  const dateStr = getDateString();
  
  const codeText = "//" + dateStr + code + (code.endsWith("\n") ? "" : "\n");
  
  globalThis.HistoryCodeEditor.append(codeText);
}

/**
 * Log GCode to history window
 * @param {Array | String} gcode
 */
export function recordGCode(gcode) {
  if (!globalThis.HistoryCodeEditor) return;
  
  // add comment with date and time
  const dateStr = getDateString();
  
  const gcodeArray = Array.isArray(gcode) ? gcode : [gcode];
  // ignore temperature or other info commands - no need to save these!
  const usefulGCode = gcodeArray.filter((_gcode) => !/M114|M105/.test(_gcode));
  
  const gcodeText = "# dateStr\n" + usefulGCode.join("\n");
  
  globalThis.HistoryCodeEditor.append(gcodeText + '\n');
}

/**
 * Record error messages in code editor for reviewing later
 * @param {Error} err 
 */
export function recordError(err) {
  if (!globalThis.HistoryCodeEditor) return;
  
  const dateStr = getDateString();
  
  let codeText = "ERROR";
  
  if (typeof err !== "object") {
    codeText = "//" + dateStr + "// ERROR: " + err + (err.endsWith("\n") ? "" : "\n" + "\n");
  }
  else 
  {
    // handle nested errors
    if (err.error !== undefined) err = err.error;

    codeText = "//" + dateStr + "//\tERROR:"
      + `\n//\t${err.name}: ${err.message}`
      + ((err.stack != null) 
        ? `\n//\tSTACK:${err.stack.split('\n').filter(item => item.length > 0).map(item => `\n//\t\t${item.trim()}`)}` 
        : '')
      + '\n'; 
  }
  
  globalThis.HistoryCodeEditor.append(codeText);
}

/**
 * Record error in History Editor and display in GUI
 * @param {Error} err
 */
export function historyAndGUIError(err) {
  recordError(err);
  guiError(err);
}

// Set up error handler
setDoError(historyAndGUIError);

/**
 * Pre-process incoming code before transpiling. Replace mathjs expressions and async function shortcuts.
 * @param {String} code 
 * @returns {String} Preprocessed code
 */
export function preprocess(code) {
  code = code.replaceAll(mathjsRegex,  "parser.evaluate('$2')");
  code = code.replaceAll(asyncOpenRegex, asyncOpenReplaceString);
  code = code.replaceAll(asyncCloseRegex, asyncCloseReplaceString);
  
  debug("code before pre-preprocessing-------------------------------");
  debug(code);
  debug("========================= -------------------------------");
  return code;
}

/**
 * Set the code execution limiter
 * @param {Object} _limiter - Async queue limiter
 */
export function setLimiter(_limiter) {
  limiter = _limiter;
}

/**
 * This function takes the highlighted "local" code from the editor and runs the compiling and error-checking functions.
 * @param {String} code
 * @param {Boolean} immediate If true, run immediately, otherwise schedule to run
 * @returns {Promise<Boolean>} success
 */
export async function runCode(code, immediate = false) {
  let result = false;
  
  clearError();
  
  // if printer isn't connected, we shouldn't run!
  const printerConnected = $("#header").hasClass("blinkgreen");
  if (!globalThis.virtualmode && !printerConnected) {
    historyAndGUIError(new Error(
      "Printer not connected! Please connect first using the printer settings tab."
    ));
  } else {
    if (Array.isArray(code)) {
      immediate = false;
    } else {
      recordCode('//CODE:\n'+code);
    }
    
    clearError();
    
    code = preprocess(code)
    
    try {
      const results = await buildEvaluateFunction({
        code, transpiler:transpile, 
        options: {errorHandler: historyAndGUIError}
      });
      const resultFunction = results.result;
      debug(
        `Evaluated code ${immediate ? '[immediate]' : ''}: ${results.newcode}`
      );

      recordCode(`//EVALUATED${immediate ? '[immediate]': ''}${results.newcode}`);

      
      if (immediate) {
        try 
        {
          // make sure to await or we can't catch errors like undeclared variables in the function!
          result = await resultFunction();
        }
        catch(err)
        {
          historyAndGUIError(err);          
        }
      } else {
        result = limiter.schedule(() => resultFunction());
      }
      
      // blink the form
      blinkElem($("form"));
    } catch (err) {
      historyAndGUIError(err);
    }
  }
  return result;
}
