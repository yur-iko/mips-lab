# MIPS Lab

My personal interactive website for practicing computer architecture with examples derived from my HCMUT course slides.

**[Try the website here!](https://yur-iko.github.io/mips-lab/)**

## Practice

20 sessions across five chapters:

- Performance: weighted CPI, CPU time, power, and throughput
- MIPS ISA: arithmetic, memory, branches, logic, constants, arrays, comparisons, procedures, byte order, and encoding
- Computer arithmetic: overflow, HI/LO, and IEEE-754
- Microarchitecture: datapath controls, pipeline timing, forwarding, and hazards
- Memory hierarchy: address fields, cache hits/LRU, AMAT/CPI, pages, and TLBs

Step through instruction traces or answer guided checkpoints. Check predictions, reveal worked explanations, go back, and restart. Your selected chapter is remembered across refreshes and later visits in the same browser. Reset all clears practice progress and returns to All chapters; Restart session only restarts the current exercise. Light and dark themes use a saved preference.

## Run locally

Serve this repository with a local HTTP server and open its URL in a modern browser. The site uses plain HTML, CSS, and JavaScript modules, with no build step or package installation.

With Node.js 22 or later, run the automated checks using `npm test` or `node --test`.

See [SOURCES.md](SOURCES.md) for slide references, course conventions, and modeling limits. The original course PDFs are not included.
