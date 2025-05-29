import Bottleneck from "bottleneck";
import { logError, logInfo } from "./logging-utils.js";
import { codeDoneEvent, codeQueuedEvent } from "./liveprinter.listeners.js";
import { guiError } from "./liveprinter.ui.js";

//-------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------
//----------- LIVEPRINTER BACKEND JSON-RPC API ----------------------------------------------------
//-------------------------------------------------------------------------------------------------

globalThis.maxCodeWaitTime = 5; // max time the limiter waits for scheduled code before dropping job -- in ms


/**
 * Creates a new limiter instance and returns it.
 * @returns {Bottleneck} Limiter queue instance
 */
export function initLimiter() {
  // Bottleneck rate limiter package: https://www.npmjs.com/package/bottleneck
  // prevent more than 1 request from running at a time, provides priority queing
  const _limiter = new Bottleneck({
    maxConcurrent: 1,
    highWater: 10000, // max jobs, good to set for performance
    minTime: 0, // (ms) How long to wait after launching a job before launching another one.
    strategy: Bottleneck.strategy.LEAK, // cancel lower-priority jobs if over highwater
  });

  _limiter.on("error", async (error) => {
    /* handle errors here */
    let errorTxt = error;
    try {
      errorTxt = `${JSON.stringify(error)}`;
    } catch (err) {
      errorTxt = error + "";
    }

    try {
      await restartLimiter();
    } catch (err) {
      errorTxt = "Limiter restart error (failed restart too)::" + errorTxt;
    }
    guiError(Error(errorTxt));
    // logError(`Limiter error: ${errorTxt}`);
  });

  // Listen to the "failed" event
  _limiter.on("failed", async (error, jobInfo) => {
    const id = jobInfo.options.id;
    guiError(`Job ${id} failed: ${error}`);
    // if (jobInfo.retryCount === 0) { // Here we only retry once
    //     logError(`Retrying job ${id} in 5ms!`);
    //     return 5;
    // }
  });

  // Listen to the "retry" event
  _limiter.on("retry", (error, jobInfo) =>
    guiError(`Now retrying ${jobInfo.options.id}`)
  );

  _limiter.on("dropped", (dropped) => {
    logError("Limiter dropped job----------");
    let errorTxt = "";
    try {
      errorTxt = `${JSON.stringify(dropped)}`;
    } catch (err) {
      errorTxt = dropped + "";
    }
    guiError(Error(errorTxt));
    logError(`Dropped job ${errorTxt}`);
    //   This will be called when a strategy was triggered.
    //   The dropped request is passed to this event listener.
  });

  _limiter.on("queued", async function (info) {
    //logInfo(`queued: ${_limiter.queued()}`);
    info.queued = _limiter.queued();

    await codeQueuedEvent(info)
  });

  _limiter.on("done", async function (info) {
    info.queued = _limiter.queued();
    //logInfo(`done running command: ${_limiter.queued()}`);
    await codeDoneEvent(info);
  });
  return _limiter;
}

/**
 * Private async queue (limiter) instance.
 */
let limiter = initLimiter(); // runs code in a scheduler: see ui/globalEval()
// Bottleneck rate limiter for priority async queueing

/**
 * HACK -- needs fixing! Gives access to limiter queue. Dangerous.
 * @returns {Object} BottleneckJS limiter object. Dangerous.
 * @alias comms:getLimiter
 */
export function getLimiter() {
  return limiter;
}

/**
 * Schedules code to run in the async queue (e.g. limiter)
 * @param  {...any} args Limiter options object (see Bottleneckjs) and list of other function arguments
 * @returns {PromiseFulfilledResult} From the docs: schedule() returns a promise that will be executed according to the rate limits.
 * @alias comms:scheduleFunction
 */
export async function scheduleFunction(...args) {
  //logInfo(`scheduling Func: ${JSON.stringify(args)}`);
  return limiter.schedule(...args);
}

/**
 * Quickly schedules code to run in the async queue (e.g. limiter) with default args
 * @param  {Anything} args Limiter options object (see Bottleneckjs) and list of other function arguments
 * @returns {PromiseFulfilledResult} From the docs: schedule() returns a promise that will be executed according to the rate limits.
 * @alias comms:schedule
 */
export async function schedule(...args) {
  //Logger.info(`scheduling: ${args}`);
  //Logger.info(`scheduling type: ${typeof args}`);
  return limiter.schedule(
    { priority: 1, weight: 1, id: codeIndex++ },
    ...args
  );
}

// index of code block running
let codeIndex = 0;

/**
 * Get number of queued functions in limiter
 * @returns {Number} number of queued functions to run
 * @alias comms:getQueued
 */
export function getQueued() {
  return limiter.queued();
}

/**
 * Stops and clears the current queue of events. Should cancel all non-running actions. No new events can be added after this.
 */
export async function stopLimiter() {
  if (limiter) {
    await limiter.stop({ dropWaitingJobs: true });
    limiter.disconnect(); // clear interval and allow memory to be freed
    logInfo("Limiter stopped.");
  }
  limiter = null;
  debug("Shutdown completed!");
  return;
}

/**
 * Effectively cleares the current queue of events and restarts it. Should cancel all non-running actions.
 * @alias comms:restartLimiter
 */
export async function restartLimiter() {
  logInfo("Limiter restarting");
  let stopped = false;
  try {
    await stopLimiter();
    stopped = true;
  } catch (err) {
    stopped = false;
    guiError(`Failed to restart limiter (restartLimiter): ${err}`);
  }
  if (stopped) limiter = initLimiter();
  return;
}
