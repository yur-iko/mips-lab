# Practice sources and assumptions

The practice sessions are derived from the supplied HCMUT Computer Architecture slides by Pham Quoc Cuong. Slide numbers below are the one-based PDF page numbers; they also match the printed slide numbers in the chapter decks.

The seven supplied PDFs contain 309 pages: 293 chapter slides, 9 introduction slides, and a 7-page syllabus. The introduction and syllabus establish the course scope. The practice library concentrates on the technical topics in Chapters 1–5; it is a selection of practice exercises, not a complete transcription of every slide.

## Session map

| Session | Source | Focus |
| --- | --- | --- |
| Arithmetic | Chapter2.pdf, 11–13 | Registers, arithmetic, immutable $zero |
| Memory | Chapter2.pdf, 14–23 | Word loads/stores and byte addresses |
| Branches | Chapter2.pdf, 31–39 | Conditional control flow and comparisons |
| CPU time & CPI | Chapter1.pdf, 18–27 | Weighted CPI, execution time, partial improvement |
| Power & throughput | Chapter1.pdf, 17–18, 29–30 | Dynamic power scaling, throughput versus response time |
| Bits & shifts | Chapter2.pdf, 24–30 | AND/OR/NOR, masks, logical shifts |
| Build a constant | Chapter2.pdf, 17, 24–30, 59–60 | LUI/ORI and immediate extension |
| Array addressing | Chapter2.pdf, 15–23, 25 | Scale an index and address a word |
| Signed vs unsigned | Chapter2.pdf, 35–36 | Signed and unsigned interpretation of identical bits |
| Calls & stack | Chapter2.pdf, 42–47 | JAL/JR, arguments, return value, saved registers |
| Bytes & extension | Chapter2.pdf, 15–23 | Big-endian byte order, LB/LBU/LH, array offsets |
| Instruction encoding | Chapter2.pdf, 53–71 | R/I/J fields, signed immediates, PC-relative offsets, jump regions |
| Overflow & HI/LO | Chapter3.pdf, 4–6, 11, 16 | Signed overflow, wrapped bit patterns, product/quotient/remainder |
| IEEE-754 | Chapter3.pdf, 19–25, 35 | Binary32 fields, normalization, bias, special exponents |
| Datapath & control | Chapter4.pdf, 3–25 | ALU inputs, load/store controls, ALUOp versus ALU control, critical path |
| Pipeline & hazards | Chapter4.pdf, 27–30, 47–68 | Fill/drain cycles, throughput, forwarding, stalls, load-use hazards |
| Cache address fields | Chapter5.pdf, 9–18 | Byte offset, index, tag, block and line numbers |
| Cache hits & LRU | Chapter5.pdf, 32–40 | The supplied 0,8,0,6,8 sequence and associativity |
| Cache performance | Chapter5.pdf, 21–23, 28–30, 41–44 | AMAT, extra CPI, global miss rates, write-through |
| Pages & TLB | Chapter5.pdf, 52–65, 74 | VPN/offset/PPN, resident pages, TLB misses, page faults, write-back |

## Modeling choices

- Traces are fixed instruction examples, not an assembler. They use signed 32-bit decimal display, optional hexadecimal display, and byte-addressed word memory. Only the instructions used by the examples are implemented. A signed `add`, `addi`, or `sub` overflow stops execution in the engine; no exception handler is simulated.
- The call/return example follows the slides' simplified **no-delay-slot** model: `jal` saves PC+4. Classic delayed MIPS uses a different link address. The callee restores `$s0` and `$sp` before returning.
- Byte questions explicitly use **big-endian**, as Chapter 2 slide 19 does. MIPS implementations and simulator configurations may support other byte orders. Word-only traces do not model individual memory bytes.
- Branch and jump questions label the current instruction address as PC and explicitly calculate from **PC+4**. Chapter 2's wording sometimes calls the already-incremented value PC.
- Pipeline questions use IF/ID/EX/MEM/WB, in-order issue, and same-cycle WB-write/ID-read. Forwarding, overhead, and hazards are stated in each question. Cycle diagrams are teaching examples, not a general pipeline simulator.
- Cache questions state block size, organization, initial validity, and replacement policy. The LRU trace uses memory-block numbers; address-field questions use byte addresses. A global L2/main-memory miss rate is not multiplied by the L1 miss rate again.
- Floating-point questions distinguish normal values from exponent-zero special cases. They do not simulate an FPU, rounding modes, or exception flags.
- Numeric checkpoints accept decimal, scientific notation, `0x` hexadecimal, and `0b` binary. Questions asking for rounded decimal values specify an absolute tolerance matching that rounding precision. Instruction-trace predictions also accept the equivalent unsigned 32-bit bit pattern of a signed register value.

## Source clarifications

Some slide mnemonics and tables contain typographical inconsistencies. The standard spellings are `sltiu` and `addiu`; the `sltui` and `addui` spellings in some slides are typos. Chapter 2 slide 56 prints the NOR function as `0x28 (39)`; decimal 39 corresponds to `0x27`. The exercises do not use that erroneous NOR encoding.

For instruction details, the primary reference is MIPS Technologies' [MIPS32 Architecture for Programmers, Volume II-A: The MIPS32 Instruction Set, revision 3.00](https://pages.hmc.edu/harris/class/e155/11/MIPS32InstructionSet.pdf). The course's explicitly stated simplified execution conventions take precedence for these teaching examples.

The original slide PDFs are kept in the user's study directory and are not bundled or redistributed by this website.
