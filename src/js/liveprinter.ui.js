/**
* @file Main liveprinter system file for a livecoding system for live CNC manufacturing.
* @author Evan Raskob <evanraskob+nosp4m@gmail.com>
* @version 0.8
* @license
* Copyright (c) 2018 Evan Raskob and others
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

import { Logger } from "liveprinter-utils";

import { initSound } from "./sound.js";

import {
  MarlinLineParserResultPosition,
  MarlinLineParserResultTemperature,
} from "./parsers/MarlinParsers.js";

import {
  getPrinterState,
  setSerialPort,
  getSerialPorts,
  setGCodeLogLevel,
  vars,
  closeSerialPort,
  sendGCodeRPC,
} from "./liveprinter.comms";

import {
  debug,
  setLogInfo,
  logError,
  setLogCommands,
  setLogPrinterState,
} from "./logging-utils.js";

import {
  okEvent,
  otherEvent,
  positionEvent,
  onCodeDone,
  onCodeQueued,
  onPosition,
} from "./liveprinter.listeners.js";

import { initHelpModal } from "./liveprinter.help.js";

import { runCode } from "./liveprinter.editor-exec.js"

/**
* Milliseconds to hours minutes seconds string
* @param {Number} ms milliseconds 
* @returns {String} hours:mins:sec
*/
function hms(ms) {
  const s = Math.floor(ms / 1000);
  const s_per_m = 60;
  const s_per_h = s_per_m * 60;
  const h = Math.floor(s / s_per_h);
  const h_s = h * s_per_h;
  const m_s = s - h_s;
  const m = Math.floor(m_s / s_per_m);
  const result = `${h}:${m}:${s - m * s_per_m}`;
  return result;
}


export let infoListElement = "#info > ul"; // for logging info to GUI

let lastErrorMessage = "none"; // last error message for GUI

let printer = null; // liveprinter printer object
let limiter = null; // limiting scheduler

/**
* convenience function for sending GCode and handling response in GUI -- should it go here?
* @param {String or Array} gcode
* @returns
*/
export async function sendAndHandleGCode(gcode) {
  return handleGCodeResponse(await sendGCodeRPC(gcode));
}

/**
* GUI utils
*/

export function updateGUI() {
  document.querySelector("input[name='x']").value = printer.x.toFixed(4);
  document.querySelector("input[name='y']").value = printer.y.toFixed(4);
  document.querySelector("input[name='z']").value = printer.z.toFixed(4);
  document.querySelector("input[name='e']").value = printer.e.toFixed(4);
  document.querySelector("input[name='angle']").value = printer.angle.toFixed(4);
  document.querySelector("input[name='speed']").value = printer.printspeed().toFixed(4);
  document.querySelector("input[name='retract']").value = printer.currentRetraction.toFixed(4);
  document.querySelector("input[name='time']").value = hms(printer.time.toFixed(2));
}

/**
* Clear HTML of all displayed code errors
*/
export function clearError() {
  document.querySelector(".code-errors").innerHTML = "<p>[no errors]</p>";
  document.querySelector(".modal-errors").innerHTML = "";
}

let lastErrorTime = 0;

/**
* Show an error in the HTML GUI
* @param {Error} e Standard JavaScript error object to show
* @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
* @memberOf LivePrinter
*/
export function guiError(e) {
  // avoid repeated errors  
  const now = Date.now();
  if (now - lastErrorTime < 1000) {
    return;
  }
  
  lastErrorTime = now;
  
  // if (lastErrorMessage !== undefined && err.message !== lastErrorMessage) {
  //     lastErrorMessage = err.message;
  
  if (typeof e !== "object") {
    document.querySelector(".code-errors").innerHTML = `<p>${e}</p>`;

    const errorHtml = `<div class="alert alert-warning alert-dismissible fade show" role="alert">
        <em>PRINTER JAMMED!</em> 
        ${e}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>`;
    document.querySelector(".modal-errors").insertAdjacentHTML('afterbegin', errorHtml);
  } else {
    let err = e;
    if (e.error !== undefined) err = e.error;
    const lineNumber = err.lineNumber == null ? -1 : e.lineNumber;
    
    // report to user
    document.querySelector(".code-errors").innerHTML = `<p>${err.name}: ${err.message} (line:${lineNumber})</p>`;

    const errorHtml = `<div class="alert alert-warning alert-dismissible fade show" role="alert">
        <em>PRINTER JAMMED!</em> 
        ${err.name}: ${err.message} (line:${lineNumber})
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>`;
    document.querySelector(".modal-errors").insertAdjacentHTML('afterbegin', errorHtml);
  }
  Logger.error(e);
}

