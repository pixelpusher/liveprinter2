//LOGGIN

import { Logger } from "liveprinter-utils";

//------------------------------------------------
// feedback to the GUI or logger
//--------------------------------------------

// TODO: encapsulate this into a single call so it can be sent to a single listener as {type, data}
// instead of this mess of functions

const loggers = {
  debug: (v) => Logger.debug(v),
  doError: (v) => Logger.error(v),
  logError: (v) => Logger.error(v),
  logInfo: (v) => Logger.info(v),
  logCommands: (v) => Logger.info(v),
  logPrinterState: (v) => Logger.info(v),
};

export const setDebug = (f) => (loggers.debug = f);
export const setDoError = (f) => (loggers.doError = f);
export const setLogError = (f) => (loggers.logError = f);
export const setLogInfo = (f) => (loggers.logInfo = f);
export const setLogCommands = (f) => (loggers.logCommands = f);
export const setLogPrinterState = (f) => (loggers.logPrinterState = f);

export const debug = (v) => loggers.debug(v);
export const doError = (v) => loggers.doError(v);
export const logError = (v) => loggers.logError(v);
export const logInfo = (v) => loggers.logInfo(v);
export const logCommands = (v) => loggers.logCommands(v);
export const logPrinterState = (v) => loggers.logPrinterState(v);
