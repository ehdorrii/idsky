//
// memory.js - The "memory" of the AGC lives here. AGC memory consists
//     of read/write memory (called "erasable"), and read-only memory
//     (called "fixed"). The full complement of erasable memory (2048
//     15-bit words) is implemented; only a tiny subset of fixed memory
//     is implemented though, since that's mostly program memory, which
//     is fairly pointless for our purposes, since this is not an emulator.
//     See nounTable.js, though, for some tables from fixed memory.
//

const memDebug = false;
const memDpDebug = false;
const memCcsDebug = false;

///////////////////////////// 
// --- Erasable Memory --- //
/////////////////////////////

var e = new Array();
var ECADR = 0;
const eMemSize = 04000;

for (ECADR=0; ECADR<eMemSize; ECADR++) {
    e[ECADR] = 0;
}
    
ECADR = 0;

////////////////////////////////////
// --- Symbols for low memory --- //
////////////////////////////////////
    
const A        = 00000;
const L        = 00001;
const Q        = 00002;    
const EBANK    = 00003;
const FBANK    = 00004;
const Z        = 00005;
const BBANK    = 00006;
const ZERO     = 00007;

const ARUPT    = 00010;
const LRUPT    = 00011;
const QRUPT    = 00012;
const SAMPTIME = 00013;
const ZRUPT    = 00015;
const BANKRUPT = 00016;
const BRUPT    = 00017;

const CYR      = 00020;
const SR       = 00021;
const CYL      = 00022;
const EDOP     = 00021;

const TIME2    = 00024;
const TIME1    = 00025;
const TIME3    = 00026;
const TIME4    = 00027;
const TIME5    = 00030;
const TIME6    = 00031;
const CDUX     = 00032;
const CDUY     = 00033;
const CDUZ     = 00034;
const CDUT     = 00035;
const OPTY     = CDUT;
const CDUS     = 00036;
const OPTX     = CDUS;
const PIPAX    = 00037;
const PIPAY    = 00040;
const PIPAZ    = 00041;
const BMAGX    = 00042;
const BMAGY    = 00043;
const BMAGZ    = 00044;
const INLINK   = 00045;
const RNRAD    = 00046;
const GYROCTR  = 00047;
const GYROCMD  = 00047;
const CDUXCMD  = 00050;
const CDUYCMD  = 00051;
const CDUZCMD  = 00052;
const CDUTCMD  = 00053;
const OPTYCMD  = CDUTCMD;
const TVCYAW   = CDUTCMD;
const CDUSCMD  = 00054;
const TVCPITCH = CDUSCMD;
const OPTXCMD  = CDUSCMD;
const EMSD     = 00055;
const THRUST   = 00055;
const LEMONM   = 00056;
const LOCALARM = 00057;
const BANKALRM = 00060;

////////////////////////////////////////////////////
// --- Miscellaneous erasable storage symbols --- //
////////////////////////////////////////////////////
    
const RUPTREG1 = 00070;  
const RUPTREG2 = 00071;  
const RUPTREG3 = 00072;  
const RUPTREG4 = 00073;
const KEYTEMP1 = RUPTREG4;  

///////////////////////////////////
// --- Symbols for flagwords --- //
///////////////////////////////////

const FLAGWRD0 = 00074;

// As of Colossus 3, 11 flagwords were defined. Because of the very large 
// number of flags defined in Colossus, only those actually used in iDSKY
// are defined here.
//
// The following definitions utilize the numbering scheme used by the AGC
// source code and documentation as follows:
// 
//    XXXXXXXX = (W * 15) + B    means flag XXXXXXXX is bit B in FLAGWORD W

const NODOP01  = (1 * 15) + 12;     // 1: Disallow P01 selection     
const COMPUTER = (5 * 15) + 8;      // Computer is (1:CMC) (0:LGC)
const DSKYFLAG = (5 * 15) + 15;     // 1: Displays are (0:not) sent to DSKY
const SURFFLAG = (8 * 15) + 8;      // LM on lunar surface
const VHFRFLAG = (9 * 15) + 9;      // Allow R22 to accept range data
const INTFLAG  = (10 * 15) + 14;    // Integration in process

