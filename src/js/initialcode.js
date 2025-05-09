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
//!!!
//shapes mix
//!!


setZoom(0.5);
setViewX(0.07);
setViewY(0.04);
closeFactor(80);
 
 
notes = ['d4','c4','b3']

notes = ['b4','c5','d5'];

notes = ['c4','c3','c5','a3','d5','g4','c2','c4','c3','c5','a3','d5','g4','c4','c3','c5','a3','d5','g4','g2','c4','c3','c5','a2','d5','g4']

notes = ['c1','c4','c5','c4','g4','a5','a1','c4','c5',
'a1','a4','a5','a4','b4','c5','c1','b4','b5'];




 // print at 200 for white filament, 215 for multi
 
const sides = 16;
const points = sides;
const circumference = '12b';
const printer = lp;
const cx = printer.cx;
const cy = printer.cy;
const minz = 0.11;
const layerThick = 0.13;
const bpm = 133;
const note = 'g4';
 
printer.autoretract = false;
 
// -------------------------------------------------------
// ---------------GEN6 M-like presets---------------------
// -------------------------------------------------------
  
// fast fun tiny with 2 rows, 8 gets medium size and crazy
global presetG6 = presets.genP6({
  printer,
  loop: false,
  amtx: 0.04,
  amty: 0.03,
  minz: 0.12,
  grids: { cols: 4, rows: 8 },
  bpm,
  t: "1/2b",
  rowNote:'d4',
  colNote: 'd4',
  beatHeight: "4b",
  layerThick,
});
 
// ---------------====START GRID====--------------------
global nextGenPoint = makeIterator(presetG6);
// ---------------==================--------------------
 
const presetPoly2 = presets.genPoly2({
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
 
const presetPoly1 = presets.genPoly1({
  printer,
  sides,
  circumference:'24b',
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
 
global preset = presetPoly2;
 
const nextGridPoint = makePolyIterator(presetPoly2);
const nextGridPoint2 = makePolyIterator(presetPoly1);
 
 
// crossfade over 10 layers
const crossFadeFunc = crossfadePoints(preset.points_per_layer*30);
const crossFadeFunc2 = crossfadePoints(preset.points_per_layer*40);
          
 
global notes = ['g3'];
 
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
   
 
 
let layers = 0;
let pointsFunc = nextGridPoint;
 
# fan 0 | prime | fan 50 | speed 80 | mov2 pointsFunc() | unretract | wait 20 | fan 10 | bail false
 
printer.mainloop(async()=>{
 
 
  const gridPoint = pointsFunc();
 
  if (gridPoint.z <= preset.height) {
 
 
    if (gridPoint.i > 0 && gridPoint.i % preset.points_per_layer === 0) {
      
      layers++;
      console.log(layers);
 
 
      // if we hit 10 layers cross fade btw iterators
      if (layers === 15) 
      {
        console.log('crossfade triggered');
        # fan 255
        pointsFunc = ()=>crossFadeFunc(nextGridPoint(),nextGridPoint2());
        preset = presetPoly1;
        presetPoly1.points_per_layer = presetPoly2.points_per_layer;
      } else if (layers === 22) {
        notes = ['c4'];
      } else if (layers === 35) {
        console.log('crossfade 2 triggered');
        pointsFunc = ()=>crossFadeFunc2(nextGridPoint2(),nextGridPoint());
        notes = ['g3'];
      }
      
      else if (layers === 55) {
        notes = ['g4'];
      }
      else if (layers === 70) 
      {
        
        const d = points*lp.n2mm(note, '1/4b', preset.bpm);
 
 
        console.log('crossfade 3 triggered');
        const preset_gio1 = presets.makeGiacometti_1({
          printer,
          points,
          layerThick,
          cx: cx-d*1/2,
          cy,
          note,
          t: "1/4b",
          bpm,
          minz: gridPoint.z,
          beatHeight: "6b",
        });
        preset = preset_gio1;
        preset_gio1.points_per_layer = presetPoly2.points_per_layer;
 
 
        const nextGridPoint3 = makeLineIterator(preset_gio1);
        const crossFadeFunc3 = crossfadePoints(preset.points_per_layer*45);
 
 
        pointsFunc = ()=>crossFadeFunc3(nextGridPoint(),nextGridPoint3());
      }
      else if (layers === 85) {
       notes = ['c4','c5']
      }
    }
 
 
    try 
    {
 
 
      // next note if uncommented
    
    
      # m2s next() | to gridPoint | draw  
    
    } catch (err) {
      console.error(\`draw to error vals: \${gridPoint}\`);
      console.error(\`draw to error: \${err}\`);
    }
  }
  else 
  {
    printer.bail();
  }
 
});
 
 
 
   
log('DONE! -- CLAP CLAP CLAP')  
  
// TO HERE
//////////////////////////////////////////////////////////////////////
////////////////////////// END ///////////////////////////////////////
////////////////////////// MAIN //////////////////////////////////////
////////////////////////// LOOP //////////////////////////////////////
////////////////////////// !!!! //////////////////////////////////////
//////////////////////////////////////////////////////////////////////
 `; 