/**
* Parse temperature response from printer firmware (Marlin)
* @param {String} data serial response from printer firmware (Marlin)
* @return {Boolean} true or false if parsed or not
*/
export function tempHandler(result) {
  let handled = true;
  
  // try classic format
  if (undefined !== result.hotend) {
    try {
      const tmp = parseFloat(result.hotend).toFixed(2);
      const target = parseFloat(result.hotend_target).toFixed(2);
      const tmpbed = parseFloat(result.bed).toFixed(2);
      const targetbed = parseFloat(result.bed_target).toFixed(2);
      
      document.querySelector("input[name='temphot']").value = target;
      document.querySelector("input[name='tempbed']").value = targetbed;
      const tt = document.querySelector("input[name='temphot-target']");
      if (tt !== document.activeElement) tt.value = tmp;
      document.querySelector("input[name='tempbed-target']").value = tmpbed;
    } catch (e) {
      handled = false;
      // unhandled, maybe not attached to gui?
      logError(`Error in temphandler: is a GUI present?`);
    }
  }
  //try MarlinParser format
  else {
    try {
      if (undefined !== result.payload.extruder) {
        document.querySelector("input[name='temphot']").value = result.payload.extruder.deg;
        // make sure user isn't typing in this
        let tt = document.querySelector("input[name='temphot-target']");
        if (tt !== document.activeElement)
          tt.value = result.payload.extruder.degTarget;
      }
      if (undefined !== result.payload.heatedBed) {
        document.querySelector("input[name='tempbed']").value = result.payload.heatedBed.deg;
        let tt = document.querySelector("input[name='tempbed-target']");
        if (tt !== document.activeElement)
          tt.value = result.payload.heatedBed.degTarget;
      }
    } catch (err) {
      // unhandled, maybe not attached to gui?
      logerror(
        `Error in temphandler parsing marlinparserformat: is a GUI present?`
      );
      handled = false;
    }
  }
  return handled;
}

/**
* json-rpc error event handler
* @memberOf LivePrinter
*/
export const errorHandler = {
  error: function (event) {
    appendLoggingNode(document.querySelector("#errors > ul"), event.message);
    blinkElem(document.getElementById("errors-tab"));
    blinkElem(document.getElementById("inbox"));
  },
};

/**
* json-rpc info event handler
* @memberOf LivePrinter
*/
export const infoHandler = {
  info: function (event) {
    appendLoggingNode(document.querySelector(infoListElement), event.message);
    //blinkElem($("#info-tab"));
  },
  resend: function (event) {
    appendLoggingNode(document.querySelector(infoListElement), event.message);
    blinkElem(document.getElementById("info-tab"));
    blinkElem(document.getElementById("inbox"));
  },
};

/**
* json-rpc general event handler
* @memberOf LivePrinter
*/
export const commandsHandler = {
  log: function (event) {
    appendLoggingNode(document.querySelector("#commands > ul"), event.message);
    blinkElem(document.getElementById("inbox"));
  },
};

