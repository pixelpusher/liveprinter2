// Mary had a little lamb, LivePrinter style:
// by Evan Raskob 2019

await lp.moveto({ x: lp.cx, y:lp.cy, z:0.2, speed:60 });

lp.turnto(0);

for (let transp of [0, 3, 12]) {
    for (let note of [40, 38, 36, 38, 40, 40, 40, 0, 38, 38, 38, 0, 40, 43, 43, 0]) {  // do something for these midi notes
        if (note == 0) await lp.wait(500); // wait 1/2 second if no note (0)
        // speed => midi note to motor speed 
        // drawtime => time to distance (seconds to millimeters) based on the current printing speed
        lp.speed(note + transp, "x");
        await lp.drawtime(500); // draw for 1/2 second
        lp.turn(90); // turn 90 CCW
    }
}
