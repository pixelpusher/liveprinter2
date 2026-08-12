
delay(true);

reset();

let d = 60;

# moveto x:lp.cx*0.6 y:lp.cy*0.45 speed:'g4' | turnto 30

lp.loop{{
    // square
    # speed 'a5' | drawfill h:d w:1 hgap:2 | turn 120
    lp._heading = lp._heading % (2*Math.PI);
  
    d *= 0.8;
    
    updateGUI();
    if (d <= 6) # bail
}}
