This is a live coding environment for CNC machines. Write JavaScript code in the editor, select it, and press the run shortcut to execute it on your printer immediately.

You can also use a special shorthand syntax that gets converted to JavaScript.

---

## Keypresses

Common keypresses to execute code and control the UI:

-   **Run Selected Code:** `Ctrl+Enter` or `Cmd+Enter`
-   **Run Current Line:** `Shift+Enter`
-   **Toggle Sidebar:** `Ctrl+H`
-   **Toggle Editor Panels:** `Ctrl+h`

---

## Editors

There are a few code editors -- two of them (to the right) are for usual coding, the one called "presets" has some presets code for `gridlib` (a path-generating library) and the "history" one keeps a record of everything you do for later reference (you can just select and delete inside it if you want). Nothing is stored to disk, it's all cached in your browser meaning that it all goes away if you hard-reload the page. You can hit the "download" buttons to down load the current editor or all of them.

There's also a GCode editor, which by default does nothing but you can enable GCode logging using `logGCode = true;` and then it will store the results of your JavaScript code compiled to GCode. You can save it to a file and send it to a printer later, or edit it, whatever. When you run the LivePrinter server, the server automatically saves all the GCode to a log which is much more memory-efficient (it gets large quickly!) an more automatic to deal with.

to run lines of GCode in the editor, highlight them and hit the same keypresses as in the other editors but note that *without a printer connected it won't do anything*.

---

## Extremely Quick Syntax guide

* `#  SOMETHING | SOMETHING ELSE`: LivePrinter API code (or special functions). Lines start with `#` and you can chain together operations in the same code sentence using `|` between functions. You can also put functions in blocks wrapped with `## ... ##` where each line is another command.
* `m'xxxxx'`: matches mathjs function calls like m'sin(0.5)'

Lines starting with `#` are treated as special commands that are part of the `lp-language` minigrammar. You can chain commands with `|`.

## Longer Syntax Reference

LivePrinter has a few special syntax features to make coding easier.

### Moving, drawing, etc.

There are two types of movement for two different use cases. You can either specify absolute coordinates (in mm) on the buildplate to move or draw to, or relative coordinates to move or draw by, OR you can use the Turtle-graphics-like mode to draw or move at an angle, relative to the current position.

NOTE: With all of these functions the x,y,z,speed, etc. are optional -- you just need one or more.

ALSO NOTE: There is a "print" speed and "travel" speed and they are separate!

#### Coordinate-based movement (ext/mov)

1. `# moveto x:56 y:3 z:0.2 speed:30` : Move to the position 56mm from the right of the buildplate, 3mm from the front edge, and 0.2mm above at a speed of 30mm/s. You can also use the shorter `mov2`.
2. `# extrudeto x:56 y:3 z:0.2 speed:30` : Do the same thing, but extruding filment (e.g. printing). Also `ext2`
3. `# move x:5 y:1 z:4 speed:30` : Move from the current position. Also `mov`.
4. `# extrude x:5 y:1 z:4 speed:30` : Move from the current position. Also `ext`.

#### Turtle-graphics-like movement (draw/travel)

1. `# turnto 0 | speed 30 | draw 10`: Turn the drawing direction towards the left edge and extrude for 10mm at a speed 30mm/s.
2. `# turn 45 | travel 40` : Turn 45 degrees CCW and move (travel) 40mm without extruding.

#### Musical Turtle-graphics-like movement

1. `# bpm 120 | speed a5 | drawtime '1 1/2b'` : Set the beats per minute to 120, draw in the current direction at a motor speed that will sound like a MIDI note A5 for one and one-half beats.   
2. `# bpm 120 | speed C5 | traveltime '1/4b'` : Set the beats per minute to 120, travel in the current direction at a motor speed that will sound like a MIDI note C5 for one-fourth of a beat.   
3. `# to x:45 y:50 note:D#4` or `# to x:45 y:50 t:'1b'` : Useful for when you want to move to a specific point at a speed or in a specific amount of time. Sets the drawing direction and amount so you can just call `draw` or `travel` afterwards as in `# to x:45 y:50 note:D#4 | draw`. Note: Traveling at a 'note' and then drawing is almost the same as a movement with a specific speed, like `# mov x:4 y:y speed:a6`.

---

#### Material handling

You generally need to retract the filament into the head when traveling and unretract it when printing or it will drip and mess up your print.

| Function | Description |
| `autoretract(state = true)` | Sets automatic retraction (after/before each extrusion) |
| `retract()` | Retract filament |
| `unretract()` | Unretract filament |


#### Other Core Functions

With all these, if you use the `# FUNCTION` minigrammer you can skip the `lp.` object and brackets etc., like `# temp 220`.

| Function | Description |
|---|---|
| `lp.prime()` | Prime the filament -- move the print head to the front of the bed, in the air, and extrude some filament and then retract |
| `lp.start()` | Usually the first thing to do, home the axes so the printer knows where the print head is or it may be misaligned |
| `lp.temp(degrees)` | Sets the hotend temperature and waits for it to be reached. |
| `lp.bed(degrees)` | Sets the heated bed temperature and waits for it to be reached. |
| `lp.retract(amount)` | Retracts filament. Uses `lp.currentRetraction` by default. |
| `lp.unretract(amount)`| Unretracts filament. |
| `lp.gcode(STRING or ARRAY of STRINGS)` | Send GCode directly to the printer without compiling first | 
| `delay(milliseconds or true)` | In virtual mode, pauses execution for a set amount of time or `true` to handle it automatically. |
| `info(message)` | Logs a message to the info panel on the right. |
| `logGCode = true;` | Toggles logging of all generated G-Code to the G-Code editor tab (WARNING: gets big quickly!). |

---

### Shorthand Commands

#### Math.js Expressions

You can embed math.js expressions directly in your code by wrapping them in `m'...'`. They will be evaluated before your code runs.

```javascript
// Moves the printer in a sine wave
for (let i = 0; i < 360; i++) {
  await printer.move({ y: m'sin(i * pi/180) * 10' });
}
```

### Asynchronous Blocks

For easier writing of asynchronous JavaScript arrow functions, wrap code in `{{...}}`. For example, this whole block runs in the background until `# bail` is executed to stop it 

```javascript
lp.mainloop({{
  # mov x:sin(lp.time/1000)
}});
```