/**
* json-rpc move event handler
* @memberOf LivePrinter
*
* @param {Object} response Expects object parsed from MarlinParser
*/
export const moveHandler = (response) => {
  let result = true;
  try {
    // handle Prusa vs. regular here -- look for 'steps' in payload if 'steps' key exists
    // printer.x = response.payload.steps ? parseFloat(response.payload.pos.x/response.payload.steps.x) : parseFloat(response.payload.pos.x);
    // printer.y = response.payload.steps ? parseFloat(response.payload.pos.y/response.payload.steps.y) : parseFloat(response.payload.pos.y);
    // printer.z = response.payload.steps ? parseFloat(response.payload.pos.z/response.payload.steps.z) : parseFloat(response.payload.pos.z);
    printer.x = parseFloat(response.payload.pos.x);
    printer.y = parseFloat(response.payload.pos.y);
    printer.z = parseFloat(response.payload.pos.z);
    printer.e = parseFloat(response.payload.pos.e);
    
    // update GUI
    document.querySelector("input[name='angle']").value = printer.angle.toFixed(4);
    document.querySelector("input[name='speed']").value = printer.printspeed().toFixed(4);
    document.querySelector("input[name='retract']").value = printer.currentRetraction.toFixed(4);
    document.querySelector("input[name='x']").value = printer.x.toFixed(4);
    document.querySelector("input[name='y']").value = printer.y.toFixed(4);
    document.querySelector("input[name='z']").value = printer.z.toFixed(4);
    document.querySelector("input[name='e']").value = printer.e.toFixed(4);
  } catch (err) {
    // unhandled, maybe not attached to gui?
    logError(`Error in movehandler: is a GUI present?`);
    result = false;
  }
  
  return result; // handled
};

/**
* json-rpc serial ports list event handler
* @param{Object} event json-rpc response (in json format)
* @memberOf LivePrinter
*/
export const portsListHandler = function (event) {
  let ports = ["none"];
  try {
    ports = event.result[0].ports;
  } catch (e) {
    console.error("Bad event in portsListHandler:");
    console.error(event);
    console.error(e);
    throw e;
  }
  
  vars.serialPorts = []; // reset serial ports list
  const portsDropdown = document.getElementById("serial-ports-list");
  //Logger.debug("list of serial ports:");
  //Logger.debug(event);
  portsDropdown.innerHTML = '';
  if (ports.length === 0) {
    appendLoggingNode(document.querySelector(infoListElement), "<li>no serial ports found</li>");
    vars.serialPorts.push("dummy");
  } else {
    let msg = "<ul>Serial ports found:";
    for (let p of ports) {
      msg += "<li>" + p + "</li>";
      vars.serialPorts.push(p);
    }
    msg += "</ul>";
    appendLoggingNode(document.querySelector(infoListElement), msg);
  }
  
  vars.serialPorts.forEach(function (port) {
    //Logger.debug("PORT:" + port);
    const newButton = document.createElement('a');
    newButton.className = 'dropdown-item';
    newButton.dataset.portName = port;
    newButton.href = '#';
    newButton.textContent = port;

    newButton.addEventListener('click', async function (e) {
      e.preventDefault();
      const me = e.currentTarget;
      console.log(`serial port btn clicked ${me}`);
      
      info('INIT SOUND');
      try
      { 
        await initSound(printer);
      }
      catch(err) {
        logError(`Error initializing sound: ${err}`);
      }
      info("opening serial port " + me.textContent);
      const baudRate = document.querySelector("#baudrates-list .active")?.dataset.rate;
      
      Logger.debug("baudRate:");
      Logger.debug(baudRate);
      
      // disable changing baudrate and port
      //$("#baudrates-list > button").addClass("disabled");
      //$("#serial-ports-list > button").addClass("disabled");
      
      try {
        await setSerialPort({ port, baudRate });
      } catch (err) {
        guiError(err);
      }
      try {
        const state = await getPrinterState(); // check if we are connected truly
        printerStateHandler(state);
      } catch (err) {
        guiError(err);
      }
      document.querySelectorAll("#serial-ports-list > a").forEach(btn => btn.classList.remove("active"));
      me.classList.add("active");
      const connectBtn = document.getElementById('connect-btn');
      connectBtn.textContent = "disconnect";
      connectBtn.classList.add("active");
      
      lp.addGCodeListener({
        gcodeEvent: sendAndHandleGCode,
      });
      
      const vpBtn = document.getElementById('vp-btn');
      const newVpBtn = vpBtn.cloneNode(true);
      vpBtn.parentNode.replaceChild(newVpBtn, vpBtn);
      newVpBtn.classList.add('disabled');
      
      return;
    });
    const li = document.createElement('li');
    li.appendChild(newButton);
    portsDropdown.appendChild(li);
  });
  
  // build baud rates selection menu
  
  const allBaudRates = [115200, 250000, 230400, 57600, 38400, 19200, 9600];
  const baudratesList = document.getElementById("baudrates-list");
  baudratesList.innerHTML = '';
  
  allBaudRates.forEach((rate) => {
    //Logger.debug("PORT:" + port);
    const newButton = document.createElement('button');
    newButton.className = 'dropdown-item';
    newButton.type = 'button';
    newButton.dataset.rate = rate;
    newButton.textContent = rate;
    
    // handle click
    newButton.addEventListener('click', async function (e) {
      e.preventDefault();
      const me = e.currentTarget;
      baudratesList.querySelector(".active")?.classList.remove("active");
      me.classList.add("active");
    });
    
    // default rate
    if (rate === 250000) {
      newButton.classList.add("active");
    }
    baudratesList.appendChild(newButton);
  });
  
  const allLogLevels = ["debug", "info", "warn", "error"];
  const gcodeLevelList = document.getElementById("gcodelevel-list");
  gcodeLevelList.innerHTML = '';
  
  allLogLevels.forEach((level) => {
    const newButton = document.createElement('button');
    newButton.className = 'dropdown-item';
    newButton.type = 'button';
    newButton.dataset.level = level;
    newButton.textContent = level;
    
    // handle click
    newButton.addEventListener('click', async function (e) {
      e.preventDefault();
      const me = e.currentTarget;
      info("setting gcode log level " + me.textContent);
      const level = me.dataset.level;
      
      Logger.debug(`level: ${level}`);
      
      try {
        await setGCodeLogLevel(level);
      } catch (err) {
        guiError(err);
      }
      
      gcodeLevelList.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
      me.classList.add("active");
      return;
    });
    gcodeLevelList.appendChild(newButton);
  });
  // <div id="gcodelevel-list" class="dropdown-menu" aria-labelledby="gcodelevel-dropdown"></div>
  
  blinkElem(document.getElementById("serial-ports-list"));
  blinkElem(document.getElementById("info-tab"));
  
  return;
};

