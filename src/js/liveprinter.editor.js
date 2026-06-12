/**
* Code editing functionality for LivePrinter.
* @module Editor
* @typicalname editor
*/

/**
* JQuery reference
*/
import $ from "jquery";
import * as gridlib from "gridlib";
import { setDoError, doError, debug, logError, logInfo } from "./logging-utils.js";
import { buildEvaluateFunction, evalScope } from "./evaluate.mjs";
import Sequence from "./Sequence.js";
import * as math from "mathjs";
import { parseStrudel as uzu } from "lp-language";
// CodeMirror 6
import {EditorState, EditorSelection, Prec} from "@codemirror/state"
import {
  EditorView, keymap, highlightSpecialChars, drawSelection,
  highlightActiveLine, dropCursor, rectangularSelection,
  crosshairCursor, lineNumbers, highlightActiveLineGutter
} from "@codemirror/view"
import {
  indentOnInput,
  bracketMatching, foldGutter, foldKeymap
} from "@codemirror/language"
import {
  defaultKeymap, history, historyKeymap,
  indentWithTab
} from "@codemirror/commands"
import {
  searchKeymap, highlightSelectionMatches
} from "@codemirror/search"
import {
  autocompletion, completionKeymap, closeBrackets,
  closeBracketsKeymap
} from "@codemirror/autocomplete"
import {lintKeymap} from "@codemirror/lint"
import { javascript } from "@codemirror/lang-javascript";
import {
  // cleanGCode,
  Logger,
  repeat,
  countto,
  numrange,
} from "liveprinter-utils";
import {
  downloadFile,
  blinkElem,
  clearError,
  updateGUI,
  info,
  guiError,
  errorHandler
} from "./liveprinter.ui";
import { makeVisualiser } from "vizlib";
import { transpile } from "lp-language";
import { shapesmix, presetscode, loops } from "./initialcode.js";
import { iterateLSystem, makeCommands, drawCommands } from "./tpj/lsystems.js";
import { lpDark } from "./lpDarkTheme.ts";
// const commentRegex = /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm; // https://stackoverflow.com/questions/5989315/regex-for-match-replacing-javascript-comments-both-multiline-and-inline/15123777#15123777
const mathjsRegex = /(m\')(.*?)(\')/g; // matches mathjs function calls like m'sin(0.5)'
const asyncOpenRegex = /{{/g
const asyncCloseRegex = /}}/g
const asyncOpenReplaceString = '( async ()=> {\n\t';
const asyncCloseReplaceString = '\n\t});\n';


let limiter = null; // limiter for async queue

/**
 * Get date string for logging purposes
 */
function getDateString() {
  // add comment with date and time
  return
  new Date().toLocaleString("en-US", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3
  }) + "\n";
}

/**
* 
* @param {EditorView} view 
* @returns text of current line
*/
const selectLine = (view) => {
  // 1. Get the current cursor position
  const pos = view.state.selection.main.head;
  
  // 2. Find the line corresponding to this position
  const line = view.state.doc.lineAt(pos);
  
  // 3. Highlight the line visually
  view.dispatch({
    selection: EditorSelection.create([
      EditorSelection.range(line.from, line.to)
    ])
  });
  
  // 4. Extract the text
  return line.text;
};

