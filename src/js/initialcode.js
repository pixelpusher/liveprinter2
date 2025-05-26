export const initialCode = `# start | temp 220 | bed 68 | bpm 120 | interval '1b' | m2s 'C5' 

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
    else {
    
    # bail

    return;

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
 # moveto x:(lp.cx-50) y:lp.cy z:0.2 speed:50 
  
lp.lh = 0.25;
  

global notes = ['c4', 'd5', 'e5', 'g4', 'a4', 'd6', 'e4', 'a4'];  
  
global durs = ['1/4b', '2b', '1b', '1/2b',
             '1/2b', '1/4b', '1/2b', '1/4b'];  
 
global note = makenext(notes);
global dur = makenext(durs);
             

setarray(notes, ['d4']);

setarray(durs, ['1/2b']);

  // make the denominator of the 360/x not evenly divisible by 8 (size of notes and durations above )
// 6 is interesting too
global angle = 360/12;

lp.mainloop(async ()=> {
  # speed note() | drawtime dur() | turn angle | elev (Math.PI/44) 
});
 `;
  
export const shapesmix = `//---------------------------
// SHAPES MIX
//---------------------------
   
setZoom(0.2);
setViewX(0.27);
setViewY(0.1);
closeFactor(110);
 
//vizevents.delay = true;  
 
# interval '1b' 
 
global printer = lp;
global sides = 6;
global points = sides;
global circumference = '16b';
global cx = printer.cx;
global cy = printer.cy;
global minz = 0.11;
global layerThick = 0.13;
global bpm = 133;
global note = 'g4';
 
  
// fast fun tiny with 2 rows, 8 gets medium size and crazy
global presetG6 = presets.genP6({
  printer,
  loop: false,
  amtx: 0.2,
  amty: 0.23,
  minz: 0.12,
  grids: { cols: 4, rows: 8 },
  bpm,
  t: "1/2b",
  rowNote:'d4',
  colNote: 'd4',
  beatHeight: "4b",
  layerThick,
});
 
 
global presetPoly2 = presets.genPoly2({
  printer,
  sides,
  circumference,
  cx,
  cy,
  minz,
  layerThick,
  amtx: 0.35,
  amtr: 0.25,
  beatHeight: "6b",
  note,
  bpm,
});
 
global presetPoly1 = presets.genPoly1({
  printer,
  sides,
  circumference:'20b',
  cx,
  cy,
  minz:0,
  layerThick,
  amtx: 0.2,
  amtr: 0.1,
  beatHeight: "6b",
  note,
  bpm,
});
 
 
const h = lp.n2mm(note, '4b', bpm);
const d = points*lp.n2mm(note, '1/4b', bpm);
 
global presetGio = presets.makeGiacometti_1({
  printer,
  points,
  layerThick,
  cx: cx-d*1/2,
  cy,
  note,
  t: "1/4b",
  bpm,
  minz: h,
  beatHeight: "4b",
});
 
 
 global presetboxy = presets.makeBoxy({
  printer,
  amt: 0.3,
  points: 2,
  note: "g5",
  t: "1b",
  cx,
  cy,
  beatHeight: "5b",
  layerThick: 0.12,
  loop: true,
  minz: 0.12,
  bpm
});
 
 
global it1 = iterator(presetG6);
global it2 = iterator(presetPoly2);
global it3 = iterator(presetPoly1);
global it4 = iterator(presetGio);
global it5 = iterator(presetboxy);
 
global currentit = it3; 
 
global events = [
  { it: it3, layers: 30, fadeout: 35 },
  { it: it2, layers: 65, fadeout: 25 }, 
  { it: it5, layers: null, fadeout: null },
];
 
global currentit = it5; 
 
global events = [
  { it: it2, layers: 30, fadeout: 35 },
  { it: it5, layers: 65, fadeout: 40 }, 
  { it: it3, layers: null, fadeout: null },
];
  

 updateGUI();
 
//******** RUN THE MAIN LOOP************************************
 
# temp 230
 
# speed 'd7' | down 60
 

it5.notes = ['b6'];
  
currentit.notes = ['b3','ab4','eb4'];
  

# bail false
 
info('moving to pos');
 
# fan 0 | prime | fan 50 | speed 80 | mov2 currentit.next() | unretract | wait 20 | fan 10 | bail false
 
lp.mainloop(async()=>{
 
  await timeline(events);
 
  info("LOOP FINISHED!");
 
 
  # bail
});
 
 
 
 
//////////////////////////////////

// # bail
// it5.done = true;

it5 = iterator(presetboxy);
 
it5.notes = ['ab6', 'd5', 'eb5', 'g5']; 
  
 
lp.mainloop(async()=>{
 
  await run(it5);
 
  info("LOOP FINISHED!");
 
  # bail
});
 `;


export const presetscode = `
global preset5tall = presets.makeTriLineTestSlower({
  printer,
  points: 16,
  amt: 0.075, // was 0.15
  note: "E2",
  t: "8b",
  beatHeight: "64b",
  layerThick: 0.2,
  minz: 0.13,
  loop: true,
});

global preset30tall = presets.makeTriLineTestSlower({
  printer,
  points: 36,
  amt: 0.15, 
  note: "E2",
  t: "2.5b",
  beatHeight: "52b",
  layerThick: 0.15,
  minz: 0.08,
  loop: true,
});

global presetlinearwave = presets.makeTriLineTest({
  printer,
  amt: 0.5,
  note: "C3",
  t: "1/2b",
  beatHeight: "12b",
  layerThick: 0.18,
  minz: 0.2,
});
`; 