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
global nextPoint = makeIterator(preset);
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
 
# prime | speed 80 | mov2 nextPoint() | unretract | wait 20 | fan 10
  
lp.mainloop(async () => {
  const gridPoint = nextPoint();
   console.log('running');
  if (gridPoint.z <= preset.height) {
    try {
       console.log('drawing');
      // next note if uncommented
      # m2s next() | to gridPoint | draw 
      
    } catch (err) {
      console.error(\`draw to error vals: \${gridPoint}\`);
      console.error(\`draw to error: \${err}\`);
    }
  }
});
 
log('CHALICE OF NOISE')  
  
  
// TO HERE
//////////////////////////////////////////////////////////////////////
////////////////////////// END ///////////////////////////////////////
////////////////////////// MAIN //////////////////////////////////////
////////////////////////// LOOP //////////////////////////////////////
////////////////////////// !!!! //////////////////////////////////////
//////////////////////////////////////////////////////////////////////
 `;

export const loops = `
 
 
# bpm 150

global bail = false;
  
# moveto x:(lp.cx-50) y:lp.cy z:0.2 speed:50 
  
lp.lh = 0.25;
  
let notesCtr = 0;
let durCtr = 0;
  
let next = function (n=1) {
  let notes = ['c4', 'd5', 'e5', 'g4', 'a4', 'd6', 'e4', 'a4'];  
  notesCtr = (notesCtr + 1) % notes.length;
  return notes[notesCtr];
}  
  
let dur = function (n=1) {
  let durs = ['1/4b', '2b', '1b', '1/2b',
             '1/2b', '1/4b', '1/2b', '1/4b'];  
  durCtr = (durCtr + 1) % durs.length;
  return durs[durCtr];
}  
 
let c = 0;    
 
repeat(128, async ()=> {
  # speed next() | drawtime dur() | turn (360/12) | elev (Math.PI/88)
//  await (() => new Promise((resolve) => setTimeout(resolve, delaytime)))();
  console.log(\`\${c++}\`);
  if (bail) return;
})
  
//--------------------------------------------------------------------------
  
repeat(64, async ()=> {
  // make the denominator of the 360/x not evenly divisible by 8 (size of notes and durations above )
  # speed next() | traveltime dur() | turn (360/6) | elev (Math.PI/48)
//  await (() => new Promise((resolve) => setTimeout(resolve, delaytime)))();
  console.log(\`\${c++}\`);
  if (bail) return;
})
`;


export const shapesmix = `
  
 // print at 200 for white filament, 215 for multi
setZoom(0.1) 
setViewX(0);
setViewY(0.4);
  
 
# start
 
 
# temp 220 | bed 60 | fan 0
 
# interval '1/4b' // also try 1/16!
 
// -------------------------------------------------------
// ---------------GEN6 M-like presets---------------------
// -------------------------------------------------------
  
// fast fun tiny with 2 rows, 8 gets medium size and crazy
global preset = presets.genP6({
  printer:lp,
  loop: false,
  amtx: 0.08,
  amty: 0.06,
  minz: 0.2,
  grids: { cols: 4, rows: 8 },
  bpm: 125,
  t: "1b",
  rowNote:'d4',
  colNote: 'd4',
  beatHeight: "5/2b",
  layerThick: 0.2,
});
   
 
// ---------------====START GRID====--------------------
 
 
global it = iterator(preset);
 
it.notes = ['c4', 'd5', 'g4','c4', 'd3', 'g4','c4', 'd4', 'g4'];
 
//it.notes = ['c2']
 
// notes = ['d6','e6','f6']
 
 
//notes = ['b5','a5','c6','b5','g5'];
  
 
//******** RUN THE MAIN LOOP************************************
 
# fan 50
  
// copy from here
 
# prime | speed 80 | mov2 it.next() | unretract | wait 20 | fan 10
  
lp.mainloop(async () => {
  const next = it.next();
 
  if (next.z <= preset.height) {
    try {
      // next note if uncommented
      # to next | draw 
      
    } catch (err) {
      console.error(\`draw to error vals: \${next}\`);
      console.error(\`draw to error: \${err}\`);
    }
  } else {
    log ('bail');
 
 
    # bail
 
 
    log('CHALICE OF NOISE')  
 
 
  }
});
 
 
  
// TO HERE
//////////////////////////////////////////////////////////////////////
////////////////////////// END ///////////////////////////////////////
////////////////////////// MAIN //////////////////////////////////////
////////////////////////// LOOP //////////////////////////////////////
////////////////////////// !!!! //////////////////////////////////////
//////////////////////////////////////////////////////////////////////
  `; 