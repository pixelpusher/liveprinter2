/**
 * Communications between server, GUI, and events functionality for LivePrinter.
 * @module Comms
 * @typicalname comms
 * @author Evan Raskob <evanraskob+nosp4m@gmail.com>
 * @version 2.0
 * @license
 * Copyright (c) 2022 Evan Raskob and others
 * Licensed under the GNU Affero 3.0 License (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *     {@link https://www.gnu.org/licenses/gpl-3.0.en.html}
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import {
  logInfo,
  logError,
  logPrinterState,
  logCommands,
} from "./logging-utils.js";
import Logger from "liveprinter-utils/logger";
import $ from "jquery";

export const remotePort = 8888; // port for server, might be different that url if testing

// TODO: these

//liveprinterUI.moveHandler
//updateGUI
//tempHandler
//clearError

/**
 * Global variables object collection.
 * @alias comms:vars
 */
export const vars = Object.create(null); // session vars

vars.serialPorts = []; // available ports

vars.logAjax = false; // log all ajax request/response pairs for debugging to command panel

vars.ajaxTimeout = 60000; // 1 minute timeout for ajax calls (API calls to the backend server)

vars.requestId = 0;

/**
 * Send a JSON-RPC request to the backend, get a response back. See below implementations for details.
 * @param {Object} request JSON-RPC formatted request object
 * @returns {Object} response JSON-RPC response object
 * @alias comms:sendJSONRPC
 */

export async function sendJSONRPC(request) {
  //debug(request)
  let args = typeof request === "string" ? JSON.parse(request) : request;
  //args._xsrf = getCookie("_xsrf");
  //debug(args);
  let reqId = "req" + vars.requestId++; // shared with limiter - see above

  if (vars.logAjax) logCommands(`SENDING ${reqId}::${request}`);

  let response = "awaiting response";

  Logger.debug(
    `${location.protocol}//${location.hostname}:${remotePort}/jsonrpc`
  );

  try {
    response = await $.ajax({
      url: `${location.protocol}//${location.hostname}:${remotePort}/jsonrpc`,
      type: "POST",
      data: JSON.stringify(args),
      timeout: vars.ajaxTimeout, // might be a long wait on startup... printer takes time to start up and dump messages
    });
  } catch (error) {
    // statusText field has error ("timeout" in this case)
    response = JSON.stringify(error, null, 2);
    const statusText = `JSON error response communicating with server:<br/>${response}<br/>Orig:${request}`;
    Logger.error(statusText);
    logError(statusText);
  }
  if (undefined !== response.error) {
    logError(
      `JSON error response communicating with server:<br/>${JSON.stringify(
        response.error,
        null,
        2
      )}<br/>Orig:${request}`
    );
  }

  if (vars.logAjax) logCommands(`RECEIVED ${reqId}::${request}`);
  return response;
}

/**
 * Get array of data from another server via POST or GET. Should be in the format
 *  {data: [[x,y,z], [x,y,z], [x,y,z] ]}
 * @param {String} url with https:// etc.
 * @param {String} type POST or GET
 * @param {Object or String} data (optional) post data
 * @returns
 */
export async function getData(url, type = "POST", data) {
  type = type.toLocaleUpperCase();

  if (!type.match(/POST|GET/)) {
    Logger.error(`Wrong type in getData() (should be GET or POST): ${type}`);
    logError(`Wrong type in getData() (should be GET or POST): ${type}`);
    return;
    //throw new TypeError(`Wrong type in getData() (should be GET or POST): ${type}`);
  }
  data = typeof data === "string" ? data : JSON.stringify(data);

  //args._xsrf = getCookie("_xsrf");

  let response = "awaiting response";

  try {
    response = await $.ajax({
      url,
      type,
      data,
      timeout: vars.ajaxTimeout, // might be a long wait on startup... printer takes time to start up and dump messages
    });
  } catch (error) {
    // statusText field has error ("timeout" in this case)
    response = JSON.stringify(error, null, 2);
    const statusText = `JSON error response communicating with server:<br/>${response}<br/>Orig:${url}`;
    Logger.error(statusText);
    logError(statusText);

    return response;
  }

  if (undefined !== response.error) {
    logError(
      `getData(): Error response communicating with server:<br/>${JSON.stringify(
        response.error,
        null,
        2
      )}<br/>Orig:${url}`
    );
    response = JSON.stringify(error, null, 2);
    return response;
  }

  if (undefined === response.data) {
    logError(
      `Missing data field in response from server in getData(): ${JSON.stringify(
        response,
        null,
        2
      )}`
    );
  } else {
    response = response.data;
  }

  return response;
}