/**
* json-rpc printer state (connected/disconnected) event handler
* @param{Object} stateEvent json-rpc response (in json format)
* @memberOf LivePrinter
*/
export const printerStateHandler = function (stateEvent) {
  //info(JSON.stringify(stateEvent));
  
  if (stateEvent.result === undefined) {
    logError("bad state event" + JSON.stringify(stateEvent));
    return;
  } else {
    const printerTab = document.getElementById("header");
    const printerState = stateEvent.result[0].state;
    const printerPort =
    stateEvent.result[0].port === ("/dev/null" || "null")
    ? "dummy"
    : stateEvent.result[0].port;
    const printerBaud = stateEvent.result[0].baud;
    
    switch (printerState) {
      case "connected":
      if (!printerTab.classList.contains("blinkgreen")) {
        printerTab.classList.add("blinkgreen");
      }
      // highlight connected port
      document.getElementById("serial-ports-list").querySelectorAll('a').forEach(elem => {
        if (elem.textContent === printerPort) {
          if (!elem.classList.contains("active")) {
            elem.classList.add("active");
            const connectBtn = document.getElementById('connect-btn');
            connectBtn.textContent = "disconnect";
            connectBtn.classList.add("active");
          }
        } else {
          elem.classList.remove("active");
        }
      });
      document.getElementById("baudrates-list").querySelectorAll('button').forEach(elem => {
        if (elem.textContent === printerBaud) {
          if (!elem.classList.contains("active")) {
            elem.classList.add("active");
          }
        } else {
          elem.classList.remove("active");
        }
      });
      break;
      case "closed":
      if (printerTab) {
        printerTab.classList.remove("blinkgreen");
      }
      break;
      case "error":
      if (printerTab) {
        printerTab.classList.remove("blinkgreen");
      }
      break;
    }
  }
};

/*
* START SETTING UP SESSION VARIABLES ETC>
* **************************************
*
*/

////////////////////////////////////////////////////////////////////////
/////////////// Utility functions
///////////////////////////////////////////////////////////////////////

const maxLogPopups = 80;

/**
 * Is this is virtual mode?
 * @returns {Boolean}
 */
export function isVirtualMode() {
  return document.getElementById("vp-btn").dataset.running;
}

