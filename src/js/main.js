import { repeat, numrange, countto, Scheduler } from "liveprinter-utils";

import { LivePrinter } from "liveprinter-core";

import {
  taskListenerUI,
  initUI,
  sendAndHandleGCode
} from "./liveprinter.ui.js";


import {
  doError
} from "./logging-utils.js";

import { initEditors } from "./liveprinter.editor";
import { Logger } from "liveprinter-utils";
import $ from "jquery";

globalThis.$ = globalThis.jquery = $;

//require('./svg/SVGReader'); // svg util class
//require('./svg/svg2gcode'); // svg gcode converter

// now that browsers have deferred loading, this isn't really needed anymore?
(async function (w) {
  "use strict";

  await $.ready();

  // const testdata = await liveprintercomms.getData("http://localhost:8888/data", "POST", "nothing");
  // Logger.debug(testdata);

  Logger.level = Logger.LOG_LEVEL.info;

  globalThis.repeat = repeat;
  globalThis.numrange = numrange;
  globalThis.countto = countto;

  //await repeat(2, async(n) => console.log(n)); // test func

  if (!globalThis.console) {
    globalThis.console = {
      __log: [],
      get _log() {
        return this.__log;
      },
      log: function (text) {
        this._log.push(text);
      },
      getLog: function () {
        return this._log;
      },
    };
  }

  const lp = new LivePrinter();

  await initEditors(lp); // create editors and setup live editing functions
  await initUI(lp); // start server communications and setup UI

  /// attach listeners

  lp.addGCodeListener({
    gcodeEvent: sendAndHandleGCode,
  });
  lp.addErrorListener({ errorEvent: doError });

  ///
  /// add GCode listener to capture compiles GCode to editor
  // printer.addGCodeListener(
  //     { gcodeEvent: async (gcode) => editors.recordGCode(editors.GCodeEditor, gcode) }
  // );


})().catch((err) => {
  console.error(err);
});