/**
 * Get the list of serial ports from the server (or refresh it) and display in the GUI (the listener will take care of that)
 * @memberOf LivePrinter
 * @returns {Object} result Returns json object containing result
 * @alias comms:getSerialPorts
 */
export async function getSerialPorts() {
  const message = {
    jsonrpc: "2.0",
    id: 6,
    method: "get-serial-ports",
    params: [],
  };
  logInfo("getting serial ports");
  const response = await sendJSONRPC(JSON.stringify(message));

  if (
    undefined === response.result ||
    undefined === response.result[0] ||
    typeof response.result[0] === "string"
  ) {
    logError("bad response from getSerialPorts():");
    logError(JSON.stringify(response));
    throw new Error(
      "bad response from getSerialPorts():" + JSON.stringify(response)
    );
  }
  return response;
}

/**
 * Set the serial port from the server (or refresh it) and display in the GUI (the listener will take care of that)
 * @memberOf LivePrinter
 * @param {String} port Name of the port (machine)
 * @returns {Object} result Returns json object containing result
 * @alias comms:setSerialPort
 */
export async function setSerialPort({ port, baudRate }) {
  const message = {
    jsonrpc: "2.0",
    id: 5,
    method: "set-serial-port",
    params: [port, baudRate],
  };
  const response = await sendJSONRPC(JSON.stringify(message));
  let result = false;

  if (
    response.result &&
    response.result.length > 0 &&
    response.result[0] !== "closed"
  ) {
    result = true;
  } else {
    logError("bad response from setSerialPort():");
    logError(JSON.stringify(response));
    throw new Error(
      "bad response from setSerialPort():" + JSON.stringify(response)
    );
  }

  return result;
}

/**
 * Set the serial port from the server (or refresh it) and display in the GUI (the listener will take care of that)
 * @memberOf LivePrinter
 * @param {String} port Name of the port (machine)
 * @returns {Object} result Returns json object containing result
 * @alias comms:setSerialPort
 */
export async function closeSerialPort() {
  const message = {
    jsonrpc: "2.0",
    id: 2,
    method: "close-serial-port",
    params: [],
  };

  const response = await sendJSONRPC(JSON.stringify(message));
  if (
    undefined === response.result ||
    undefined === response.result[0] ||
    typeof response.result[0] === "string"
  ) {
    logError("bad response from closeSerialPort():");
    logError(JSON.stringify(response));
    throw new Error(
      "bad response from closeSerialPort():" + JSON.stringify(response)
    );
  } else {
    loginfo("port closed!");
  }

  return response;
}

/**
 * Set the serial port from the server (or refresh it) and display in the GUI (the listener will take care of that)
 * @memberOf LivePrinter
 * @param {String} loglevel Name of the port (machine)
 * @returns {Object} result Returns json object containing result
 * @alias comms:setGCodeLogLevel
 */
export async function setGCodeLogLevel(loglevel) {
  let lvl = 0;
  //see https://docs.python.org/3/library/logging.html#logging-levels
  if (loglevel.match(/debug/i)) {
    lvl = 10;
  } else if (loglevel.match(/info/i)) {
    lvl = 20;
  } else if (loglevel.match(/warn/i)) {
    lvl = 30;
  } else if (loglevel.match(/error/i)) {
    lvl = 40;
  }

  const message = {
    jsonrpc: "2.0",
    id: 4,
    method: "set-gcode-loglevel",
    params: [lvl],
  };
  const response = await sendJSONRPC(JSON.stringify(message));
  if (
    undefined === response.result ||
    undefined === response.result[0] ||
    typeof response.result[0] === "string"
  ) {
    logError("bad response from set setGCodeLogLevel():");
    logError(JSON.stringify(response));
    throw new Error(
      "bad response from set setGCodeLogLevel():" + JSON.stringify(response)
    );
  } else {
    logInfo("set log level " + lvl);
  }

  return response;
}

