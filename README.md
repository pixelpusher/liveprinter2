# LivePrinter 2

An interactive programming system for exploring computational matter via 3D printers. Or: taking full control of 3D printers, interactively, using code.

[LivePrinter original repo](https://github.com/pixelpusher/liveprinter) -- explains the project. Now defunct, but still works (in a way).

by Evan Raskob 2022-2026 under and Apache 2.0 license (why? because what would you actually take from this thing to put into anything else that would be useful?? Might as well just use it how you'd like)

## Extremely Quick Syntax guide

* `\#  SOMETHING | SOMETHING ELSE`: LivePrinter API code (or special functions). Lines start with `#` and you can chain together operations in the same code sentence using `|` between functions. You can also put functions in blocks wrapped with `## ... ##` where each line is another command.
* `m'xxxxx'`: matches mathjs function calls like m'sin(0.5)'

## Moving, drawing, etc.

There are two types of movement for two different use cases. You can either specify absolute coordinates (in mm) on the buildplate to move or draw to, or relative coordinates to move or draw by, OR you can use the Turtle-graphics-like mode to draw or move at an angle, relative to the current position.

NOTE: With all of these functions the x,y,z,speed, etc. are optional -- you just need one or more.

### Coordinate-based movement (ext/mov)

1. `# moveto x:56 y:3 z:0.2 speed:30` : Move to the position 56mm from the right of the buildplate, 3mm from the front edge, and 0.2mm above at a speed of 30mm/s. You can also use the shorter `mov2`.
2. `# extrudeto x:56 y:3 z:0.2 speed:30` : Do the same thing, but extruding filment (e.g. printing). Also `ext2`
3. `# move x:5 y:1 z:4 speed:30` : Move from the current position. Also `mov`.
4. `# extrude x:5 y:1 z:4 speed:30` : Move from the current position. Also `ext`.

### Turtle-graphics-like movement (draw/travel)

1. `# turnto 0 | speed 30 | draw 10`: Turn the drawing direction towards the left edge and extrude for 10mm at a speed 30mm/s.
2. `# turn 45 | travel 40` : Turn 45 degrees CCW and move (travel) 40mm without extruding.

### Musical Turtle-graphics-like movement

1. `# bpm 120 | speed a5 | drawtime '1 1/2b'` : Set the beats per minute to 120, draw in the current direction at a motor speed that will sound like a MIDI note A5 for one and one-half beats.   
2. `# bpm 120 | speed C5 | traveltime '1/4b'` : Set the beats per minute to 120, travel in the current direction at a motor speed that will sound like a MIDI note C5 for one-fourth of a beat.   
3. `# to x:45 y:50 note:D#4` or `# to x:45 y:50 t:'1b'` : Useful for when you want to move to a specific point at a speed or in a specific amount of time. Sets the drawing direction and amount so you can just call `draw` or `travel` afterwards as in `# to x:45 y:50 note:D#4 | draw`. Note: Traveling at a 'note' and then drawing is almost the same as a movement with a specific speed, like `# mov x:4 y:y speed:a6`.

## Installation and usage

1. Download this repository
2. Install dependencies: `npm install`
3. Run server: `npm run dev`
4. Go to the web address of the server in your favourite browser, probably http://localhost:5173
5. If you want to use a real 3D printer, you need the serial server part which is at https://github.com/pixelpusher/liveprinter. There are instructions on how to install the Python dependencies and then run it. No, I don't have an easy-to-install package... sorry!
   1. If you got the server running, hit the "refresh ports" button and then look in the drop-down list "choose printer port" and you should see your printer. When you click, it should connect but you might have to change the connection speed depending on the printer. Most are 150000 baud which is default (Prusa, Ultimaker).
6. If you don't need a 3D printer and just want to play around and make sounds or generate GCode that you can use later, then hit the "Start Virtual Printer" button and click on one of the editor tabs and start coding!
   1. type `delay(true)` and hit CTRL+ENTER to add a simulated delay (this is done by default if you are in Virtual mode) otherwise things will run so fast that it will appear to have crashed (but they are just running until complete really quickly and will make your final object appear... usually...)
   2. Generally, type code and hit CTRL+ENTER to run it asynchronously (default) or SHIFT+ENTER to *immediately* run it without waiting for async functions to finish.
   3. Run `logGCode = true;` to capture compiled GCode to the GCode Editor (see the tab). Warning: this will grow very quickly!

## Functions etc

Most functions come from the LivePrinter-Core library: https://github.com/pixelpusher/liveprinter-core

Some functions are specific to the `vizlib` visualiser and come from https://github.com/pixelpusher/vizlib

Others are part of `gridlib` https://github.com/pixelpusher/gridlib

The mininotation that I use for shorter, brackets-free JavaScript and hiding away async complexity is a parser and grammar package found at  github.com/pixelpusher/lp-language

## Complaints, praise, etc.

This works(!) *but* is very much experimental and under development and things are often a bit weird and may change. Contact Evan via GitHub or find him at [the Creative Computing Institute at UAL](https://researchers.arts.ac.uk/2848-evan-raskob). This is part of my research so I'm open to questions, etc. You can also find me on LinkedIn when I actually remember to log into the website.

Enjoy and good luck! And yes you might break your printer, but I've never done it (using the software, anyway).

## Asynchronous printing in LivePrinter

Here's the typical flow for a move or extrude operation:

1. `lp.move()` or `lp.extrude()` in `liveprinter.js` (**liveprinter-core** package): These functions eventually call `extrudeto()`.
2. `extrudeto()` in `liveprinter.js`: This function calculates the new position and then calls await this.`sendExtrusionGCode(_speed);`.
3. `sendExtrusionGCode()` in `liveprinter.js`: This constructs the GCode command (e.g., `G1 X... Y... Z... E... F...`) and then calls `await this.gcodeEvent(moveCode.join(" "));`.
4. `gcodeEvent()` in `liveprinter.js`: This dispatches the GCode to registered listeners. One such listener, set up in `liveprinter.ui.js`, is `sendAndHandleGCode()`.
5. `sendAndHandleGCode()` in `liveprinter.ui.js`: This calls `await sendGCodeRPC(gcode);`.
6. `sendGCodeRPC()` in `liveprinter.comms.js`: This is where the actual network request happens, calling `await sendJSONRPC(JSON.stringify(gcodeObj));`.
7. `sendJSONRPC()` in `liveprinter.comms.js`: This function makes an `$.ajax` call to your backend server and awaits its response.

The critical point is step 6 and 7. The JavaScript code is waiting for the backend server to acknowledge that it has received and processed the GCode command. If your backend server is slow to process the GCode, or if the physical printer itself is slow to respond to the GCode command (which the backend might wait for), then the JavaScript application will "hang" at this await statement until a response is received. Normally, however, it uses the printer as a timing device, much like a MIDI instrument clock because 
the printer takes a physical time to move, and in the end, the printer is a physical object that makes 
sound and thus is the ultimate source of timing truth in this system.

The Bottleneck limiter, as configured in liveprinter.limiter.js (maxConcurrent: 1, minTime: 0), acts as
a FIFO queue of asynchronous calls, ensuring that only one high-level code block (like the `lp.mainloop` function) runs at a time. However, it doesn't prevent individual `await` calls within that block from waiting for network or I/O operations.
