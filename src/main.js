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
import { Logger } from "liveprinter-utils";
import { initialCode, ual_9_6_24, loops, shapesmix } from "./initialcode";
import { evalScope, evaluate } from "./evaluate.mjs";
import { initSound } from "./sound";
import './js/lib/bitty-editor/bitty.min.js';
import './js/lib/bitty-editor/plugins/highlight_active_line.js';


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
  await main();
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

  // do the main thing we came here for
  const visualiser = makeVisualiser(lp, "preview", {
    title: "LivePrinter2",
    delay: true,
    debug: false,
  });

  await initSound(lp);

  // set up global module and function references
  evalScope({ lp, log: Logger.info }, visualiser, utils, gridlib);

  visualiser.setViewY(1/6);

  const b1 = bitty.create({
    flashColor: "black",
    flashTime: 100,
    value: ual_9_6_24,
    el: document.querySelector(".one"),
    rules: jsrules,
  });

  b1.subscribe("run", async (txt) => {
    // console.log( 'editor 1:', txt )
    const results = await evaluate(txt, transpile);
    Logger.info(`Evaluated code: ${JSON.stringify(results.code,null,2)}`);
    //b2.el.innerHTML = JSON.stringify(results.code,null,2);
    // document.getElementById('output').innerHTML=`Evaluated code: ${JSON.stringify(results)}`;
    return results;
  });

  const b2 = bitty.create({
    flashColor: "black",
    flashTime: 100,
    value: shapesmix,
    el: document.querySelector(".two"),
    rules: jsrules,
  });

  b2.subscribe( 'run', async txt => evaluate(txt, transpile));

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