/**
* Append a dismissible, styled text node to one of the side menus, formatted appropriately.
* @param {HTMLElement} elem DOM element to append this to
* @param {String} message message text for new element
* @param {String} cssClass optional CSS class to append
* @memberOf LivePrinter
*/
export function appendLoggingNode(elem, message, cssClass) {
  let messageString =
  typeof message === "object" || Array.isArray(message)
  ? JSON.stringify(message)
  : message;
  
  const dateStr = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).format(Date.now());
  
  let classes = "alert alert-primary alert-dismissible fade show";
  if (cssClass) classes += ` ${cssClass}`;
  
  if (elem.childElementCount > maxLogPopups) {
    // remove oldest child
    elem.removeChild(elem.firstElementChild);
  }
  const listElement = document.createElement("li");
  listElement.classList.add(...classes.split(" "));
  listElement.setAttribute("role", "alert");
  
  listElement.appendChild(document.createTextNode(dateStr));
  
  const msgElem = document.createElement("strong");
  msgElem.innerHTML = ` :: ${messageString}&nbsp;`;
  
  listElement.appendChild(msgElem);
  
  const buttonClose = document.createElement("button");
  buttonClose.setAttribute("type", "button");
  buttonClose.setAttribute("data-bs-dismiss", "alert");
  buttonClose.setAttribute("aria-label", "Close");
  buttonClose.classList.add("btn-close");
  
  listElement.appendChild(buttonClose);
  
  elem.prepend(listElement);
}

/**
* Log a line of text to the logging panel on the right side
* @param {String} text Text to log in the right info panel
* @memberOf LivePrinter
*/
export function info(text) {
  //Logger.debug("LOGINFO-----------");
  Logger.debug(text);
  
  if (Array.isArray(text)) {
    infoHandler.info({
      time: Date.now(),
      message: "[" + text.toString() + "]",
    });
  } else if (typeof text === "string") {
    infoHandler.info({ time: Date.now(), message: text });
  } else if (typeof text === "object") {
    infoHandler.info({ time: Date.now(), message: JSON.stringify(text) });
  } else {
    infoHandler.info({ time: Date.now(), message: text + "" });
  }
}

window.info = info; //cheat, for livecoding...

/**
* Log a line of text to the logging panel on the right side
* @param {String} text Text to log in the right info panel
* @memberOf LivePrinter
*/
export function logerror(text) {
  Logger.error("LOGERROR-----------");
  Logger.error(text);
  
  if (typeof text === "string")
    errorHandler.error({ time: Date.now(), message: text });
  else if (typeof text === "object") {
    errorHandler.error({ time: Date.now(), message: JSON.stringify(text) });
  } else if (typeof text === "array") {
    errorHandler.error({ time: Date.now(), message: text.toString() });
  } else {
    errorHandler.error({ time: Date.now(), message: text + "" });
  }
}

/**
* Attach an external script (and remove it quickly). Useful for adding outside libraries.
* @param {String} url Url of script (or name, if in the static/misc folder)
*/
export function attachScript(url) {
  let realUrl = url;
  
  if (url.startsWith("/")) {
    // local
    realUrl = url;
  } else if (!url.startsWith("http")) {
    // look in misc folder
    realUrl = "/static/misc/" + url;
  }
  let script = document.createElement("script");
  script.src = realUrl;
  // run and remove
  try {
    document.head.appendChild(script).parentNode.removeChild(script);
  } catch (err) {
    guiError(err);
  }
}
window.attachScript = attachScript; //cheat, for livecoding...

