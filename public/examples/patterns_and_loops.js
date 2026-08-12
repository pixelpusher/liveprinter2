// PATTERNS AND LOOPS  
// make a simple looping patter

reset();
delay(true);

// optional, if in virtual mode. Orient the axes.
# start

// move somewhere helpful
# moveto x:lp.cx y:lp.cy z:0.2 speed:'a5' | lh 0.25
  
global notes = ['c4', 'd5', 'e5', 'g4', 'a4', 'd6', 'e4', 'a4'];  
  
global durs = ['1/4b', '2b', '1b', '1/2b',
             '1/2b', '1/4b', '1/2b', '1/4b'];  
 
global note = makenext(notes);
global dur = makenext(durs);
             
// for playing with later
setarray(notes, ['a6','c4','a5','a5']);
setarray(durs, ['1/2b','2b']);

// angle to turn each time
global angle = 360/12;

// OR -- make the denominator of the 360/x not evenly divisible by 8 (size of notes and durations above )
// 6 is interesting too
global angle = 360/(Math.random(0,1)*Math.cos(lp.time)*6 + 6);
 
 
lp.loop{{
  let d = dur();
  info(d);
  # speed note() | drawtime d | turn angle | elev (Math.PI/44) 

  updateGUI();
}}
