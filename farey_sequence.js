
// index-th float of farey's sequence
// n: degree of farey's sequence
//
// Further reading: https://rosettacode.org/wiki/Farey_sequence#C
// Farey for n=3: 1/3 1/2 2/3
var farey_indexed = function(n, index) {
    log("func(" + n + "," + index + ")");
    //printf("func(%d,%d)\n", n, index);
    //let ret; // float
    
    //typedef struct { int d, n; } frac;
    let f1 = [0, 1]; // frac
    let f2 = [1, n]; // frac
    let t = [null, null]; // frac
    let k = 0; // int
    
    let ret = 1.0 / n;
    log(0 + "/" + 1 + " " + 1 + "/" + n);
    //let i; // int
    for (let i = 0; i < index; i++) {
	if (f2[1] <= 1) {
		break;
	}
        k = Math.floor((n + f1[1]) / f2[1]);
        t = f1;
	f1 = f2;
        f2 = [f2[0] * k - t[0], f2[1] * k - t[1]];
        log(" " + f2[0] + "/" + f2[1]);
    }
    ret = f2[0] / f2[1];
    log('');
    return ret;
}
