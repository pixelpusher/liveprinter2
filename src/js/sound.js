import { MonoSynth, start } from "tone";
import { Logger } from "liveprinter-utils";

let started = false;

export let droneMode = true; // whether the sound just continues like a drone or stops like a real printer

const synthXTriangle = new MonoSynth({
  oscillator: {
    type: "sine"
  },
  envelope: {
    attack: 0.02
  }
}).toDestination();

const synthXSawtooth = new MonoSynth({
  oscillator: {
    type: "sawtooth"
  },
  envelope: {
    attack: 0.01
  }
}).toDestination();

const synthYTriangle = new MonoSynth({
  oscillator: {
    type: "sine"
  },
  envelope: {
    attack: 0.02
  }
}).toDestination();

const synthYSawtooth = new MonoSynth({
  oscillator: {
    type: "sawtooth"
  },
  envelope: {
    attack: 0.01
  }
}).toDestination();

const synthZTriangle = new MonoSynth({
  oscillator: {
    type: "triangle"
  },
  envelope: {
    attack: 0.01
  }
}).toDestination();

const synthZSawtooth = new MonoSynth({
  oscillator: {
    type: "sawtooth"
  },
  envelope: {
    attack: 0.01
  }
}).toDestination();

const synthETriangle = new MonoSynth({
  oscillator: {
    type: "triangle"
  },
  envelope: {
    attack: 0.2,
    release: 0.4
  }
}).toDestination();

const synthESawtooth = new MonoSynth({
  oscillator: {
    type: "sawtooth"
  },
  envelope: {
    attack: 0.2,
    release: 0.4
  }
}).toDestination();

export function playNotes(noteFreqs, duration) {
Logger.debug(`note freqs: ${JSON.stringify(noteFreqs)} for ${duration}`);
  
  // ramp to "C2" over 2 seconds
  //osc.frequency.rampTo("C2", 2);
  // start the oscillator for 2 seconds

  const dur = duration / 1000;
  synthXTriangle.triggerAttackRelease(noteFreqs.x, dur, undefined, 0.05);
  synthXSawtooth.triggerAttackRelease(noteFreqs.x, dur, undefined, 0.125);
  synthYTriangle.triggerAttackRelease(noteFreqs.y, dur, undefined, 0.05);
  synthYSawtooth.triggerAttackRelease(noteFreqs.y, dur, undefined, 0.125);
  synthZTriangle.triggerAttackRelease(noteFreqs.z, dur, undefined, 0.05);
  synthZSawtooth.triggerAttackRelease(noteFreqs.z, dur, undefined, 0.125);
  if (noteFreqs.e) {
    synthETriangle.triggerAttackRelease(noteFreqs.e * 4, dur, undefined, 0.075);
    synthESawtooth.triggerAttackRelease(noteFreqs.e * 4, dur, undefined, 0.125);
  }
}

export function stopNotes() {
  synthXTriangle.triggerRelease();
  synthXSawtooth.triggerRelease();
  synthYTriangle.triggerRelease();
  synthYSawtooth.triggerRelease();
  synthZTriangle.triggerRelease();
  synthZSawtooth.triggerRelease();
  synthETriangle.triggerRelease();
  synthESawtooth.triggerRelease();
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

      if (
        type === "wait-start" || 
        type === "retract" || 
        type === "wait-end" ||
        type === "draw-end" ||
        type === "extrude-end" ||
        type === "travel-end" ||
        type === "traveltime-end" ||
        type === "drawtime-end" ||
        type === "unretract" 
      ) {
        if (!droneMode) stopNotes();
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
