# LivePrinter 2

An interactive programming system for exploring computational matter via 3D printers. Or: taking full control of 3D printers, interactively, using code.

[LivePrinter original repo](https://github.com/pixelpusher/liveprinter) -- explains the project. Now defunct, but still works (in a way).

by Evan Raskob 2022-2026 under and Apache 2.0 license (why? because what would you actually take from this thing to put into anything else that would be useful?? Might as well just use it how you'd like)

## Extremely Quick Syntax guide

* \#  liveprinter code
* m'xxxxx': matches mathjs function calls like m'sin(0.5)'

## Installation and usage

1. Download this repository
2. Install dependencies: `npm install`
3. Run server: `npm run dev`
4. Go to the web address of the server in your favourite browser, probably http://localhost:5173
5. If you want to use a real 3D printer, you need the serial server part which is at https://github.com/pixelpusher/liveprinter. There are instructions on how to install the Python dependencies and then run it. No, I don't have an easy-to-install package... sorry!
   1. If you got the server running, hit the "refresh ports" button and then look in the drop-down list "choose printer port" and you should see your printer. When you click, it should connect but you might have to change the connection speed depending on the printer. Most are 150000 baud which is default (Prusa, Ultimaker).
6. If you don't need a 3D printer and just want to play around and make sounds or generate GCode that you can use later, then hit the "Start Virtual Printer" button and click on one of the editor tabs and start coding!
   1. type `delay(true)` and hit CTRL+ENTER to add a simulated delay, otherwise things will run so fast that it will appear to have crashed (but they are just running until complete, usually...)
   2. Generally, type code and hit CTRL+ENTER to run it asynchronously (default) or SHIFT+ENTER to *immediately* run it without waiting for async functions to finish.

## Functions etc

Most functions come from the LivePrinter-Core library: https://github.com/pixelpusher/liveprinter-core

Some functions are specific to the `vizlib` visualiser and come from https://github.com/pixelpusher/vizlib

Others are part of `gridlib` https://github.com/pixelpusher/gridlib

The mininotation that I use for shorter, brackets-free JavaScript and hiding away async complexity is a parser and grammar package found at  github.com/pixelpusher/lp-language

## Complaints, praise, etc.

This works(!) *but* is very much experimental and under development and things are often a bit weird and may change. Contact Evan via GitHub or find him at [the Creative Computing Institute at UAL](https://researchers.arts.ac.uk/2848-evan-raskob). This is part of my research so I'm open to questions, etc. You can also find me on LinkedIn when I actually remember to log into the website.

Enjoy and good luck! And yes you might break your printer, but I've never done it (using the software, anyway).

