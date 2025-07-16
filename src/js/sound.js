import { PulseOscillator, MonoSynth, start } from "tone";
import { Logger } from "liveprinter-utils";
import { e } from "mathjs";

let started = false;

  const synthX = new MonoSynth({
    oscillator: {
        type: "pulse"
    },
    envelope: {
        attack: 0.01
    }
}).toDestination();

const synthY = new MonoSynth({
  oscillator: {
      type: "pwm"
  },
  envelope: {
      attack: 0
  }
}).toDestination();

const synthZ = new MonoSynth({
  oscillator: {
      type: "pulse"
  },
  envelope: {
      attack: 0
  }
}).toDestination();

const synthE = new MonoSynth({
  oscillator: {
      type: "pulse"
  },
  envelope: {
      attack: 0
  }
}).toDestination();

export function playNotes(noteFreqs, duration) {
//  Logger.info(`note freqs: ${JSON.stringify(noteFreqs)} for ${duration}`);
  
  // ramp to "C2" over 2 seconds
  //osc.frequency.rampTo("C2", 2);
  // start the oscillator for 2 seconds
  
  synthX.triggerAttack(noteFreqs.x, `+${duration / 1000}`, 0.2);
  synthY.triggerAttack(noteFreqs.y, `+${duration / 1000}`, 0.2);
  synthZ.triggerAttack(noteFreqs.z, `+${duration / 1000}`, 0.2);
  if (noteFreqs.e) synthE.triggerAttack(noteFreqs.e, `+${duration / 1000}`, 0.2);
}

export function stopNotes() {
  synthX.triggerRelease();
  synthY.triggerRelease();
  synthZ.triggerRelease();
  synthE.triggerRelease();
}

const eventsListener = {
    printEvent: async ({
      type,
      newPosition,
      oldPosition,
      speed,
      moveTime,
      totalMoveTime,
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

      if (type === "wait-start" || type === "retract") {
        stopNotes();
        return;
      }

      if (type === "wait-end" ||
        type === "draw-end" ||
        type === "travel-end" ||
        type === "traveltime-end" ||
        type === "drawtime-end" ||
        type === "unretract"
      ) {
        return;
      }
      if (!newPosition || !oldPosition) return;

      const speedPerAxisMs = {
        x: (newPosition.x - oldPosition.x) / moveTime,
        y: (newPosition.y - oldPosition.y) / moveTime,
        z: (newPosition.z - oldPosition.z) / moveTime,
        e: (newPosition.e - oldPosition.e) / moveTime,
      };
      const speedScale = lp.speedScale();
      const noteFreqs = {
        x: 1000 * Math.abs(speedPerAxisMs.x) * speedScale.x,
        y: 1000 * Math.abs(speedPerAxisMs.y) * speedScale.y,
        z: 1000 * Math.abs(speedPerAxisMs.z) * speedScale.z,
        e: 1000 * Math.abs(speedPerAxisMs.e) * speedScale.e,
      };

      playNotes(noteFreqs, moveTime);

      return;
    }
  };

export async function initSound(printer) { 
   // set up print events feedback
  if (started) return;
  Logger.info('SOUND STARTED');
  printer.addPrintListener(eventsListener); 
  return start();
}

export function stopSound(printer) {
  printer.removePrintListener(eventsListener);
}

// const oscXYZ = {
//   x: new PulseOscillator(0, 0.15).toDestination(),
//   y: new PulseOscillator(0, 0.15).toDestination(),
//   z: new PulseOscillator(0, 0.15).toDestination(),
// };



// oscXYZ.x.volume.value = -6;
// oscXYZ.y.volume.value = -6;
// oscXYZ.z.volume.value = -6;

// export function playNotes(noteFreqs, duration) {

//   oscXYZ.x.stop().frequency.value = noteFreqs.x;
//   oscXYZ.x.start().stop(`+${duration / 1000}`);
  
//   oscXYZ.y.stop();
//   oscXYZ.y.frequency.value = noteFreqs.y;
//   oscXYZ.y.start()
//     .stop(`+${duration / 1000}`);

//   oscXYZ.z
//     .stop().frequency.value = noteFreqs.z;
//   oscXYZ.z
//     .start()
//     .stop(`+${duration / 1000}`);
// }
