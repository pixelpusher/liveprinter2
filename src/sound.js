import { PulseOscillator, MonoSynth } from "tone";

const oscXYZ = {
    x: new PulseOscillator(0, 0.15).toDestination(),
    y: new PulseOscillator(0, 0.15).toDestination(),
    z: new PulseOscillator(0, 0.15).toDestination(),
  };


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
      attack: 0.01
  }
}).toDestination();

const synthZ = new MonoSynth({
  oscillator: {
      type: "pulse"
  },
  envelope: {
      attack: 0.01
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
