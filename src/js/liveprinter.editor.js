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
  guiError,
  sendAndHandleGCode
} from "./liveprinter.ui.js";
import { runCode, recordCode, setLimiter, recordGCode } from "./liveprinter.editor-exec.js";
import { parseStrudel as uzu } from "lp-language";
import { setSynthAttack, setSynthRelease } from "./sound.js"

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
    glowStrength: 1.5,
    glowRadius: 0.4,
    glowThreshold: 0.1,
    travelLineGlow: 1,
    extrudeLineGlow: 2.0,
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
    // toggle all editors, useful for tweaking 3D camera
    else if (event.ctrlKey && event.key == 'h') {
      const editorsPanel = document.getElementById('printer-editor-col');
      if (editorsPanel.style.display === "none") {
        editorsPanel.style.display = "block";
      } else {
        editorsPanel.style.display = "none";
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
      seq:Sequence,
      
      setAttack(beatsOrTime){
        setSynthAttack(lp.parseAsTime(beatsOrTime));
      },
      setRelease(beatsOrTime){
        setSynthRelease(lp.parseAsTime(beatsOrTime));
      },
    },
    visualiser,
    gridlib
  );
  
  /**
   * Setup gcode listener
   */

  globalThis.logGCode = false;
  
  const GCodeListener = {
    gcodeEvent: gcode => { if (globalThis.logGCode) recordGCode(gcode, GCodeEditor) },
  };
  lp.addGCodeListener(GCodeListener);


  /**
   * Timeline progress listeners from gridlib
   */

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

  const GCodeEditor = createCodeMirrorEditor({
    id: "GCodeEditor",
    value: localStorage.getItem("GCodeEditor") || "# gcode editor",
    el: document.querySelector("#gcode-editor"),
    onRun: sendAndHandleGCode,
  });
  
  // Initialize HistoryCodeEditor as a global so it can be used by the execution module
  globalThis.HistoryCodeEditor = createCodeMirrorEditor({
    id: "HistoryCodeEditor",
    value: localStorage.getItem("HistoryCodeEditor") || "CODE",
    el: document.querySelector("#history-code-editor"),
    onRun: runCode,
  });
  
  const editors = [CodeEditor, CodeEditor2, CodeEditor3, globalThis.HistoryCodeEditor];
  
  let activeEditor = CodeEditor; // Default to the first editor, which is active on load.


/**
   * For pop-up warnings etc. (see below)
   */
  const editorWarningModalEl = document.getElementById("editorWarningModal");
  const editorWarningModal = new bootstrap.Modal(editorWarningModalEl, {
    keyboard: false,
    backdrop: "static",
    focus: true
  });

  const confirmYesBtn = document.getElementById("warningYesBtn");

  ///----------------------------------------------------------
  ///------------Examples list---------------------------------
  ///----------------------------------------------------------
 /**
  * build examples loader links for dynamically loading example files
  * @memberOf LivePrinter
  */

  const exList = document.querySelectorAll("#examples-list > .dropdown-item:not([id*='session'])");
  exList.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const me = e.currentTarget;
      const filename = me.dataset.link;

      const loadExample = async () => {
        clearError(); // clear loading errors
        try {
          const response = await fetch(filename);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const content = await response.text();
          if (activeEditor) {
            activeEditor.value = content;
          } else {
            throw new Error("Trying to open example but no active editor!");
          }
        } catch (error) {
          guiError(`Error loading example file: ${filename} - ${error.message}`);
        } finally {
          //clean up
          confirmYesBtn.removeEventListener("click", yesHandler);
          editorWarningModal.hide();
        }
      };

      const yesHandler = () => loadExample();

      confirmYesBtn.addEventListener("click", yesHandler, { once: true });
      editorWarningModalEl.addEventListener("hidden.bs.modal", () => confirmYesBtn.removeEventListener("click", yesHandler), { once: true });

      editorWarningModal.show();      
    });
  });
  
  ///----------------------------------------------------------
  ///------------GUI events------------------------------------
  ///----------------------------------------------------------
  
  document.querySelectorAll('a[data-bs-toggle="pill"]').forEach(pill => pill.addEventListener("shown.bs.tab", (e) => {
    const target = e.target.getAttribute("href"); // activated tab

    // Keep track of the currently active editor and clear errors on tab switch
    switch (target) {
      case "#code-editor-area":
        activeEditor = CodeEditor;
        clearError();
        break;
      case "#code-editor-2-area":
        activeEditor = CodeEditor2;
        clearError();
        break;
      case "#code-editor-3-area":
        activeEditor = CodeEditor3;
        clearError();
        break;
      case "#gcode-editor-area":
        activeEditor = GCodeEditor;
        clearError();
        break;  
      case "#history-code-editor-area":
        activeEditor = globalThis.HistoryCodeEditor;
        clearError();
        break;
    }
  }));
  
  /// extra compile button
  document.querySelectorAll("#sendCode").forEach(btn => btn.addEventListener("click", () => runCode(activeEditor.value)));
  
  /// download active editor
  document.querySelectorAll(".btn-download").forEach(btn => btn.addEventListener("click", async () => {
    // add comment with date and time
    const dateStr = "_" + getDateString().trim();
    
    let filename = "lp-download-"; // default
    if (activeEditor && activeEditor.name) {
        switch(activeEditor.name) {
            case "CodeEditor":        filename = "lp-editor-1-"; break;
            case "CodeEditor2":       filename = "lp-editor-2-"; break;
            case "CodeEditor3":       filename = "lp-presets-"; break;
            case "GCodeEditor":       filename = "lp-gcode-"; break;
            case "HistoryCodeEditor": filename = "lp-history-"; break;
        }
    }

    if (activeEditor) {
        await downloadFile(
          activeEditor.value,
          filename + dateStr + ".js",
          "text/javascript"
        );
    }
  }));
  
  /// download all editors
  document.querySelectorAll(".btn-download-all").forEach(btn => btn.addEventListener("click", async () => {
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
      "lp-presets-" + dateStr + ".js",
      "text/javascript"
    );
    await downloadFile(
      globalThis.HistoryCodeEditor.value,
      "lp-history-" + dateStr + ".js",
      "text/javascript"
    );
  }));
  
  updateGUI(); // update state
  
  return;
  // end initEditors
}