// The initial state is that iDSKY simulates a CMC; this is accomplished
// by setting the COMPUTER flag once, right here, rather than putting it in
// code that might be called more than once (as in acgInit()). This allows
// the user to switch to LGC mode with the following procedure:
//
//     DISPLAY     KEY       PURPOSE
//     ---------   -------   --------------------------------
//                 V25N07E   Select "Load flagword"
//     21 07 (F)   101E      Component 1: ECADR of FLAGWRD5
//     22 07 (F)   200E      Component 2: bit 8 of flagword
//     23 07 (F)   0E        Component 3: make it 0
//     23 07       V37E      Select "Load program"
//     37 (F)      06E       Select "Power down" program
//     50 25 (F)
//     00062       Hold down PRO key for 5 seconds (AGC powers itself off)
//     (blank)     Release PRO key
//     (blank)     Hold down PRO key for 5 seconds (AGC powers itself on)
//
// Use the same procedure to switch back to CMC mode, except the third component
// load would be 1 instead of 0.

e[FLAGWRD0 + 5] = 1 << 7;    // When iDSKY is initally started, default to CMC

//////////////////////////////////////////////
// --- Symbols for iDSKY trace flagword --- //
//////////////////////////////////////////////

// The iDSKY trace flagword is a bitmap representation of trace flags for
// the various iDSKY modules that have trace options. It is located immediately
// following the last AGC FLAGWRD.

const iTRACE     = 00110;      // The ECADR

const itAGC      = 000001;     // Trace agc.js
const itDISPLAY  = 000002;     // Trace display.js
const itMEMORY   = 000004;     // Trace memory.js
const itNOUNTAB  = 000010;     // Trace nounTable.js
const itPINBALL  = 000020;     // Trace pinball.js
const itPINBALLd = 000040;     // Do a deep trace in pinball.js
const itPROGS    = 000100;     // Trace progs.js
const itPROGSc   = 000200;     // Trace calculations in progs.js
const itVERBSX   = 000400;     // Trace verbsExt.js
const itVERBSR   = 001000;     // Trace verbsReg.js
const itSCALE    = 002000;     // Trace scaling operations
const itMEMdp    = 004000;     // Trace DP memory accesses
const itMEMccs   = 010000;     // Trace CCS usage

if (memDebug) e[iTRACE] |= itMEMORY;
if (memDpDebug) e[iTRACE] |= itMEMdp;
if (memCcsDebug) e[iTRACE] |= itMEMccs;

/////////////////////////////////////////////////
// --- Symbols for pinball working storage --- //
/////////////////////////////////////////////////

const DSEXIT   = 00114;
const EXITEM   = 00114;
const BLANKRET = 00114;
const WRDRET   = 00115;
const WDRET    = 00115;
const DECRET   = 00115;
const D2122REG = 00115;
const UPDATRET = 00117;
const CHAR     = 00117;
const ERCNT    = 00117;
const DECOUNT  = 00117;
const SGNON    = 00122;
const NOUNTEM  = 00122;
const DISTEM   = 00122;
const DECTEM   = 00122;
const SGNOFF   = 00123;
const NVTEMP   = 00123;
const SFTEMP1  = 00123;
const HITEMIN  = 00123;
const CODE     = 00124;
const SFTEMP2  = 00124;
const LOTEMIN  = 00124;
const MIXTEMP  = 00125;
const SIGNRET  = 00125;
const ENTRET   = 00136;
const WDCNT    = 00137;
const INREL    = 00137;
const DSPMMTEM = 00140;
const MIXBR    = 00140;
const TEM1     = 00141;
const DSREL    = 00141;
const TEM2     = 00142;
const DSMAG    = 00142;
const IDADDTEM = 00142;
const TEM3     = 00143;
const COUNT    = 00143;
const TEM4     = 00144;
const LSTPTR   = 00144;
const RELRET   = 00144;
const FREERET  = 00144;
const DSPWDRET = 00144;
const SEPSCRET = 00144;
const SEPMNRET = 00144;
const TEM5     = 00145;
const NOUNADD  = 00145;
const NNADTEM  = 00146;
const NNTYPTEM = 00147;
const IDAD1TEM = 00150;
const IDAD2TEM = 00151;
const IDAD3TEM = 00152;
const RUTMXTEM = 00153;
const MPAC     = 00154;

// P27 (UPDATE AGC) storage

const COMPNUMB = 00300;
const UPOLDMOD = 00301;
const UPVERB   = 00302;
const UPCOUNT  = 00303;
const UPBUFF   = 00304;
const UPTEMP   = 00330;
const UPVERBSV = 00331;
const DNLSTCOD = 00332;
const DNLSTADR = DNLSTCOD;

