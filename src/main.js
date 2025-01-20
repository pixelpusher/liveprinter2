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
import * as Tone from "tone";
import { Logger } from "liveprinter-utils";

/**
 * Run it!
 * @returns
 */
async function main() {
  const oscXYZ = {
    x: new Tone.PWMOscillator(0, 0.15).toDestination(),
    y: new Tone.PWMOscillator(0, 0.15).toDestination(),
    z: new Tone.PWMOscillator(0, 0.15).toDestination(),
  };

  oscXYZ.x.volume.value = -6;
  oscXYZ.y.volume.value = -6;
  oscXYZ.z.volume.value = -6;

  function playNotes(noteFreqs, duration) {
    Logger.info(`note freqs: ${JSON.stringify(noteFreqs)} for ${duration}`);

    // start at "C4"
    oscXYZ.x.frequency.value = noteFreqs.x;
    oscXYZ.y.frequency.value = noteFreqs.y;
    oscXYZ.z.frequency.value = noteFreqs.z;

    // ramp to "C2" over 2 seconds
    //osc.frequency.rampTo("C2", 2);
    // start the oscillator for 2 seconds
    oscXYZ.x
      .stop()
      .start()
      .stop(`+${duration / 1000}`);
    oscXYZ.y
      .stop()
      .start()
      .stop(`+${duration / 1000}`);
    oscXYZ.z
      .stop()
      .start()
      .stop(`+${duration / 1000}`);
  }

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
  const visualiser = makeVisualiser(lp, "app", {
    title: "LivePrinter2",
    delay: true,
    debug: true,
  });

  lp.addPrintListener(eventsListener);

  //--------------------------------------------------
  //---- CODE FROM TEST ------------------------------
  //--------------------------------------------------

  const codeTextArea = document.getElementById("code");
  const resultsTextArea = document.getElementById("results");
  let transpiledCode;

  //attach a click listener to a play button
  document.getElementById("run-btn").addEventListener("click", async () => {
    // try {
    resultsTextArea.value = transpiledCode = transpile(codeTextArea.value);

    // } catch (err) {
    //   Logger.debug(`Compilation error: ${JSON.stringify(err)}`);
    // }

    let _code = ` 
    const lp = lib.lp;
    ${transpiledCode} 
  `;

    const func = async () => {
      const lib = { Logger, lp };

      let innerFunc;

      // Call user's function with external bindings from lib (as 'this' which gets interally mapped to 'lib' var)
      try {
        //innerFunc = eval(`async(lib)=>{${_code}}`);
        const AsyncFunction = async function () {}.constructor;
        innerFunc = new AsyncFunction("lib", _code);
      } catch (e) {
        Logger.error(`Code compilation error(${_code}): ${e.message}`);

        return 0; // fail fast
      }

      Logger.info("running inner");
      await innerFunc(lib);
      return 1;
    };

    try {
      await func();
    } catch (err) {
      Logger.error(`ERROR: ${err}`);
    }
  });

  //attach a click listener to a play button
  // document.querySelector("#download-btn")?.addEventListener("click", async () => {
  //   visualiser.downloadGCode();
  //   Logger.info("audio is stopped");
  // }).classList.remove("disabled");
}

Logger.level = Logger.LOG_LEVEL.debug;

//attach a click listener to a play button
document.querySelector("#start-btn")?.addEventListener("click", async () => {
  await Tone.start();
  Logger.info("audio is ready");
  main();
});

//attach a click listener to a play button
document.querySelector("#stop-btn")?.addEventListener("click", async () => {
  await Tone.stop();
  Logger.info("audio is stopped");
});