/**
* Download a file. From stack overflow
* @param {any} data Data in file
* @param {String} filename Name of file to save as
* @param {String} type Type of file (e.g. text/javascript)
* @memberOf LivePrinter
*/
export async function downloadFile(data, filename, type) {
  const file = new Blob([data], { type: type });
  if (window.navigator.msSaveOrOpenBlob)
    // IE10+
  window.navigator.msSaveOrOpenBlob(file, filename);
  else {
    // Others
    const a = document.createElement("a"),
    url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    await (async () => a.click())();
    //setTimeout(function () {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    //}, 0);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////// GUI SETUP ///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

/**
* blink an element using css animation class
* @param {HTMLElement} elem element to blink
* @param {String} speed "fast" or "slow"
* @param {Function} callback function to run at end
* @memberOf LivePrinter
*/

export function blinkElem(elem, speed, callback) {
  if (!elem) return;
  elem.classList.remove("blinkit", "fast", "slow"); // remove to make sure it's not there
  
  const handleAnimationEnd = () => {
    if (callback !== undefined && typeof callback === "function") callback();
    elem.classList.remove("blinkit", "fast", "slow");
  };

  elem.addEventListener("animationend", handleAnimationEnd, { once: true });

  if (speed === "fast") {
    elem.classList.add("blinkit", "fast");
  } else if (speed === "slow") {
    elem.classList.add("blinkit", "slow");
  } else {
    elem.classList.add("blinkit");
  }
}

/**
*
* @param {Scheduler} _scheduler Scheduler object to use for tasks, repeating events, etc. If
*  undefined, will crearte new one.
*/
export async function initUI(_printer, _limiter) {
  setLogInfo(info);
  setLogCommands(commandsHandler.log);
  setLogPrinterState(printerStateHandler);
  
  //TEST -- remove this
  // console.error(
  //   MarlinLineParserResultPosition.parse(
  //     "X:10.00 Y:10.00 Z:30.00 E:0.00 Count X:1040 Y:1000 Z:12000"
  //   )
  // );
  
  if (!_printer) {
    logError("FATAL error: no liveprinter object in gui init()!");
    return;
  } else {
    printer = _printer;
  }
  
  
  if (!_limiter) throw new Error("No Limiter for GUI!");
  
  ///--------------------------------------
  ///---------setup GUI--------------------
  ///--------------------------------------
  
  /**
   * insert quick help after examples list
   */
  initHelpModal('examples-dropdown');


  document.getElementById("connect-btn").addEventListener("click", async function (e) {
    e.preventDefault();
    
    info("OPENING SERIAL PORT");
    
    const notCalledFromCode = !(
      e.namespace !== undefined && e.namespace === ""
    );
    if (notCalledFromCode) {
      const me = e.currentTarget;
      const connected = me.classList.contains("active"); // because it becomes active *after* a push
      
      // try disconnect
      if (connected) {
        const selectedPort = document.querySelector("#serial-ports-list .active");
        if (selectedPort) {
          info("Closing open port " + selectedPort.textContent);
          
          const response = await closeSerialPort();
          
          // returns true ifsuccessful or false otherwise
          if (response) {
            me.textContent = "connect";
            me.classList.remove("active");
            document.querySelectorAll("#serial-ports-list > li > a").forEach(btn => btn.classList.remove("active", "disabled"));
            document.querySelectorAll("#baudrates-list > button").forEach(btn => btn.classList.remove("disabled"));
            
            // this is how we check if connected!
            document.getElementById("header")?.classList.remove("blinkgreen");
          } else {
            errorHandler.error({
              time: Date.now(),
              event: "could not disconnect serial port",
            });
          }
        }
      } else {
        const selectedPort = document.querySelector("#serial-ports-list .active");
        if (!selectedPort) {
          me.classList.remove("active");
        } else {
          info("Opening port " + selectedPort.textContent);
          me.textContent = "disconnect";
          selectedPort.click(); // trigger connection using active port
          // add gcodeHandler
          lp.addGCodeListener({
            gcodeEvent: sendAndHandleGCode,
          });
          
          const vpBtn = document.getElementById('vp-btn');
          const newVpBtn = vpBtn.cloneNode(true);
          vpBtn.parentNode.replaceChild(newVpBtn, vpBtn);
          newVpBtn.classList.add('disabled');
        }
      }
    }
  });
  
  //
  // redirect error to browser GUI
  //
  window.addEventListener("error", function (evt) {
    //Logger.debug("jQuery error event:");
    //Logger.debug(evt);
    
    const e = evt.error; // get the javascript event
    //Logger.debug("original event:", e);
    guiError(e);
  });
  
  // temperature buttons
  document.getElementById("basic-addon-tempbed").addEventListener("click", async () =>
    printer.bed(parseFloat(document.querySelector("input[name=tempbed]").value))
  );
  document.getElementById("basic-addon-temphot").addEventListener("click", async () =>
    printer.temp(parseFloat(document.querySelector("input[name=temphot]").value))
  );

  document.getElementById("basic-addon-angle").addEventListener("click", () =>
    printer.turnto(parseFloat(document.querySelector("input[name=angle]").value))
  );

  document.getElementById("basic-addon-retract").addEventListener(
    "click",
    () =>
      (printer.currentRetraction = parseFloat(
      document.querySelector("input[name=retract]").value
    ))
  );

  document.getElementById("refresh-serial-ports-btn").addEventListener("click", async function (e) {
    e.preventDefault();
    if (!this.working) {
      this.working = true;
      info("Getting serial ports...");
    
      try {
        const portsList = await getSerialPorts();
        await portsListHandler(portsList);
      } catch (err) {
        guiError(err);
      }
    
      this.working = false;
    }
    return true;
  });

  // disable form reloading on code compile
  document.querySelectorAll("form").forEach(form => form.addEventListener('submit', e => e.preventDefault()));

  //hide tab-panel after codeMirror rendering (by removing the extra 'active' class)
  document.querySelectorAll(".hideAfterLoad").forEach(el => {
    el.classList.remove("active");
  });

  const vpb = document.getElementById('vp-btn');

  vpb.addEventListener("click",  async (event) => {
    const hdr = document.getElementById("header");
    if (!hdr.classList.contains("blinkgreen")) {
      hdr.classList.add("blinkgreen");
      info('INIT SOUND');
      try
      { 
        await initSound(printer);
      }
      catch(err) {
        logError(`Error initializing sound: ${err}`);
      }
      vpb.dataset.running = true;
      runCode('delay(true);'); // set delay
      vpb.innerHTML = 'STOP VIRTUAL SERVER';
    } 
    else 
      {
      hdr.classList.remove("blinkgreen");
      vpb.innerHTML = 'START VIRTUAL SERVER';
      vpb.dataset.running = false;
    }
  });

  onPosition(async (v) => moveHandler(v));
  onCodeDone(async (v) => {
    const dateStr = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).format(new Date(Date.now()));
    
    let msg;
    if (v.queued === 0) {
      msg = `done: no code running [${dateStr}]`;
    } else {
      msg = `done: other code blocks in queue: ${v.queued} [${dateStr}]`;
    }
    const workingTab = document.getElementById("working-tab");
    if (workingTab) {
      workingTab.innerHTML = msg;
      blinkElem(workingTab);
    }
    //loginfo(`done: code blocks running: ${v.queued}`);
  });
  onCodeQueued(async (v) => {
    const dateStr = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).format(new Date(Date.now()));
    
    const workingTab = document.getElementById("working-tab");
    if (workingTab) {
      workingTab.innerHTML = `queued: code block running (queued: ${v.queued}) [${dateStr}]`;
    }
    //loginfo(`queued: code blocks running: ${v.queued}`);
  });

  // get ports!
  if (!isVirtualMode())
  {
    document.getElementById("refresh-serial-ports-btn")?.click();
  }
}

/**
* Handles logging of a GCode response from the server
* @param {Object} res
* @returns {Boolean} whether handled or not
* @alias comms:handleGCodeResponse
*/
export async function handleGCodeResponse(result) {
  let handled = result != null;
  
  if (result !== undefined) {
    if (!Array.isArray(result)) {
      result = [result];
    }
    for (const rr of result) {
      //logInfo('gcode reply:' + rr);
      // check for error
      if (rr.toLowerCase().match(/error/m)) {
        logError(rr);
        handled = false;
        break;
      }
      
      // try move handler
      const positionResult = MarlinLineParserResultPosition.parse(rr);
      const tempResult = MarlinLineParserResultTemperature.parse(rr);
      
      if (tempResult != null) {
        tempHandler(tempResult);
        debug("temperature event handled");
        handled = true;
      }
      if (positionResult != null) {
        moveHandler(positionResult);
        
        // move/position update handled
        await positionEvent(positionResult);
        handled = true;
      }
      
      if (!handled) {
        if (rr.match(/ok/i)) {
          await okEvent(rr);
        } else {
          debug("unhandled gcode response: " + rr);
          info(`Unexpected printer response:\n${rr}`);
          await otherEvent(rr);
        }
      }
    }
  }
  
  return handled;
}