const MMNUMBER = 01200;
const PROGPASS = 01201;  // Unique to iDSKY: first or second pass of V37 load Program
const DSPCOUNT = 01202;
const DECBRNCH = 01203;
const VERBREG  = 01204;
const NOUNREG  = 01205;
const XREG     = 01206;
const YREG     = 01207;
const ZREG     = 01210;
const XREGLP   = 01211;
const YREGLP   = 01212;
const ZREGLP   = 01213;
const HITEMOUT = 01213;
const LOTEMOUT = 01213;
const MODREG   = 01214;
const DSPLOCK  = 01215;
const REQRET   = 01216;
const LOADSTAT = 01217;
const CLPASS   = 01220;
const NOUT     = 01221;
const NOUNCADR = 01222;
const MONSAVE  = 01223; // V & N for monitor
const MONSAVE1 = 01224; // Noun CADR for monitor
const MONSAVE2 = 01225;
const DSPTAB   = 01226;
const NVQTEM   = 01242;
const NVBNKTEM = 01243;
const VERBSAVE = 01244;
const CADRSTOR = 01245;
const DSPLIST  = 01246;
const EXTVBACT = 01247;

const WTOPTION = 01331;
const IMODES30 = 01333;
const IMODES33 = 01334;
const LMPTSTBT = Bit1;

// Self-check locations

const SELFERAS = 01357;
const ERESTORE = 01360;
const SELFRET  = 01361;     // CADR of chunk being tested
const ERCOUNT  = 01365;
const SCOUNT   = 01365;
const SKEEP1   = 01371;
const SKEEP2   = 01372;
const SKEEP3   = 01373;
const SKEEP4   = 01374;
const SKEEP5   = 01375;
const SKEEP6   = 01376;
const SKEEP7   = 01377;
const FSTSTINC = SKEEP5;    // Data index increment (V77)
const FSTDTAIX = SKEEP6;    // Data index in functional self test (V77)
const FSTSTEP  = SKEEP7;    // Step in functional self test (V77)

const MISSION  = 03774;     // iDSKY: mission to model (10-17)
const V77DATA  = 03775;     // iDSKY: used by iDSKY self-test routine (V77)
const DEVCAPFL = 03776;     // iDSKY: host device capability flags
const TOUCHEV  = Bit1;      // iDSKY: device supports touch interface
const ORIENTEV = Bit2;      // iDSKY: device supports orientation events
const MOTIONEV = Bit3;      // iDSKY: device supports motion events


//////////////////////////
// --- Fixed Memory --- //
//////////////////////////

var FCADR = 0;
const fMemSize = 36864;

// Code for the the first 128 words of Colossus 2A (AKA Comanche 055). Add 04000 
// to the subscript to obtain the CADR. Code should not reference f[] for any 
// subscript higher than 128. (This doesn't provide any functionality, it's just
// sorta "for the heck of it", so you can play with verb 27 a little.)

const f = [ 013207, 013527, 013516, 013607, 013611, 013174, 012116, 017637,   // 000
            013232, 013023, 013176, 013245, 016323, 013274, 013247, 036211,   // 010
            070020, 054021, 010020, 012101, 000024, 050021, 035002, 054135,   // 020
            010020, 002050, 016027, 030135, 000006, 070156, 054156, 030135,   // 030

            000006, 070154, 052155, 030135, 000006, 070001, 020156, 016030,   // 040
            030156, 000006, 070135, 056155, 000006, 070135, 056155, 060001,   // 050
            060000, 054156, 012064, 026155, 035021, 054156, 056154, 000006,   // 060
            070135, 020155, 000002, 030135, 000006, 070155, 054155, 056001,   // 070

            012060, 030021, 054135, 000006, 030156, 020156, 060154, 060154,   // 100
            054154, 012113, 054121, 010135, 012102, 010020, 007105, 016030,   // 110
            016030, 035023, 070020, 054135, 010020, 012145, 000176, 050135,   // 120
            035002, 054135, 002073, 052155, 052160, 052155, 002073, 052155,   // 130

            052162, 052155, 002073, 017367, 054135, 000006, 030155, 020155,   // 140
            000006, 012153, 006766, 000006, 030160, 020160, 000006, 012161,   // 150
            006763, 000006, 030162, 020162, 000006, 012167, 006760, 010135,   // 160
            012144, 016030, 054135, 006672, 012176, 012212, 007226, 030154 ]; // 170
            
            
// Banksum words (Verb 91)       
          
