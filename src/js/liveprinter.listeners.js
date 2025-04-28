
//////////////////////////////////////////////////////////////////////
// Listeners for printer events  /////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////

// import { schedule } from "./liveprinter.limiter";
import { debug, doError } from "./logging-utils";

// movement functions triggered at end of movement GCode reponse
let positionEventListeners = [];

let okEventListeners = [];

let otherEventListeners = [];

let doneListeners = [];

/**
 * Add listener function to run when 'codeDone' events are received from the limiter (not scheduled to be run by the limiter!)
 * @param {Function} listener
 * @alias comms:onCodeDone
 */
export const onCodeDone = function (listener) {
  if (doneListeners.includes(listener)) return;

  doneListeners.push(listener);
};

/**
 * Remove a listener from 'codeDone' events queue
 * @param {Function} listener
 * @alias comms:offCodeQueued
 */
export const offCodeDone = (listener) => {
  doneListeners = doneListeners.filter((list) => list !== listener);
};

/**
 * Trigger the code done event for all position listeners
 * @param {Anything} data
 * @return {Boolean} success
 * @alias comms:okEvent
 */
export const codeDoneEvent = async function (data) {
    let handled = false;
    try {
      await Promise.all(
        doneListeners.map(async (v) => {
        return v(data);
        })
      );
  
      debug("code done event handled: " + data); // other response
      handled = true;
    } catch (err) {
      err.message = "Error in code done event handler:" + err.message;
      doError(err);
      handled = false;
    }
    return handled;
  };
  



let queuedListeners = [];

/**
 * Add listener function to run when 'codeQueued' events are received from the limiter (not scheduled to be run by the limiter!)
 * @param {Function} listener
 * @alias comms:onCodeQueued
 */
export const onCodeQueued = function (listener) {
  if (queuedListeners.includes(listener)) return;

  queuedListeners.push(listener);
};

/**
 * Remove a listener from 'codeQueued' events queue
 * @param {Function} listener
 * @alias comms:offCodeQueued
 */
export const offCodeQueued = (listener) => {
  queuedListeners = queuedListeners.filter((list) => list !== listener);
};

/**
 * Trigger the code queued event for all position listeners
 * @param {Anything} data
 * @return {Boolean} success
 * @alias comms:okEvent
 */
export const codeQueuedEvent = async function (data) {
    let handled = false;
    try {
      await Promise.all(
        queuedListeners.map(async (v) => {
        return v(data);
        })
      );
  
      debug("code queued event handled: " + data); // other response
      handled = true;
    } catch (err) {
      err.message = "Error in code queued event handler:" + err.message;
      doError(err);
      handled = false;
    }
    return handled;
  };
  

//------------------------------------------------
// NOTE: these could be more general on('event', func)

/**
 * Add listener function to run when 'position' events are received from the printer server (these are scheduled to be run by the limiter)
 * @param {Function} listener
 * @alias comms:onPosition
 */
export const onPosition = function (listener) {
  if (positionEventListeners.includes(listener)) return;

  positionEventListeners.push(listener);
};

/**
 * Remove a listener function from 'position' events queue
 * @param {Function} listener
 * @alias comms:offPosition
 */
export const offPosition = (listener) => {
  positionEventListeners = positionEventListeners.filter(
    (list) => list !== listener
  );
};


/**
 * Trigger the position event for all position listeners
 * @param {Anything} data
 * @return {Boolean} success
 * @alias comms:okEvent
 */
export const positionEvent = async function (data) {
    let handled = false;
    try {
      await Promise.all(
        positionEventListeners.map(async (v) => {
          //schedule(()=>{v(data); return true;});
          return v(data);
        })
      );
  
      debug("position event handled: " + data); // other response
      handled = true;
    } catch (err) {
      err.message = "Error in position event handler:" + err.message;
      doError(err);
      handled = false;
    }
    return handled;
  };
  

/**
 * Add listener function to run when 'position' events are received from the printer server (these are scheduled to be run by the limiter)
 * @param {Function} listener
 * @alias comms:onOk
 */
export const onOk = function (listener) {
  if (okEventListeners.includes(listener)) return;

  okEventListeners.push(listener);
};

/**
 * Remove listener function from ok events queue
 * @param {Function} listener
 * @alias comms:offOk
 */
export const offOk = (listener) => {
  okEventListeners = okEventListeners.filter((list) => list !== listener);
};

/**
 * Trigger the ok event for all ok listeners
 * @param {Anything} data
 * @return {Boolean} success
 * @alias comms:okEvent
 */
export const okEvent = async function (data) {
  let handled = false;
  try {
    await Promise.all(
      okEventListeners.map(async (v) => {
        // schedule(()=>{v(data); return true;});
        return v(data);
      })
    );

    debug("ok event handled: " + data); // other response
    handled = true;
  } catch (err) {
    err.message = "Error in ok event handler:" + err.message;
    doError(err);
    handled = false;
  }
  return handled;
};

/**
 * Add listener function to run when 'other' (unmatched) events are received from the printer server (these are not scheduled to be run by the limiter)
 * @param {Function} listener
 * @alias comms:onOther
 */
export const onOther = function (listener) {
  if (otherEventListeners.includes(listener)) return;

  otherEventListeners.push(listener);
};

/**
 * Remove listener function from 'other' (unmatched) events queue
 * @param {Function} listener
 * @alias comms:offOther
 */
export const offOther = (listener) => {
  otherEventListeners = otherEventListeners.filter((list) => list !== listener);
};

/**
 * Trigger the other event for all other listeners
 * @param {Anything} data
 * @return {Boolean} success
 * @alias comms:okEvent
 */
export const otherEvent = async function (data) {
    let handled = false;
    try {
      await Promise.all(
        otherEventListeners.map(async (v) => {
        return v(data);
        })
      );
  
      debug("other event handled: " + data); // other response
      handled = true;
    } catch (err) {
      err.message = "Error in other event handler:" + err.message;
      doError(err);
      handled = false;
    }
    return handled;
  };
  
/**
 * Clear all listeners for a specific event type: codeDone, ok, other, codeQueued, position.
 * @param {*} eventType
 * @alias comms:clearEvent
 */
export const clearEvent = function (eventType) {
  switch (eventType) {
    case "codeDone":
      doneListeners.length = 0;
      break;
    case "ok":
      okEventListeners.length = 0;
      break;
    case "other":
      otherEventListeners.length = 0;
      break;
    case "codeQueued":
      queuedListeners.length = 0;
      break;
    case "position":
      positionEventListeners.length = 0;
      break;
    default:
      doError(`Bad event type: ${eventType}`);
      break;
  }
};
