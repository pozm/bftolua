let bf = `
[ This program prints "Hello World!" and a newline to the screen, its
  length is 106 active command characters. [It is not the shortest.]

  This loop is an "initial comment loop", a simple way of adding a comment
  to a BF program such that you don't have to worry about any command
  characters. Any ".", ",", "+", "-", "<" and ">" characters are simply
  ignored, the "[" and "]" characters just have to be balanced. This
  loop and the commands it contains are ignored because the current cell
  defaults to a value of 0; the 0 value causes this loop to be skipped.
]
++++++++               Set Cell #0 to 8
[
    >++++               Add 4 to Cell #1; this will always set Cell #1 to 4
    [                   as the cell will be cleared by the loop
        >++             Add 2 to Cell #2
        >+++            Add 3 to Cell #3
        >+++            Add 3 to Cell #4
        >+              Add 1 to Cell #5
        <<<<-           Decrement the loop counter in Cell #1
    ]                   Loop till Cell #1 is zero; number of iterations is 4
    >+                  Add 1 to Cell #2
    >+                  Add 1 to Cell #3
    >-                  Subtract 1 from Cell #4
    >>+                 Add 1 to Cell #6
    [<]                 Move back to the first zero cell you find; this will
                        be Cell #1 which was cleared by the previous loop
    <-                  Decrement the loop Counter in Cell #0
]                       Loop till Cell #0 is zero; number of iterations is 8

The result of this is:
Cell No :   0   1   2   3   4   5   6
Contents:   0   0  72 104  88  32   8
Pointer :   ^

>>.                     Cell #2 has value 72 which is 'H'
>---.                   Subtract 3 from Cell #3 to get 101 which is 'e'
+++++++..+++.           Likewise for 'llo' from Cell #3
>>.                     Cell #5 is 32 for the space
<-.                     Subtract 1 from Cell #4 for 87 to give a 'W'
<.                      Cell #3 was set to 'o' from the end of 'Hello'
+++.------.--------.    Cell #3 for 'rl' and 'd'
>>+.                    Add 1 to Cell #5 gives us an exclamation point
>++.                    And finally a newline from Cell #6  
`

enum ops {
	IDP,
	DDP,
	IVD,
	DVD,
	PNT,
	INP,
	LPO,
	LPC,
	IG
}
interface tknc {
	sym:ops
	at?:number,
	close?:number
}
class tkn {
	public op : ops
	public at : number
	public close : number
	constructor(data : tknc) {
		this.op = data.sym
		this.at = data.at ?? 0
		this.close = data.close ??0
	}
}
class tokenizer {
	public script : string
	private char : number
	public tokens : tkn[] = []

	constructor(script : string) {
		this.script=script.trim().replace('\r\n','')
		this.char=0;
	}
	idxtochr(idx?:number) {
		if (idx) {
			return this.script[idx]
		} else return this.script[this.char]
	}
	chrtotkn(idx:number){
		let type : ops = ops.IG
		let chr = this.idxtochr(idx)
		switch (chr) {
			case '>' : {type = ops.IDP} break;
			case '<' : {type = ops.DDP} break;
			case '+' : {type = ops.IVD} break;
			case '-' : {type = ops.DVD} break;
			case '.' : {type = ops.PNT} break;
			case ',' : {type = ops.INP} break;
			case '[' : {type = ops.LPO} break;
			case ']' : {type = ops.LPC} break;
		}
		let close = 0;
		if (type == ops.LPO) {
			close = this.findnext()
		}
		return new tkn({close,sym:type,at:idx})
	}
	findnext() {
		let ig = this.script.slice(this.char+1).split('')
		let lpo = 0
		let lpc = 0;
		let lpcl = 0;
		chrsrc:
		for (let chari in ig) {
			let char = ig[chari]
			switch (char) {
				case '[' : { lpo++ } break;
				case ']' : { lpc++; if (lpc > lpo) {
					lpcl = parseInt(chari);
					break chrsrc;
				} } break;
			}
		}
		let loc = this.char+1 + lpcl
		return loc
	}
	lookfwd() {
		return this.chrtotkn(this.char+1)
	}
	look() {
		if (!this.idxtochr(this.char)) return this.tokens;
		let token = this.chrtotkn(this.char)
		this.tokens.push(token)
		this.char++
		this.look()
	}
}
class parser {
	tokenizer : tokenizer
	index : number = 0
	script : string = 'cells={0};cellptr=1;\n'
	cells : number[] = [0]
	cellPtr =0
	constructor(tokenizer:tokenizer) {
		this.tokenizer = tokenizer
	}

	deep() {
		let deep = 0
		for (let tknIdx in this.tokenizer.tokens.slice(0,this.index)) {
			let tkn = this.tokenizer.tokens[tknIdx]
			switch (tkn.op) {
				case ops.LPO: {deep++} break;
				case ops.LPC: {deep--} break;
			}
		}
		return deep
	}

	run() {
		if (!this.tokenizer.tokens[this.index]) return this.script;
		let deepness = this.deep()
		let tkn = this.tokenizer.tokens[this.index]
		if (tkn.op !== ops.IG){
			this.script+=('\t').repeat(deepness)
			switch (tkn.op) {
				case ops.IVD: {this.cells[this.cellPtr]++; this.script+='cells[cellptr]=cells[cellptr]+1;'} break;
				case ops.DVD: {this.cells[this.cellPtr]--; this.script+='cells[cellptr]=cells[cellptr]-1;'} break;
				case ops.IDP: {this.cellPtr++; this.cells[this.cellPtr] ??= 0
					this.script+='cellptr = cellptr + 1; if not cells[cellptr] then cells[cellptr] = 0 end'
				} break;
				case ops.DDP: {this.cellPtr--; this.script+='cellptr = cellptr -1'} break;
				case ops.PNT: {this.script+=`print(string.char(cells[cellptr]))`} break;
				case ops.INP: {this.script+=`cells[cellptr]= io.read()`} break;
				case ops.LPO: {this.script+=`while cells[cellptr]~=0 do `} break;
				case ops.LPC: {this.script=this.script.slice(0,this.script.length-1)+`end`} break;
			}
			this.script += '\n'
		}
		this.index++
		this.run()
	}
}
let g = new tokenizer(bf)
g.look()
let parserr = new parser(g)
parserr.run()
console.log(parserr.script)
