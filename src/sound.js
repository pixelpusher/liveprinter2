import { PulseOscillator, MonoSynth } from "tone";

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

export function playNotes(noteFreqs, duration) {
//  Logger.info(`note freqs: ${JSON.stringify(noteFreqs)} for ${duration}`);
  
  // ramp to "C2" over 2 seconds
  //osc.frequency.rampTo("C2", 2);
  // start the oscillator for 2 seconds
  
  synthX.triggerAttack(noteFreqs.x, `+${duration / 1000}`, 0.2);
  synthY.triggerAttack(noteFreqs.y, `+${duration / 1000}`, 0.2);
  synthZ.triggerAttack(noteFreqs.z, `+${duration / 1000}`, 0.2);
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
