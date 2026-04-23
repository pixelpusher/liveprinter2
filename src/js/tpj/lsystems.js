
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
    return instructions.match(/[FA+-]/g);
}



export const drawCommand = async function ({command, note, angleMap, duration, lp}) {
  switch (command) {
    case 'F':
    case 'A':
      //info(`F or A ${note} : ${duration}`);
    if (note == "-" || note == "0") {
      await lp.wait(duration);
      // console.log("done waiting");
      return;
    }
    
    lp.speed(note);
    
    await lp.drawtime(duration);
    break;
    
    case '+':
    case '-':
      //info('+ or -');
    if (angleMap[command] !== undefined) {
      // Apply bespoke angles mapped to this character
      await lp.turn(angleMap[command]);
    }
    break;
  }
};