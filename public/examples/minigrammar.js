// Minigrammar - code quickly!
// You can use the experimental mini-grammar as a shorthand.

// normally you type this whole function (with punctuation!):

//absolute move to x=20mm, y=20mm at speed 80mm/s:
await lp.moveto({ x: 20, y: 20, speed: 80 });

// Instead you can type:
# moveto x: 20 y: 20 speed: 80

// you can enclose statements in # # if you're worried about mixing with javascript:

## moveto x: 20 y: 20 speed: 80 ##


//... and this is automatically compiled into the whole function call above.

// Single lnes need to start with '#'.

// You can use the '|' character to chain together functions like so:

# start 210 | move x: 23 y: 50 z: 10 | extrude x: 50 speed: 15 

// compiles to: 
// await lp.start(210);await lp.move({x:23,y:50,z:10});await lp.extrude({x:50,speed:15})

// you can also interleave js and minigrammar:
# mov2 x:lp.cx/2 y:lp.cy/2 z:lp.lh

for (let i = 0; i < 10; i++) {
    if (i % 2)
    # mov x: 10 y: 10 
else
    # mov x:-10 y: 10
}


// you can also safely enclose minigrammar statements inside lines with # (code)
let bung = async () => { 
    # mov2 x: 20 y: 40 
}

// or more succinctly

let bung = {{ 
    # mov2 x: 20 y: 40 
}}

// but be careful with this because you need to have at least one await or end with a return
// otherwise it won't be truly async and your loop or whatever might happen immediately