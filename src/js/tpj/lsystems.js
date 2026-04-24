import { updateGUI } from "../liveprinter.ui";

/**
* Iterates the L-system based on the axiom and rules.
* @param {string} axiom - The starting string
* @param {object} rules - The production rules
* @param {number} iterations - How many times to expand the string
* @returns {string} The final L-system instruction string
*/
export const iterateLSystem = function(instructions, rules, iterations = 1) {
  let currentString = instructions;
  
  for (let i = 0; i < iterations; i++) {
    let nextString = "";
    for (let char of currentString) {
      // Replace the character if a rule exists, otherwise keep it
      nextString += rules[char] || char;
    }
    currentString = nextString;
  }
  
  return currentString;
};

export const makeCommands = function (axiom, rules, iterations) 
{
    const instructions = iterateLSystem(axiom, rules, iterations);
    return instructions.match(/[FA+-]/g).values(); // Extract only the command characters and return an iterator
}


/**
 * Draws the L-system instructions by iterating through the commands and executing the corresponding printer actions. It uses the melody to determine the speed of drawing and waiting times.
 * @param {object} params - The parameters for drawing
 * @param {Iterator} params.commandsIter - An Array iterator over the L-system commands (use Array.values() on the commands array)
 * @param {seq} params.melody - A sequence of musical notes and durations [(note, duration), ...] that determines the speed and timing of drawing
 * @param {object} params.angleMap - A mapping of command characters (+-)to turn angles
 * @returns {Promise<void>} A promise that resolves when the command is executed
 * @note printer is set in evalScope in liveprinter.editor.js
 */
export const drawCommands = async function ({commandsIter, melody, angleMap}) {

  const nextCommand = commandsIter.next();
  if (nextCommand.done) {
    info('Finished all commands');
    
    printer.bail();

    return;
  }

  let [note, duration ] = melody.next();

  switch (nextCommand.value) {
    case 'F':
    case 'A':
      //info('F or A');
    if (note == "-" || note == "0") {
      await printer.wait(duration);
      // console.log("done waiting");
      updateGUI();
      return;
    }
    
    printer.speed(note);
    
    await printer.drawtime(duration);
    updateGUI();
    break;
    
    case '+':
    case '-':
      //info('+ or_');
    if (angleMap[nextCommand.value] !== undefined) {
      // Apply bespoke angles mapped to this character
      await printer.turn(angleMap[nextCommand.value]);
    }
    break;
  }
};