const fb = [[077777, 045537], [000001, 067773], [077775, 005072], [000003, 041360],
            [000004, 040022], [000005, 066070], [077771, 004275], [000007, 065667],
            [000010, 052742], [000011, 043450], [000012, 076240], [000013, 045306],
            [000014, 064443], [000015, 076540], [000016, 072767], [000017, 053362],
            [000020, 056542], [000021, 073463], [077755, 003746], [000023, 065343],
            [000024, 046703], [000025, 077311], [000026, 051074], [000027, 053634],
            [000030, 046001], [077746, 021553], [000032, 063037], [077744, 032430],
            [000034, 045775], [000035, 051120], [077741, 022503], [000037, 064724],
            [000040, 043000], [077736, 020775], [077735, 003706], [000043, 054201]];

//////////////////////
// --- Channels --- //
//////////////////////

var Channel = [];
                        // -BASE-
                        // 10   8  Dir
Channel[000] = 0;       // 00  00  I/O : Equivalent to A
Channel[001] = 0;       // 01  01  I/O : Equivalent to L
Channel[002] = 0;       // 02  02  I/O : 
Channel[003] = 0;       // 03  03   I  : High Order Scalar
Channel[004] = 0;       // 04  04   I  : Low order scalar
Channel[005] = 0;       // 05  05   O  : 
Channel[006] = 0;       // 06  06   O  : 
Channel[010] = 0;       // 08  10   O  : AGC->DSKY
Channel[011] = 0;       // 09  11   O  : 
Channel[012] = 0;       // 10  12   O  : 
Channel[013] = 0;       // 11  13   O  : 
Channel[014] = 0;       // 12  14   O  : 
Channel[015] = 0;       // 13  15   I  : Main DSKY -> AGC
Channel[016] = 0;       // 14  16   I  : Nav DSKY -> AGC
Channel[030] = 0;       // 24  30   I  : 
Channel[031] = 0;       // 25  31   I  : 
Channel[032] = 0;       // 26  32   I  : 
Channel[033] = 0;       // 27  33   I  : 
Channel[077] = 0;       // 28  77   O  : 

// And now some notes on Javascript implementation of bitwise boolean operations:
//
// The operators are:
//
//    & : Bitwise AND
//    | : Bitwise OR
//    ^ : Bitwise Exclusive OR
//    ~ : Bitwise NOT
//   << : Left shift
//   >> : Sign-propagating right shift
//  >>> : Zero-fill right shift
//
// Conceptually, the bitwise logical operators work as follows:
//
// * The operands are converted to 32-bit integers
// * Each bit in the first operand is paired with the corresponding bit in the second
//   operand: first bit to first bit, second bit to second bit, and so on.
// * The operator is applied to each pair of bits, and the result is constructed bitwise.
//
// Bitwise shift operators
//
// * The bitwise shift operators take two operands: the first is a quantity to be
//   shifted, and the second specifies the number of bit positions by which the
//   first operand is to be shifted.
// * Shift operators convert their operands to thirty-two-bit integers and return a
//   result of the same type as the left operand.

function eFetch(theCadr) {
    var theValue = (e[theCadr] | 0) & MaskR15;
    if (theCadr === ZERO) theValue = 0;
    return theValue;
}

function signOfE(theCadr) {
    return (eFetch(theCadr) > MaxMagn) ? -1 : 1;
}

function spMagnOfE(theCadr) {
    // Return value is in the range 0..16383
    var result = eFetch(theCadr);
    if (result > MaxMagn) {
        result ^= MaxUns;
    }
    return result;
}

function spSignOfE(theCadr) {
    return signOfE(theCadr);
}

function eStore(theCadr, theValue) {
    // Should only be used to store unsigned values
    var theCarry = 0;

    theValue = (theValue | 0) & MaskR15;    

    switch (theCadr) {
        case EBANK:
            BBANK = (BBANK & 077770) | ((theValue >> 8) & 07);
            break;
        case FBANK:
            BBANK = (BBANK & 001777) | (theValue & 076000);
            break;
        case BBANK:
            EBANK = (theValue & 07) << 8;
            FBANK = theValue & 076000;
            break;
        case CYR:
            theCarry = (theValue & 1) << 14;
            theValue = theCarry | (theValue >> 1);
            break;
        case SR:
            theCarry = theValue & (1 << 14);
            theValue = theCarry | (theValue >> 1);
            break;
        case CYL:
            theCarry = theValue >> 14;
            theValue = theCarry | (maxUns & (theValue << 1));
            break;
        case EDOP:
            theValue = (theValue >> 7) & MaskR7;
            break;
    }
    e[theCadr] = theValue;
}

function spStore(theCadr, theMagnitude, theSign) {
    // theValue may be signed or unsigned
    theMagnitude = (theMagnitude | 0) & MaskR14;
    if (theSign < 0) theMagnitude ^= MaskR15;
    eStore(theCadr, theMagnitude);
}

