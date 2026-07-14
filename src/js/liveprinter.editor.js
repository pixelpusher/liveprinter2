/**
 * Code editing functionality for LivePrinter.
 * 
 * This module serves as the main entry point, initilises the CodeMirror text editors
 * and re-exports the modularized editor functionality:
 * - liveprinter.codemirror.js: CodeMirror setup and editor creation
 * - liveprinter.editor-utils.js: Utilities like storageAvailable() and initEditors()
 * - liveprinter.editor-exec.js: Code processing, running, and recording
 * 
 * @module Editors
 * @typicalname editors
 */

import $ from "jquery";
import * as gridlib from "gridlib";
import { makeVisualiser } from "vizlib";
import { buildEvaluateFunction, evalScope } from "./evaluate.mjs";
import { createCodeMirrorEditor } from "./liveprinter.codemirror.js";
import { shapesmix, presetscode, loops } from "./initialcode.js";
import { iterateLSystem, makeCommands, drawCommands } from "./tpj/lsystems.js";
import Sequence from "./Sequence.js";
import { Logger, repeat, countto, numrange } from "liveprinter-utils";
import { 
  downloadFile, 
  clearError, 
  updateGUI, 
  info, 
  guiError 
} from "./liveprinter.ui.js";
import { runCode, recordCode, setLimiter } from "./liveprinter.editor-exec.js";
import { parseStrudel as uzu } from "lp-language";


// Import and re-export CodeMirror utilities
export { createCodeMirrorEditor } from "./liveprinter.codemirror.js";

// Import and re-export storage and initialization utilities
import { getDateString } from "./liveprinter.editor-utils.js";

export {
  storageAvailable,  
} from "./liveprinter.editor-utils.js";

export { getDateString };

// Import and re-export execution utilities
export {
  recordCode,
  recordGCode,
  recordError,
  historyAndGUIError,
  preprocess,
  runCode,
  setLimiter
} from "./liveprinter.editor-exec.js";

/**
 * Initialise editors and events, etc.
 * @param {Object} lp - LivePrinter instance
 * @param {Object} _limiter - Code execution limiter
 * @returns {Promise<void>}
 */
export async function initEditors(lp, _limiter) {
  
  // Pass the limiter to the execution module
  setLimiter(_limiter);
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
  
  // Initialize HistoryCodeEditor as a global so it can be used by the execution module
  globalThis.HistoryCodeEditor = createCodeMirrorEditor({
    id: "HistoryCodeEditor",
    value: localStorage.getItem("HistoryCodeEditor") || "CODE",
    el: document.querySelector("#history-code-editor"),
    onRun: runCode,
  });
  
  const editors = [CodeEditor, CodeEditor2, CodeEditor3, globalThis.HistoryCodeEditor];
  
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
      // Future: Load content into editor
    })
    .fail(function () {
      guiError("Error loading example file: " + filename);
    });
  });
  
  ///----------------------------------------------------------
  ///------------GUI events------------------------------------
  ///----------------------------------------------------------
  
  $('a[data-toggle="pill"]').on("shown.bs.tab", function (e) {
    const target = $(e.target).attr("href"); // activated tab
    if (target === "#history-code-editor-area") {
      clearError();
    } else if (target === "#code-editor-area") {
      clearError();
    } else if (target === "#gcode-editor-area") {
      // visualiser
    }
  });
  
  /// extra compile button
  $("#sendCode").on("click", () => runCode(CodeEditor.value));
  
  /// download all code
  $(".btn-download").on("click", async () => {
    // add comment with date and time
    const dateStr = "_" + getDateString().trim();
    
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
  
  return;
}

