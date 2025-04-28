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
import * as gridlib from "gridlib";
import * as Tone from "tone";
import { Logger } from "liveprinter-utils";
import { initialCode, ual_9_6_24, loops } from "./initialcode";
import { evalScope, evaluate } from "./evaluate.mjs";
import { playNotes } from "./sound";

import * as utils from "liveprinter-utils";

const jsrules = {
  comments: /(\/\/.*)/g,
  keywords:
    /\b(global|new|if|else|do|while|switch|for|of|continue|break|return|typeof|function|var|const|let|\.length)(?=[^\w])/g,
  numbers: /\b(\d+)/g,
  strings: /(".*?"|'.*?'|\`.*?\`)/g,
};


document.addEventListener("DOMContentLoaded", (event) => {
  console.log("DOM fully loaded and parsed");
});

//--------------------------------------------------
//---- CODE FROM TEST ------------------------------
//--------------------------------------------------

Logger.level = Logger.LOG_LEVEL.error;

//attach a click listener to a play button
document.querySelector("#start-btn")?.addEventListener("click", async () => {
  await Tone.start();
  Logger.info("audio is ready");

  main();
});


const edit1 = document.getElementById("editor-1");

const edit2 = document.getElementById("editor-2");

  document
  .getElementById('editor-1').addEventListener("click", async () => {
    document.querySelector(".two")?.classList.add("hidden");
    document.querySelector(".one")?.classList.remove("hidden");
    document.getElementById("editor-2").classList.remove("disabled");
    edit1.classList.add("disabled")
  });
  
  
  document
  .getElementById('editor-2').addEventListener("click", async () => {
    document.querySelector(".one")?.classList.add("hidden");
    document.querySelector(".two")?.classList.remove("hidden");
    document.getElementById("editor-1").classList.remove("disabled");
    edit2.classList.add("disabled")
  });
  
  
  document.querySelector(".two")?.classList.add("hidden");


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
  evalScope({ lp, gridlib, visualiser, log: Logger.info }, utils);

  const b1 = bitty.create({
    flashColor: "black",
    flashTime: 100,
    value: loops,
    el: document.querySelector(".one"),
    rules: jsrules,
  });

  b1.subscribe("run", async (txt) => {
    // console.log( 'editor 1:', txt )
    const results = await evaluate(txt, transpile);
    Logger.info(`Evaluated code: ${JSON.stringify(results.code,null,2)}`);
    b2.el.innerHTML = JSON.stringify(results.code,null,2);
    // document.getElementById('output').innerHTML=`Evaluated code: ${JSON.stringify(results)}`;
  });

  const b2 = bitty.create({
    flashColor: "black",
    flashTime: 100,
    value: "code2",
    el: document.querySelector(".two"),
    rules: jsrules,
  });

  // b2.subscribe( 'run', txt => {
  //   console.log( 'editor 2:', txt )
  //   eval( txt )
  // })

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
  // document.querySelector("#run-btn")?.addEventListener("click", async () => {
  //   const results = await evaluate(codeTextArea.value, transpile);
  //   Logger.info(`Evaluated code: ${JSON.stringify(results)}`);
  //   document.getElementById('output').innerHTML=`Evaluated code: ${JSON.stringify(results)}`;
  // });
}