/**
* Create a lightweight CodeMirror editor for code editing
* @param {Object} config - Configuration object
* @param {string} config.id - Editor ID
* @param {string} config.value - Initial code value
* @param {HTMLElement} config.el - Parent element
* @param {Function} config.onRun - Callback when code should be executed
* @returns {Object} Editor object with value getter/setter and focus method
*/
function createCodeMirrorEditor(config) {
  let lastSavedValue = config.value;
  
  const state = EditorState.create({
    doc: config.value,
    extensions: [
      // A line number gutter
      lineNumbers(),
      // A gutter with code folding markers
      foldGutter(),
      // Replace non-printable characters with placeholders
      highlightSpecialChars(),
      // The undo history
      history(),
      // Replace native cursor/selection with our own
      drawSelection(),
      // Show a drop cursor when dragging over the editor
      dropCursor(),
      // Allow multiple cursors/selections
      EditorState.allowMultipleSelections.of(true),
      // Re-indent lines when typing specific input
      indentOnInput(),
      // Highlight matching brackets near cursor
      bracketMatching({ brackets: '()[]{}<>'}),
      // Automatically close brackets
      closeBrackets(),
      // Load the autocompletion system
      autocompletion(),
      // Allow alt-drag to select rectangular regions
      rectangularSelection(),
      // Change the cursor to a crosshair when holding alt
      crosshairCursor(),
      // Style the current line specially
      highlightActiveLine(),
      // Style the gutter for current line specially
      highlightActiveLineGutter(),
      // Highlight text that matches the selected text
      highlightSelectionMatches(),
      
      javascript(), 
      lpDark, 
      // bracketMatching({ brackets: '()[]{}<>' }),
      EditorView.updateListener.of((update) => {
        // Save to localStorage on document changes
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          if (newValue !== lastSavedValue) {
            localStorage.setItem(config.id, newValue);
            lastSavedValue = newValue;
          }
        }
      }),
      keymap.of([
        // Closed-brackets aware backspace
        ...closeBracketsKeymap,
        // A large set of basic bindings
        ...defaultKeymap,
        // Search-related keys
        ...searchKeymap,
        // Redo/undo keys
        ...historyKeymap,
        // Code folding bindings
        ...foldKeymap,
        // Autocompletion keys
        ...completionKeymap,
        // Keys related to the linter system
        ...lintKeymap,
        indentWithTab,
      ]),
      Prec.highest(keymap.of([
        {
          key: 'Ctrl-Enter',
          run: (editorView) => {
            const selection = window.getSelection().toString();
            const text = selection || selectLine(editorView);
            config.onRun(text, false);
            return true;
          },
        },
        {
          key: 'Alt-Enter',
          run: (editorView) => {
            const selection = window.getSelection().toString();
            const text = selection || selectLine(editorView);
            config.onRun(text, false);
            return true;
          },
        },
        {
          key: 'Shift-Enter',
          run: (editorView) => {
            const selection = window.getSelection().toString();
            const text = selection || selectLine(editorView);
            config.onRun(text, true);
            return true;
          },
        },
      ])
    ),
  ],
});

const view = new EditorView({
  state,
  parent: config.el,
});

return {
  view,
  name: config.id,
  get value() {
    return view.state.doc.toString();
  },
  set value(text) {
    // Replace the entire document
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: text,
      },
    });
    lastSavedValue = text;
  },
  focus() {
    view.focus();
  },
};
}

// global variables
globalThis.math = math; // make mathjs available globally
globalThis.parser = math.parser(); // make parser available globally (see runCode)
globalThis.virtualmode = false; // when not connected to a printer


let HistoryCodeEditor;


// Hack to catch ALL errors in the interactive editor that might slip through because of forgotten await/catch() etc on async functions

window.addEventListener('unhandledrejection', function(event) {

  // Prevent the default browser console error
  event.preventDefault();

  // console.error("Unhandled promise (error in evaluated code?):", event);
  historyAndGUIError(event.reason);
  

});

/**
* Log code log to history editor window of choice
* @param {String} gcode
*
*/
function recordCode(editor, code) {
  ///
  /// log code to code history window -------------------
  ///
  
  // add comment with date and time
  const dateStr = getDateString();
  
  const codeText = "//" + dateStr + "\n\n" + code + (code.endsWith("\n") ? "" : "\n" + "\n");
  
  editor.value += codeText;
}

/**
* Log GCode log to history window of choice
* @param {Editor} editor
* @param {Array | String} gcode
*/

function recordGCode(editor, gcode) {
  // add comment with date and time
  const dateStr = getDateString();
  
  const gcodeArray = Array.isArray(gcode) ? gcode : [gcode];
  // ignore temperature or other info commands - no need to save these!
  const usefulGCode = gcodeArray.filter((_gcode) => !/M114|M105/.test(_gcode));
  
  const gcodeText = "\n" + dateStr + usefulGCode.join("\n");
  
  editor.value += gcodeText;
}

/**
 * Record error massages in code editor for reviewing later
 * @param {CodeEditor} editor
 * @param {Error} err 
 */
function recordError(editor, err) {
  
  const dateStr = getDateString();
  
  let codeText = "ERROR";

  if (typeof err !== "object") {
    codeText = "//" + dateStr + "// ERROR: " + err + (err.endsWith("\n") ? "" : "\n" + "\n");
  }
  else 
  {
    // handle nested errors
    if (err.error !== undefined) err = err.error;
    const lineNumber = err.lineNumber == null ? -1 : err.lineNumber;
    codeText = "//" + dateStr + "// ERROR: " + err.name + ": " + err.message + " (line:" + lineNumber + ")\n\n";
  }

  editor.value += codeText;
}

/**
 * Record error in History Editor
 */
function historyAndGUIError(err) {
  recordError(HistoryCodeEditor, err);
  guiError(err);
}

setDoError(historyAndGUIError);


