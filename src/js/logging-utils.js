//LOGGIN

import { Logger } from "liveprinter-utils";

//------------------------------------------------
// feedback to the GUI or logger
//--------------------------------------------

// TODO: encapsulate this into a single call so it can be sent to a single listener as {type, data}
// instead of this mess of functions

export let debug = (v)=>Logger.debug(v); // to be overridden by a real debug when loaded
export const setDebug = f => debug=f; 

export let doError = (v)=>Logger.error(v); // to be overridden by a real debug when loaded
export const setDoError = f => doError=f; 

export let logError = (v)=>Logger.error(v); // to be overridden by a real debug when loaded
export const setLogError = f => logError=f; 

export let logInfo = (v)=>Logger.info(v); // to be overridden by a real debug when loaded
export const setLogInfo = f => logInfo=f; 

// was liveprinterUI.commandsHandler.log
export let logCommands = (v)=>Logger.info(v); // to be overridden by a real debug when loaded
export const setLogCommands = f => logCommands=f; 

//liveprinterUI.printerStateHandler
export let logPrinterState = (v)=>Logger.info(v); // to be overridden by a real debug when loaded
export const setLogPrinterState = f => logPrinterState=f; 