function dpMagnOfE(theCadr) {
    // DP is always signed, so the return value will be signed
    var hiPart = e[theCadr] & MaxMagn;
    var loPart = e[theCadr+1] & MaxMagn;
    var theResult = (hiPart << 14) + loPart;
    if (e[theCadr] & spSign) theResult ^= dpMaxMagn;
    
    if (e[iTRACE] & itMEMdp)
		console.log("dpMagnOfE: e["+octal5(theCadr)+"] -> "+theResult);
    return theResult;
}

function dpSignOfE(theCadr) {
    return spSignOfE(theCadr);
}

function dp2CofE(theCadr) {
    // !!NOTE!! 
    // This function is called double-precision-two's-complement-of-E for 
	// a reason: it does NOT correctly return -0, because that value doesn't
    // exist in 2's complement!
    return dpMagnOfE(theCadr) * dpSignOfE(theCadr);
}

function dpStore(theCadr, theMagnitude, theSign) {
    if (e[iTRACE] & itMEMdp) 
		console.log(dpStore.caller.name+": dpStore: e["+
	                octal5(theCadr)+"] <- "+
					theMagnitude+" x "+theSign);
					
    var theResult = Math.round(Math.abs(theMagnitude), 0) % dpModMagn;
    if (theSign < 0) { theResult ^= MaskR30; }
    eStore(theCadr, Math.floor(theResult / pow_2_14) & MaskR15);
    eStore(theCadr + 1, theResult & MaskR14);
}

function setFlag(theFlag) {
    var theCadr = FLAGWRD0 + Math.floor(theFlag / 16);
    var theBit = 1 << ((theFlag - 1) % 15);
    e[theCadr] |= theBit;
}

function clearFlag(theFlag) {
    var theCadr = FLAGWRD0 + Math.floor(theFlag / 16);
    var theBit = 1 << ((theFlag - 1) % 15);
    e[theCadr] &= MaxUns - theBit;
}

function flagIsSet(theFlag) {
    var theCadr = FLAGWRD0 + Math.floor(theFlag / 16);
    var theBit = 1 << ((theFlag - 1) % 15);
    return (e[theCadr] & theBit) !== 0;
}

function flagIsClear(theFlag) {
    var theCadr = FLAGWRD0 + Math.floor(theFlag / 16);
    var theBit = 1 << ((theFlag - 1) % 15);
    return (e[theCadr] & theBit) == 0;
}

function o(theAddress) {
	return octal5(e[theAddress]);
}

function octal5(theValue) {	
	var theOctal = "";
	
	for (var ix=0; ix<5; ix++) {
		theOctal = "" + (theValue % 8) + theOctal;
		theValue = Math.floor(theValue / 8);
    }
	return theOctal;
}	

function octal(theValue) {	
	var theOctal = "";
	
	theValue = Math.abs(theValue);
	while (theValue > 0) {
		theOctal = "" + (theValue % 8) + theOctal;
		theValue = Math.floor(theValue / 8);
    }
	return theOctal;
}	

// To my surprise, because of the way the CCS instruction works, having this 
// available as a function actually simplifies certain code somewhat. Especially
// when trying to duplicate AGC code behavior. But make sure you understand
// how it works!
//
// Generalized usage of CCS:
//
//   CCS(FOO);
//   switch e[Q] {
//       case 0: {if e[FOO] was +NZ}; break;
//       case 1: {if e[FOO] was +0}; break;
//       case 2: {if e[FOO] was -NZ}; break;
//       case 3: {if e[FOO] was -0}; break;
//   }
//
// The value of e[Q] can also be explicitly checked, if fewer than 4 cases are expected.

function CCS(ecadr) {
    if (e[iTRACE] & itMEMccs)
		console.log("CSS("+octal5(ecadr)+")"+"   e["+octal5(ecadr)+"]="+o(ecadr));
	
	if (e[ecadr] == 0) {
		e[A] = 0;
		e[Q] = 1;
	} else if (e[ecadr] == 077777) {
		e[A] = 0;
		e[Q] = 3;
	} else if (e[ecadr] & 040000) {
		e[A] = (e[ecadr] ^ 077777) - 1;
		e[Q] = 2;
	} else {
		e[A] = e[ecadr] - 1;
		e[Q] = 0;
	}
	
    if (e[iTRACE] & itMEMccs)
		console.log("e[A]="+o(A)+"   e[Q]="+o(Q));
}
		