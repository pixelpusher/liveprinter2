import Bottleneck from "bottleneck";
import { logError, logInfo } from "./logging-utils.js";
import { codeDoneEvent, codeQueuedEvent } from "./liveprinter.listeners.js";
import { guiError } from "./liveprinter.ui.js";

//-------------------------------------------------------------------------------------------------
//-------------------------------------------------------------------------------------------------
//----------- LIVEPRINTER BACKEND JSON-RPC API ----------------------------------------------------
//-------------------------------------------------------------------------------------------------

export class Limiter {
  #instance;
  #codeIndex;

  init()
  {
    this.#codeIndex = 0;

// Bottleneck rate limiter package: https://www.npmjs.com/package/bottleneck
    // prevent more than 1 request from running at a time, provides priority queing
    this.#instance = new Bottleneck({
      maxConcurrent: 1,
      highWater: 10000, // max jobs, good to set for performance
      minTime: 0, // (ms) How long to wait after launching a job before launching another one.
      strategy: Bottleneck.strategy.LEAK, // cancel lower-priority jobs if over highwater
    });

    this.#instance.on("error", async (error) => {
      /* handle errors here */
      guiError(error);
    });

    // Listen to the "failed" event
    this.#instance.on("failed", async (error, jobInfo) => {
      const id = jobInfo.options.id;
      guiError(`Job ${id} failed: ${error}`);
      // if (jobInfo.retryCount === 0) { // Here we only retry once
      //     logError(`Retrying job ${id} in 5ms!`);
      //     return 5;
      // }
    });

    // Listen to the "retry" event
    this.#instance.on("retry", (error, jobInfo) =>
      guiError(`Now retrying ${jobInfo.options.id}`)
    );

    this.#instance.on("dropped", (dropped) => {
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

    this.#instance.on("queued", async () => {
      //logInfo(`queued: ${_limiter.queued()}`);

      await codeQueuedEvent({queued: this.getQueued()});
    });

    this.#instance.on("done", async () => {
      await codeDoneEvent({queued: this.getQueued()});
    });
  }

  constructor() {
    this.init();
  }

  /**
   * Schedules code to run in the async queue (e.g. limiter)
   * @param  {...any} args Limiter options object (see Bottleneckjs) and list of other function arguments
   * @returns {PromiseFulfilledResult} From the docs: schedule() returns a promise that will be executed according to the rate limits.
   * @alias comms:scheduleFunction
   */
  async scheduleFunction(...args) {
    //logInfo(`scheduling Func: ${JSON.stringify(args)}`);
    return this.#instance.schedule(...args);
  }

  /**
   * Quickly schedules code to run in the async queue (e.g. limiter) with default args
   * @param  {Anything} args Limiter options object (see Bottleneckjs) and list of other function arguments
   * @returns {PromiseFulfilledResult} From the docs: schedule() returns a promise that will be executed according to the rate limits.
   * @alias comms:schedule
   */
  async schedule(...args) {
    //Logger.info(`scheduling: ${args}`);
    //Logger.info(`scheduling type: ${typeof args}`);
    return this.#instance.schedule(
      { priority: 1, weight: 1, id:  this.getNextJobId() },
      ...args
    );
  }

  getNextJobId()
  {
    return this.#codeIndex++;
  }

  /**
   * Get number of queued functions in limiter
   * @returns {Number} number of queued functions to run
   * @alias comms:getQueued
   */
  getQueued() {
    return this.#instance.queued();
  }

  /**
   * Stops and clears the current queue of events. Should cancel all non-running actions. No new events can be added after this.
   */
  async stop() {
    if (this.#instance) {
      await this.#instance.stop({ dropWaitingJobs: true });
      this.#instance.disconnect(); // clear interval and allow memory to be freed
      logInfo("Limiter stopped.");
      this.#instance = null;
    }
    debug("Shutdown completed!");
  }
}
