export const lessons = [
{title:'Make registers do the math',short:'Arithmetic',desc:'Build a value, combine two registers, and discover why $zero is special.',cpp:'Like C++: t0 = 5; t1 = 3; t2 = t0 + t1;',regs:{},memory:{},code:[['addi','t0','zero',5],['addi','t1','zero',3],['add','t2','t0','t1'],['sub','t2','t2','t1'],['addi','zero','zero',9]]},
{title:'Move between memory and registers',short:'Memory',desc:'Load a word, change it, then store the result in the next array element.',cpp:'Like C++: t0 = a[0]; t0 += 4; a[1] = t0;',regs:{s0:4096},memory:{4096:12,4100:0},code:[['lw','t0',0,'s0'],['addi','t0','t0',4],['sw','t0',4,'s0'],['lw','t1',4,'s0']]},
{title:'Follow a loop, one decision at a time',short:'Branches',desc:'Watch a countdown repeat, then see the branch fall through when it reaches zero.',cpp:'Like C++: t0 = 3; do { t0--; } while (t0 != 0);',regs:{},memory:{},code:[['addi','t0','zero',3],['addi','t0','t0',-1],['bne','t0','zero',1],['slt','t1','t0','zero'],['beq','t1','zero',6],['addi','t2','zero',99],['addi','t2','zero',7]]}
];
export const initial=l=>({regs:{zero:0,t0:0,t1:0,t2:0,s0:0,...l.regs},memory:{...l.memory},pc:0});
export const address=pc=>4194304+pc*4;
export function execute(l,s){if(s.pc>=l.code.length)return null;const n=structuredClone(s),[op,a,b,c]=l.code[s.pc];n.pc++;let target=a,value,explain;
if(op==='addi'||op==='add'||op==='sub'){const right=op==='addi'?c:s.regs[c];value=op==='sub'?s.regs[b]-right:s.regs[b]+right;explain=`${op}: ${s.regs[b]} ${op==='sub'?'−':'+'} ${right} = ${value}. Write the result to $${a}.`;}
if(op==='slt'){value=s.regs[b]<s.regs[c]?1:0;explain=`slt sets $${a} to 1 if ${s.regs[b]} < ${s.regs[c]}, otherwise 0. The result is ${value}.`;}
if(op==='lw'||op==='sw'){const addr=s.regs[c]+b;target=op==='sw'?`memory[${addr}]`:a;value=op==='sw'?s.regs[a]:s.memory[addr];explain=`Address = $${c} (${s.regs[c]}) + ${b} bytes = ${addr}. ${op==='lw'?'Load '+value+' into $'+a:'Store $'+a+' ('+value+') at this address'}.`;if(op==='sw')n.memory[addr]=value;}
if(op==='beq'||op==='bne'){const taken=op==='beq'?s.regs[a]===s.regs[b]:s.regs[a]!==s.regs[b];n.pc=taken?c:s.pc+1;target='PC';value=address(n.pc);explain=`${op} tests whether ${s.regs[a]} ${op==='beq'?'equals':'differs from'} ${s.regs[b]}. ${taken?'True: jump to line '+(c+1):'False: continue to the next line'}. Next PC = 0x${value.toString(16)}. Delay slots are disabled.`;}
else if(op!=='sw'){n.regs[a]=a==='zero'?0:value;if(a==='zero'){value=0;explain+=' Writes to $zero are ignored, so it remains 0.';}}
return {state:n,target,value,explain};}
export function instruction(i){const[o,a,b,c]=i;return o==='lw'||o==='sw'?`${o} $${a}, ${b}($${c})`:o==='beq'||o==='bne'?`${o} $${a}, $${b}, L${c+1}`:`${o} $${a}, $${b}, ${typeof c==='string'?'$'+c:c}`;}
export function parseAnswer(v){v=v.trim();return /^-?\d+$/.test(v)||/^0x[0-9a-f]+$/i.test(v)?Number(v):NaN;}
