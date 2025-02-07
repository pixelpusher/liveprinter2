export const initialCode = 
`# start | temp 220 | bed 68 | bpm 120 | interval '1b' | m2s 'C5' 

# mov2 x:lp.cx y:lp.cy z:0.2 speed:80

# turn 80 | drawtime '2b' | speed 40 | draw


let l=4;

while (l--)
{
let i=4;
console.log(\`\${l}:\${i}\`);
  while (i--) {
  # speed "C7" | drawtime "1b" | turn 90
  };
  # up 1
}
`;

export const ual_9_6_24 = `
global presets = gridlib.presets;

global bail = false;

// helpful
lp.stop = async () => { log("STOPPING LOOP"); bail = true; await lp.retract(); lp.tsp(50); await lp.up(5) };
lp.prime = async () => {
	# mov2 x:lp.minx+15 y:lp.miny+40 z:80 speed:80 | unretract | ext e:14 speed:2 | retract | wait 100
};


# start | bed 68 | temp 215
  

// print at 200 for white filament, 215 for multi


// -------------------------------------------------------
// ---------------GEN6 M-like presets---------------------
// -------------------------------------------------------
  
// fast fun tiny with 2 rows, 8 gets medium size and crazy
global preset = presets.genP6({
  printer:lp,
  loop: false,
  amtx: 0.08,
  amty: 0.06,
  minz: 0.12,
  grids: { cols: 4, rows: 8 },
  bpm: 125,
  t: "1/2b",
  rowNote:'d4',
  colNote: 'd4',
  beatHeight: "5/2b",
  layerThick: 0.12,
});

// ---------------====START GRID====--------------------
global nextPoint = gridlib.makeIterator(preset);
// ---------------==================--------------------

global notes = ['c4', 'd2', 'g4','c4', 'd3', 'g4','c4', 'd4', 'g4'];

// START NOTES ---------------------------------

global pushnote = function(val, times=1) {
  for (let i=0; i < times; i++)
    {
      if (Array.isArray(val))
        notes.push(...val);
      else
      	notes.push(val);
    }
}

global notesCtr = 0;

global next = function (n=1) {
  notesCtr = (notesCtr + 1) % notes.length;
  return notes[notesCtr];
};

// END NOTES ------------------------------

//******** RUN THE MAIN LOOP************************************

# fan 50
  
// copy from here

global delaytime = 100;
global bail = false;
global paused = false;

# prime | speed 80 | mov2 nextPoint() | unretract | wait 20 | fan 10
  
while (!bail) {

  if (window.paused) {
    await (() => new Promise((resolve) => setTimeout(resolve, delaytime)))(); // wait 50 ms
    continue; // skip rest
  }

  const gridPoint = nextPoint();

  if (gridPoint.z <= preset.height) {
    try {
      // next note if uncommented
      lp.m2s(next());
      
      # to gridPoint | draw 
      
    } catch (err) {
      console.error(\`draw to error vals: \${gridPoint}\`);
      console.error(\`draw to error: \${err}\`);
    }
  } else {
    // DONE!
    //bail = true;
    log("***LOOP FINISHED***");
    bail = true;
    # stop 
  }
}
   
log('CHALICE OF NOISE')  
  
  
// TO HERE
//////////////////////////////////////////////////////////////////////
////////////////////////// END ///////////////////////////////////////
////////////////////////// MAIN //////////////////////////////////////
////////////////////////// LOOP //////////////////////////////////////
////////////////////////// !!!! //////////////////////////////////////
//////////////////////////////////////////////////////////////////////

`;