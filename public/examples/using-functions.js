// Using functions with LivePrinter
// By Evan Raskob, 2026
// --------------------------------

// You can mix liveprinter code with javascript.
// There are some utility functions to help you do things faster...

await repeat (5, {{ 
	# gcode "M105"
    # wait 500
    loginfo("got temp!");
}}
);

// using easier syntax for wrapping ES6 arrow async functions
await repeat (8, {{
	# gcode "M105"
    # wait 500
    loginfo("got temp!");
}});
