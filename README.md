# MIPS Lab

My personal interactive website for learning how MIPS instructions change registers, memory, and program execution.

**[Try the website here!](https://yur-iko.github.io/mips-lab/)**

## Features

- Three exercises covering arithmetic, memory, and branches
- Step through instructions and watch the machine state change
- Predict results, check answers, and reveal explanations
- Go back, restart exercises, and switch between decimal and hexadecimal values

## Run locally

The website uses plain HTML, CSS, and JavaScript, with no build step.

Serve the repository folder with a local HTTP server and open its URL in your browser. Use HTTP because the JavaScript modules may not load when opening `index.html` directly.

The exercises use 32-bit registers and disable branch delay slots.
