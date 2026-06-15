/**
 * Utility functions for editor initialization and storage management.
 * @module EditorUtils
 */

/**
 * Get date string for logging purposes
 * @returns {string} Formatted date and time string
 */
export function getDateString() {
  const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3
  });
  return dateTimeFormat.format(new Date()) + "\n";
}

/**
 * Local Storage for saving/loading documents.
 * Default behaviour is loading the last edited session.
 * @param {String} type type (global key in window object) for storage object
 * @returns {Boolean} true or false, if storage is available
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
 */
export function storageAvailable(type) {
  try {
    const storage = window[type],
    x = "__storage_test__";
    storage.setItem(x, x);
    storage.removeItem(x);
    return true;
  } catch (e) {
    return (
      e instanceof DOMException &&
      // everything except Firefox
      (e.code === 22 ||
        // Firefox
        e.code === 1014 ||
        // test name field too, because code might not be present
        // everything except Firefox
        e.name === "QuotaExceededError" ||
        // Firefox
        e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
        // acknowledge QuotaExceededError only if there's something already stored
        storage.length !== 0
      );
    }
  }
