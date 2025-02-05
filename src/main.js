/**
 * LivePrinter2, modular version
 *
 * by Evan Raskob <evan@flkr.com>
 *
 * Might be buggy, but hey!
 */

import "./style.css";
import { LivePrinter } from "liveprinter-core";
import { makeVisualiser } from "vizlib";
import { transpile } from "lp-language";
import * as gridlib from 'gridlib'; 
import * as Tone from "tone";
import { Logger } from "liveprinter-utils";
import { initialCode, ual_9_6_24 } from "./initialcode";
import { evalScope, evaluate } from "./evaluate.mjs";
import { playNotes } from "./sound";

import * as utils from 'liveprinter-utils';

  //--------------------------------------------------
  //---- CODE FROM TEST ------------------------------
  //--------------------------------------------------

  const codeTextArea = document.getElementById("code");
  codeTextArea.value = ual_9_6_24;

  Logger.level = Logger.LOG_LEVEL.error;

  //attach a click listener to a play button
  document.querySelector("#start-btn")?.addEventListener("click", async () => {
    await Tone.start();
    Logger.info("audio is ready");
    main();
  });

/**
 * Run it!
 * @returns
 */
async function main() {
  const lp = new LivePrinter();

  const eventsListener = {
    printEvent: async ({
      type,
      newPosition,
      oldPosition,
      speed,
      moveTime,
      totalMoveTime,
      layerHeight,
      length,
    }) => {
      Logger.debug(
        `TEST PRINT EVENT: ${type},
          old: ${JSON.stringify(oldPosition)},
          new: ${JSON.stringify(newPosition)},
          speed: ${speed},
          moveTime: ${moveTime},
          totalMoveTime: ${totalMoveTime},
          layerHeight: ${layerHeight},
          length: ${length}`
      );

      if (!newPosition || !oldPosition) return;

      const speedPerAxisMs = {
        x: (newPosition.x - oldPosition.x) / moveTime,
        y: (newPosition.y - oldPosition.y) / moveTime,
        z: (newPosition.z - oldPosition.z) / moveTime,
      };
      const speedScale = lp.speedScale();
      const noteFreqs = {
        x: 1000 * Math.abs(speedPerAxisMs.x) * speedScale.x,
        y: 1000 * Math.abs(speedPerAxisMs.y) * speedScale.y,
        z: 1000 * Math.abs(speedPerAxisMs.z) * speedScale.z,
      };

      playNotes(noteFreqs, moveTime);

      return;
    },
  };

  // do the main thing we came here for
  const visualiser = makeVisualiser(lp, "preview", {
    title: "LivePrinter2",
    delay: true,
    debug: false,
  });


  // set up print events feedback
  lp.addPrintListener(eventsListener);

  // set up global module and function references
  evalScope({lp, gridlib, log:Logger.info}, utils);

  /**
   * CodeMirrors
   */
  function executeKeymap(tag) {
    return keymap.of([
      {
        key: "Ctrl-Enter",
        run: () => {
          console.log(tag);
          return true;
        },
      },
    ]);
  }
  //attach a click listener to a play button
  document.querySelector("#stop-btn")?.addEventListener("click", async () => {
    await Tone.stop();
    Logger.info("audio is stopped");
  });
  //attach a click listener to a play button
  document.querySelector("#run-btn")?.addEventListener("click", async () => {
    const results = await evaluate(codeTextArea.value, transpile);
    Logger.info(`Evaluated code: ${JSON.stringify(results)}`);
    document.getElementById('output').innerHTML=`Evaluated code: ${JSON.stringify(results)}`;

  });
}