/**
 * Set the current commands line number on the printer (in case of resend). Probably doesn't work?
 * @param {int} int new line number
 * @returns {Object} result Returns json object containing result
 * @alias comms:setline
 */
export async function setCurrentLine(lineNumber) {
  const message = {
    jsonrpc: "2.0",
    id: 7,
    method: "set-line",
    params: [lineNumber],
  };
  const response = await sendJSONRPC(JSON.stringify(message));
  if (
    undefined === response.result ||
    undefined === response.result[0] ||
    response.result[0].startsWith("ERROR")
  ) {
    logError("bad response from set setCurrentLine():");
    logError(JSON.stringify(response));
  } else {
    logInfo("set line number " + response.result[0].line);
  }

  return response;
}

/**
 * Get the connection state of the printer and display in the GUI (the listener will take care of that)
 * @returns {Object} result Returns json object containing result
 * @alias comms:getPrinterState
 */
let gettingState = false;

export async function getPrinterState() {
  if (!gettingState) {
    const message = {
      jsonrpc: "2.0",
      id: 3,
      method: "get-printer-state",
      params: [],
    };
    const response = await sendJSONRPC(JSON.stringify(message));
    if (undefined === response) {
      logError("bad response from set getPrinterState():");
      logError(JSON.stringify(response));
    } else {
      logPrinterState(response);
    }
    return response;
  }
  return null;
}

/**
 * Send GCode to the server via json-rpc over ajax.
 * @param {string} gcode gcode to send
 * @returns {Object} result Returns json object containing result
 * @alias comms:sendGCodeRPC
 */
export async function sendGCodeRPC(gcode) {
  let gcodeObj = { jsonrpc: "2.0", id: 4, method: "send-gcode", params: [] };
  if (vars.logAjax) logCommands(`SENDING gcode ${gcode}`);

  if (Array.isArray(gcode)) {
    const results = await Promise.all(
      gcode.map(async (_gcode) => {
        if (!_gcode.startsWith(";")) {
          // don't send comments
          gcodeObj.params = [_gcode];
          //debug(gcodeObj);
          let response;
          try {
            const reply = await sendJSONRPC(JSON.stringify(gcodeObj));
            response = reply.result[0];
          } catch (err) {
            logError(err);
            doError(err);
            response = Promise.reject(err.message);
          }

          return response;
        }
      })
    );
    if (vars.logAjax) logCommands(`DONE gcode array ${gcode}`);

    return results;
  } else {
    //debug("single line gcode");
    if (!gcode.startsWith(";")) {
      // don't send comments
      gcodeObj.params = [gcode];
      let response;
      try {
        const reply = await sendJSONRPC(JSON.stringify(gcodeObj));
        response = reply.result[0];
      } catch (err) {
        logError(err);
        doError(err);
        response = Promise.reject(err.message);
      }
      if (vars.logAjax) logCommands(`DONE gcode ${gcode}`);
      return response;
    }
  }
}

/**
 * Schedule GCode to be sent to the server, in order, using the limiter via json-rpc over ajax.
 * @param {string} gcode gcode to send
 * @param {Integer} priority Priority in queue (0-9 where 0 is highest)
 * @alias comms:scheduleGCode
 * @returns {Object} result Returns json promise object containing printer response
 */
// export async function scheduleGCode(gcode, priority = 4) {
//   // 0-9, lower higher
//   const reqId = "req" + vars.requestId++;

//   let result = null; // result to be handled later -- see handleGCodeResponse

//   if (vars.logAjax) logCommands(`SENDING ${reqId}`);
//   return scheduleFunction(
//     { priority: priority, weight: 1, id: reqId, expiration: maxCodeWaitTime },
//     async () => {
//       result = await sendGCodeRPC(gcode);
//       if (vars.logAjax) logCommands(`RECEIVED ${reqId}`);
//       return result;
//     }
//   );
// }

