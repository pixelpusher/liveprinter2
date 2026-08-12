import { MonoSynth, start, Time, now } from "tone";
import { Logger } from "liveprinter-utils";

let started = false;

let lpInstance; // Declare lpInstance here
let droneMode = false; 
let droneActive = false;

export function setDroneMode(mode) {
  droneMode = mode;
  if (!droneMode) stopNotes(); // Stop any active drones when switching off
}

const synths = {};
const channels = ['x', 'y', 'z', 'e'];

channels.forEach(channel => {
  synths[channel] = {
    sine: new MonoSynth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.002, release: 0.05 }
    }).toDestination(),
    sawtooth: new MonoSynth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.002, release: 0.05 }
    }).toDestination()
  };
});

// Default attack/release ratios relative to the calculated duration
const ATTACK_RATIO = 0.1; // 10% of the duration
const RELEASE_RATIO = 0.05; // 5% of the duration
/**
* Sets the attack time for all synths based on a musical duration string and BPM.
* The actual attack time will be a fraction of the calculated duration.
* @param {string} durationInMS - duration in ms
* @param {number} bpm - Beats per minute.
*/
export function setSynthAttack(durationInMS) {
  const newAttack = durationInMS / 1000 * ATTACK_RATIO;
  for (const channel of channels) {
    synths[channel].sine.envelope.attack = newAttack * 1.05;
    synths[channel].sawtooth.envelope.attack = newAttack / 2;
  }
}

/**
* Sets the attack time for all synths based on a musical duration string and BPM.
* The actual attack time will be a fraction of the calculated duration.
* @param {string} durationInMS - duration in ms
* @param {number} bpm - Beats per minute.
*/
export function setSynthRelease(durationInMS) {
  const newRelease = durationInMS / 1000 * ATTACK_RATIO;
  for (const channel of channels) {
    synths[channel].sine.envelope.release = newRelease;
    synths[channel].sawtooth.envelope.release = newRelease;
  }
}

/**
* Play notes for x,y,z,e synths of specific duration
* @param {Object} noteFreqs {x,y,z,e} 
* @param {Number} duration In ms
*/
export function playNotes(noteFreqs, duration) {
  Logger.debug(`note freqs: ${JSON.stringify(noteFreqs)} for ${duration}`);
  
  // ramp to "C2" over 2 seconds
  //osc.frequency.rampTo("C2", 2);
  // start the oscillator for 2 seconds
  
  const dur = duration / 1000;
  
  if (droneMode) {
    if (!droneActive) {
      for (const channel of channels) {
        if (noteFreqs[channel]) {
          synths[channel].sine.triggerAttack(noteFreqs[channel], now(), 0.05);
          synths[channel].sawtooth.triggerAttack(noteFreqs[channel], now(), 0.125);
        }
      }
      droneActive = true;
    } else {
      // Voices are already active, just change their frequencies
      for (const channel of channels) {
        if (noteFreqs[channel]) {
          synths[channel].sine.setNote(noteFreqs[channel]);
          synths[channel].sawtooth.setNote(noteFreqs[channel]);
        }
      }
    }
  } else {
    for (const channel of channels) {
      if (noteFreqs[channel]) {
        synths[channel].sine.triggerAttackRelease(noteFreqs[channel], dur, undefined, 0.05);
        synths[channel].sawtooth.triggerAttackRelease(noteFreqs[channel], dur, undefined, 0.125);
      }
    }
  }
}
/**
* Stop all notes from playing immediately
*/
export function stopNotes() {
  for (const channel of channels) {
    synths[channel].sine.triggerRelease();
    synths[channel].sawtooth.triggerRelease();
  }
  droneActive = false;
}

let printMode = ''; // will handle whether drawing or traveling or extruding

/**
* Handle movement and printing events from LivePrinter
*/
const eventsListener = {
  printEvent: async ({
    type,
    newPosition,
    oldPosition,
    speed,
    moveTime,
    totalMoveTime,
    start, end, // drawtime and traveltime
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
    
/*
it's complex. If the event is draw-start, drawtime-start, or travel-start or traveltime-start 
then set drone mode for a longer operation. There will be subsequent calls to extrude-start and 
extrude-end and move-start and move-end and they should set the synth frequencies but stay in 
drone mode until the travel or move operation is done. However, there can also be an extrude or
move operation on their own, outside of the draw or travel ones, and those should start and stop
the synth without entering drone mode. So, long movements broken into smaller pieces, or more 
manual movements, respectively.
*/

    // Long-running operations that should enable drone mode
    if (["travel-start", "draw-start", "traveltime-start", "drawtime-start"].includes(type)) {
      droneMode = true;
      printMode = type;
      // No notes to play yet, just setting the mode.
      return;
    }
    
    // End of a long-running operation, turn off drone mode and stop sounds.
    if (printMode !== '' &&
      (type === "draw-end" ||
        type === "travel-end" ||
        type === "traveltime-end" ||
        type === "drawtime-end")) {
      stopNotes();
      droneMode = false;
      printMode = '';
      return;
    }

    // Handle individual move/extrude segments
    if (type === "extrude-start" || type === "move-start") {
      if (!newPosition || !oldPosition) return;
      
      const speedPerAxisMs = {
        x: (newPosition.x - oldPosition.x) / moveTime,
        y: (newPosition.y - oldPosition.y) / moveTime,
        z: (newPosition.z - oldPosition.z) / moveTime,
        e: (newPosition.e - oldPosition.e) / moveTime,
      };
    const speedScale = lpInstance.speedScale(); // BUG: lp is not defined here!
      const noteFreqs = {
        x: 1000 * Math.abs(speedPerAxisMs.x) * speedScale.x,
        y: 1000 * Math.abs(speedPerAxisMs.y) * speedScale.y,
        z: 1000 * Math.abs(speedPerAxisMs.z) * speedScale.z,
        e: 1000 * Math.abs(speedPerAxisMs.e) * speedScale.e,
      };

      playNotes(noteFreqs, moveTime);
      // If we aren't in a long operation, set printMode for this segment
      if (printMode === '') printMode = type;
      return;
    }

    // End of a short/manual move segment
    if (type === "extrude-end" || type === "move-end") {
      // Only stop notes if we are NOT in a long-running drone operation
      if (!droneMode) {
        stopNotes();
      }
      // If this was a manual move, clear the printMode
      if (printMode === 'extrude-start' || printMode === 'move-start') {
        printMode = '';
      }
      return;
    }

    if (type === "wait-start" || 
        type === "retract" || 
        type === "wait-end" ||
        type === "unretract") {
      // nothing
    }    
    
    return;
  }
};

export async function initSound(printer) { 
  // set up print events feedback
  if (started) return;
  Logger.info('SOUND STARTED');
  lpInstance = printer; // Assign the printer instance
  printer.addPrintListener(eventsListener); 
  return start();
}

/**
* Stop the sound and remove listener
* @param {LivePrinter} printer 
*/
export function stopSound(printer) {
  printer.removePrintListener(eventsListener);
}