/**
 * Pre-process incoming code before transpiling. Replace mathjs expressions and async function shortcuts.
 * @param {String} code 
 * @returns 
 */
function preprocess(code) {
  code = code.replaceAll(mathjsRegex,  "parser.evaluate('$2')");
  code = code.replaceAll(asyncOpenRegex, asyncOpenReplaceString);
  code = code.replaceAll(asyncCloseRegex, asyncCloseReplaceString);
  
  debug("code before pre-preprocessing-------------------------------");
  debug(code);
  debug("========================= -------------------------------");
  return code;
}

/**
* This function takes the highlighted "local" code from the editor and runs the compiling and error-checking functions.
* @param {String} code
* @param {Boolean} immediate If true, run immediately, otherwise schedule to run
* @returns {Boolean} success
*/
async function runCode(code, immediate = false) {
  let result = false;
  
  clearError();
  
  // if printer isn't connected, we shouldn't run!
  const printerConnected = $("#header").hasClass("blinkgreen");
  if (!globalThis.virtualmode && !printerConnected) {
    const err = new Error(
      "Printer not connected! Please connect first using the printer settings tab."
    );
    historyAndGUIError(err);
    throw err;
    //TODO: BIGGER ERROR MESSAGE HERE
  } else {
    if (Array.isArray(code)) {
      immediate = false;
    } else {
      recordCode(HistoryCodeEditor,code);
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
        `Evaluated code[immediate]: ${JSON.stringify(results.code, null, 2)}`
      );
      
      if (immediate) {
        try 
        {
          // make sure to await or we can't catch errors like undeclaree variables in the function!
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

///////////////////////////////////////////////////////////////////////////////////////////////
///////////////////// Browser storage /////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

/**
* Local Storage for saving/loading documents.
* Default behaviour is loading the last edited session.
* @param {String} type type (global key in window object) for storage object
* @returns {Boolean} true or false, if storage is available
* @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
*/
function storageAvailable(type) {
  try {
    const storage = window[type],
    x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
        // acknowledge QuotaExceededError only if there's something already stored
        storage.length !== 0
      );
    }
  }
  

  /**
  * Initialise editors and events, etc.
  * @returns {PromiseFulfilledResult}
  */
  export async function initEditors(lp, _limiter) {
    
    limiter = _limiter;
    
    // do the main thing we came here for
    const visualiser = makeVisualiser(lp, "visualiser", {
      title: "The Printer Jam",
      delay: false,
      debug: false,
      travelColor: 0xea44aa, travelOpacity: 0.8,
      extrudeColor: 0xfaa044, extrudeOpacity: 0.9,
      printHeadColor: 0xffbb55, printHeadRadius: 3,
      fogEnabled: true, fogColor: 0x0f0f0f, fogNear: 5000, fogFar: 7800,
      glowEnabled: true,
      glowStrength: 2.0,
      glowRadius: 0.4,
      glowThreshold: 0.1,
      travelLineGlow: 1.5,
      extrudeLineGlow: 3.0,
    });
    
    
    /**
     * Toggle sidebar with CTRL-H (capital H)
     * @param {KeyboardEvent} event 
     */
    document.onkeydown = (event) =>{
      
      // this may have to be changed in FireFox using about:keyboard
      if (event.ctrlKey && event.key == 'H')
        {          
        const inbox = document.getElementById('inbox');
        if (inbox.style.display === "none") {
          inbox.style.display = "block";
        } else {
          inbox.style.display = "none";
        }
      }
      
    };
  
    // add libraries, object namespaces, etc. to compilation environment (see @runCode)  
    evalScope(
      {
        log: Logger.info,
        updateGUI,
        printer: lp, // alias for lp, bit more descriptive
        lp,
        repeat,
        countto,
        numrange,
        info,
        uzu,
        delay(d) {visualiser.vizevents.delay = d;}, // delay for visualiser, hacky
        iterateLSystem, makeCommands, drawCommands, // lsystem functions
        seq:Sequence
      },
      visualiser,
      gridlib
    );
    
    const shapeProgressElem = document.getElementById("shape-progress");
    const timelineProgressElem = document.getElementById("timeline-progress");
    
    const totalbars = 25;
    
    // get progress
    const progressListener = (event) => {
      switch (event.type) {
        case "shape":
        const bars =
        Math.floor(
          totalbars *
          event.it.current.i / (event.it.points * event.it.totallayers)
        );
        let str = "";
        for (let i = 0; i < bars; i++) {
          str += "-";
        }
        for (let i = bars; i < totalbars; i++) {
          str += "*";
        }
        shapeProgressElem.innerHTML = str;
        break;
        
        case "timeline":
        if (event.progress) {
          const bars = totalbars * parseFloat(event.progress);
          let str = "[t]";
          for (let i = 0; i < bars; i++) {
            str += "-";
          }
          for (let i = bars; i < totalbars; i++) {
            str += "*";
          }
          timelineProgressElem.innerHTML = str;
        } else if (event.crossfade) {
          const bars = totalbars * parseFloat(event.crossfade);
          let str = "[cf]";
          for (let i = 0; i < bars; i++) {
            str += "-";
          }
          for (let i = bars; i < totalbars; i++) {
            str += "*";
          }
          timelineProgressElem.innerHTML = str;
        }
        break;
      }
      // console.info(event);
    };
    
    gridlib.onProgress(progressListener);
    
    // Create CodeMirror editors to replace bitty
    const CodeEditor = createCodeMirrorEditor({
      id: "CodeEditor",
      value: localStorage.getItem("CodeEditor") || loops,
      el: document.querySelector("#code-editor"),
      onRun: runCode,
    });
    
    const CodeEditor2 = createCodeMirrorEditor({
      id: "CodeEditor2",
      value: localStorage.getItem("CodeEditor2") || shapesmix,
      el: document.querySelector("#code-editor-2"),
      onRun: runCode,
    });
    
    const CodeEditor3 = createCodeMirrorEditor({
      id: "CodeEditor3",
      value: localStorage.getItem("CodeEditor3") || presetscode,
      el: document.querySelector("#code-editor-3"),
      onRun: runCode,
    });
    
    HistoryCodeEditor = createCodeMirrorEditor({
      id: "HistoryCodeEditor",
      value: localStorage.getItem("HistoryCodeEditor") || "CODE",
      el: document.querySelector("#history-code-editor"),
      onRun: runCode,
    });
    
    const editors = [CodeEditor, CodeEditor2, CodeEditor3, HistoryCodeEditor];
    
    ///----------------------------------------------------------
    ///------------Examples list---------------------------------
    ///----------------------------------------------------------
    
    let exList = $("#examples-list > .dropdown-item").not("[id*='session']");
    exList.on("click", async function () {
      const me = $(this);
      const filename = me.data("link");
      clearError(); // clear loading errors
      $.ajax({ url: filename, dataType: "text" })
      .done(function (content) {
        // const newDoc = CodeMirror.Doc(content, "lp");
        // blinkElem($(".CodeMirror"), "slow", () => {
          //     CodeEditor.swapDoc(newDoc);
        //     CodeEditor.refresh();
        //     CodeEditor.on('changes', () => handleChanges(CodeEditor));
        //     CodeEditor.on('blur', () => handleChanges(CodeEditor));
        // });
      })
      .fail(function () {
        historyAndGUIError("Error loading example file: " + filename);
      });
    });
    
    ///----------------------------------------------------------
    ///------------GUI events------------------------------------
    ///----------------------------------------------------------
    
    $('a[data-toggle="pill"]').on("shown.bs.tab", function (e) {
      const target = $(e.target).attr("href"); // activated tab
      if (target === "#history-code-editor-area") {
        //HistoryCodeEditor.refresh();
        //setLanguageMode(); // have to update gutter, etc.
        clearError();
      } else if (target === "#code-editor-area") {
        //CodeEditor.refresh();
        //setTimeout(setLanguageMode, 1000); // have to update gutter, etc.
        clearError();
      } else if (target === "#gcode-editor-area") {
        // visualiser
      }
    });
    
    /// extra compile button
    $("#sendCode").on("click", runCode);
    
    /// download all code
    $(".btn-download").on("click", async () => {
      // add comment with date and time
      const dateStr =
      "_" + getDateString().trim();
      
      await downloadFile(
        CodeEditor.value,
        "lp-editor-1-" + dateStr + ".js",
        "text/javascript"
      );
      await downloadFile(
        CodeEditor2.value,
        "lp-editor-2-" + dateStr + ".js",
        "text/javascript"
      );
      await downloadFile(
        CodeEditor3.value,
        "Presets-" + dateStr + ".js",
        "text/javascript"
      );
    });
    
    // // set up events
    // editors.map(cm => cm.on("changes", (cm) => handleChanges(cm)));
    // editors.map(cm => cm.on("blur", (cm) => handleChanges(cm)));
    
    // if (storageAvailable('localStorage')) {
    //     // finally, load the last stored session:
    //     editors.map(cm => reloadSession(cm));
    // }
    // else {
      //     doError({ name: "save error", message: "no local storage available for saving files!" });
    // }
    
    return;
  }
  