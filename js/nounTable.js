//
// nounTable.js - I decided that the easiest way to deal with all the 
//     nouns was to simply lift the noun tables verbatim from an actual
//     assembly listing. These are from Colossus 3. Service routines
//     are also provided to aid in interpreting these tables.
//
//     Symbolic names for nouns are also provided. I suspect progs.js 
//     will be the only user of these.

const nounsDebug = false;
const nounsScaleDebug = false;

if (nounsDebug) e[iTRACE] |= itNOUNTAB;
if (nounsScaleDebug) e[iTRACE] |= itSCALE;

var CompCode;
var SFindex;
var SFactor;
var SRoutine;

function setNounTabs() {
    if (flagIsSet(COMPUTER)) {            // CMC
        NNADTAB = ColossusNNADTAB;
		NNTYPTAB = ColossusNNTYPTAB;
		SFINTAB = ColossusSFINTAB;
		SFOUTTAB = ColossusSFOUTTAB;
		IDADDTAB = ColossusIDADDTAB;
		RUTMXTAB = ColossusRUTMXTAB;
    } else {                              // LGC
        NNADTAB = LuminaryNNADTAB;
		NNTYPTAB = LuminaryNNTYPTAB;
		SFINTAB = LuminarySFINTAB;
		SFOUTTAB = LuminarySFOUTTAB;
		IDADDTAB = LuminaryIDADDTAB;
		RUTMXTAB = LuminaryRUTMXTAB;
	}
}
	
// Notes on function names:
//
// - Function names that begin with 'n' (e.g. nIsValid()) apply to a given noun
// - Function names that begin with 'nc' (e.g. ncIsValid()) apply to a noun component
// - Function names of the form nIsXxxx or ncIsXxxx return a true or false indication
//     implied by the name IsXxxx
//
// -   dp = double precision
//   cadr = complete address
//     sf = scale factor
//    sfr = scale factor routine

// Is the specified Noun valid?

function nIsValid(theNoun) { 
    if (e[iTRACE] & itNOUNTAB) 
		console.log(nIsValid.caller.name+": nIsValid("+theNoun+")");
    
	var nOK = true;
    if (theNoun < 0) nOK = false;
    if (theNoun > 99) nOK = false;
    if (NNADTAB[theNoun] === undefined) nOK = false;
    if (NNADTAB[theNoun] === 0) nOK = false;

    if (e[iTRACE] & itNOUNTAB) console.log("nIsValid="+nOK);
    return nOK;
}

// Must the specified noun be loaded with a decimal value?
// (A return of false means octal values are allowed to be loaded.)
    
function nIsDecimalOnly(theNoun) { 
    if (e[iTRACE] & itNOUNTAB) 
		console.log(nIsDecimalOnly.caller.name+": nIsDecimalOnly("+theNoun+")");

	var nDO = false;
    if (theNoun < 40)
        CompCode = NNTYPTAB[theNoun] >> 10;
    else
        CompCode = NNADTAB[theNoun] >> 10;
    if (CompCode & 0x08) nDO = true;

    if (e[iTRACE] & itNOUNTAB) console.log("nIsDecimalOnly="+nDO);
    return nDO;
}

// Is the specified Noun protected from loading via the DSKY?
// (A return of false means the Noun can be loaded from the DSKY.)

function nIsNoLoad(theNoun) { 
    if (e[iTRACE] & itNOUNTAB) 
		console.log(nIsNoLoad.caller.name+": nIsNoLoad("+theNoun+")");

	var nNL = false;
    if (theNoun < 40)
        CompCode = NNTYPTAB[theNoun] >> 10;
    else
        CompCode = NNADTAB[theNoun] >> 10;

    if (CompCode & 0x10) nNL = true;
    if (e[iTRACE] & itNOUNTAB) console.log("nIsNoLoad="+nNL);
    return nNL;
}

// How many components does this noun have?

function nGetCompCount(theNoun) { 
    if (e[iTRACE] & itNOUNTAB) 
		console.log(nGetCompCount.caller.name+": nGetCompCount("+theNoun+")");

    var theRoutine, CompCode;
    
    if (theNoun < 40) {         // Normal Nouns
        theRoutine = (NNTYPTAB[theNoun] >> 5) & 0x1F;
        CompCode = (NNTYPTAB[theNoun] >> 10);
    } else {                    // Mixed Nouns
        theRoutine = RUTMXTAB[theNoun - 40];
        theRoutine = theRoutine & 0x1F;
        CompCode = NNADTAB[theNoun] >> 10;
    }

    CompCode = (CompCode & 0x03) + 1;
    if (e[iTRACE] & itNOUNTAB) 
		console.log("nGetCompCount="+CompCode);
    return CompCode;
}

// Set NOUNCADR to the address of the keyed-in Noun

function nSetCadr() { 
    if (e[iTRACE] & itNOUNTAB) 
		console.log(nSetCadr.caller.name+": nSetCadr()");

	if (e[NOUNREG] !== 15) {          // "Increment machine address" handled in Pinball
		if (eFetch(NOUNREG) < 40) {                       // Normal Nouns
			eStore(NOUNCADR, NNADTAB[eFetch(NOUNREG)]);
		} else {                                          // Mixed Nouns
			eStore(NOUNCADR, IDADDTAB[(NNADTAB[eFetch(NOUNREG)] & 0x3FF)]);
		}
	}
    if (e[iTRACE] & itNOUNTAB) console.log("NOUNCADR set to "+o(NOUNCADR));
}

// Are there enough components in the specified noun to satisfy the specified verb?
    
function ncIsValid() {
    if (e[iTRACE] & itNOUNTAB) 
		console.log(ncIsValid.caller.name+": ncIsValid()");

    var ncOK = true;                              // Assume true until proven otherwise        
    if (eFetch(VERBREG) < 30) {                   // This only applies to regular verbs
        var compNo = [1, 2, 3, 2, 3, 1, 1][(e[VERBREG] % 10)-1];
        if (nIsValid(e[NOUNREG])) {
            if (compNo > nGetCompCount(e[NOUNREG])) ncOK = false;
        } else {
            ncOK = false;
        }
    }

    if (e[iTRACE] & itNOUNTAB) console.log("ncIsValid="+ncOK);
    return ncOK;
}

// Is this a double-precision component?

function ncIsDp(dpNoun, dpComp) {
    if (e[iTRACE] & itNOUNTAB) 
		console.log(ncIsDp.caller.name+": ncIsDp("+dpNoun+", "+dpComp+")");
    var SFR, result;
    
    if (dpNoun < 40) {          // Normal Nouns
        SFR = (NNTYPTAB[dpNoun] >> 5) & 0x1F;
    } else {                    // Mixed Nouns
        SFR = RUTMXTAB[dpNoun - 40];
        SFR = SFR >> (5 * (dpComp - 1));
        SFR = SFR & 0x1F;
    }

    switch (SFR) {
        case 4: case 5: case 7: case 8: case 9: case 10: case 12: case 13:
            result = true;
            break;
        default:
            result = false;
    }
    
    if (e[iTRACE] & itNOUNTAB) console.log("ncIsDp="+result);
    return result;
}

// Return the address of the specified component

function ncGetCadr(theNoun, theComponent) {
    if (e[iTRACE] & itNOUNTAB) 
		console.log(ncGetCadr.caller.name+": ncGetCadr("+theNoun+", "+theComponent+")");

    var theRoutine, ncCadr;
    
    if (theNoun < 40) {                       // Normal Nouns
        theRoutine = (NNTYPTAB[theNoun] >> 5) & 0x1F;
        ncCadr = NNADTAB[theNoun];            // Fetch noun cadr from address table
        if (ncCadr & 040000) {                // If GMA, or GCA, or MA++ ...
            ncCadr = eFetch(NOUNCADR);        // ... return the currently set cadr
        }
        if (theRoutine !== 8) ncCadr += theComponent - 1;  // Normal noun comps are contig
    } else {                                  // Mixed Nouns
        ncCadr = IDADDTAB[(NNADTAB[theNoun] & 0x3FF) + theComponent - 1];
    }
    
    if (e[iTRACE] & itNOUNTAB) console.log("ncGetCadr="+octal5(ncCadr));
    return ncCadr;
}

// Get the numeric identifier of the Scale Factor Routine for the specified component

function ncGetSfr(theNoun, theComponent) { 
    if (e[iTRACE] & itNOUNTAB) 
		console.log(ncGetSfr.caller.name+": ncGetSfr("+theNoun+", "+theComponent+")");

    var theRoutine = 0;
    
    if (theNoun < 40) {      // Normal Nouns
        theRoutine = (NNTYPTAB[theNoun] >> 5) & 0x1F;
    } else {                    // Mixed Nouns
        theRoutine = RUTMXTAB[theNoun - 40];
        theRoutine = theRoutine >> (5 * (theComponent - 1));
        theRoutine = theRoutine & 0x1F;
    }
    
    if (e[iTRACE] & itNOUNTAB) console.log("ncGetSfr="+theRoutine);
    return theRoutine;
}

// Return the value of the Scale Factor for output-conversion of the specified component

function ncGetSfOut(theNoun, theComponent) { 
    if (e[iTRACE] & itNOUNTAB) 
		console.log(ncGetSfOut.caller.name+": ncGetSfOut("
	                +theNoun+", "+theComponent+")");

    var SFindex;
    
    if (theNoun < 40) {      
        SFindex = NNTYPTAB[theNoun];    // Normal Nouns
    } else {                
        SFindex = NNTYPTAB[theNoun];    // Mixed Nouns
        SFindex = SFindex >> (5 * (theComponent - 1));
    }
    SFindex = 2 * (SFindex & 0x1F);
    SFactor = (SFOUTTAB[SFindex] * pow_2_14) + SFOUTTAB[SFindex + 1];

    if (e[iTRACE] & itNOUNTAB) console.log("ncGetSfOut="+SFactor);
    return SFactor;
}

// Return the value of the Scale Factor for input-conversion of the specified component

function ncGetSfIn(theNoun, theComponent) {
    if (e[iTRACE] & itNOUNTAB) 
		console.log(ncGetSfIn.caller.name+": ncGetSfIn("+
	                theNoun+", "+theComponent+")");

    var SFindex;
    
    if (theNoun < 40) {
        SFindex = NNTYPTAB[theNoun];
    } else {
        SFindex = NNTYPTAB[theNoun];
        SFindex = SFindex >> (5 * (theComponent - 1));
    }
    SFindex = 2 * (SFindex & 0x1F);
    SFactor = (SFINTAB[SFindex] * pow_2_14) + SFINTAB[SFindex + 1];

    if (e[iTRACE] & itNOUNTAB) console.log("ncGetSfIn="+SFactor);
    return SFactor;
}

// Does the specified Scale Factor Routine operate on double-precision values?

function sfrIsDp(theSfr) { 
    if (e[iTRACE] & itNOUNTAB) 
		console.log(sfrIsDp.caller.name+": sfrIsDp("+theSfr+")");
	
    var result;

    switch (theSfr) {
        case 4: case 5: case 7: case 8: case 9: case 10: case 12: case 13:
            result = true;
            break;
        default:
            result = false;
    }
    if (e[iTRACE] & itNOUNTAB) console.log("sfrIsDp="+result);
    return result;
}

// Scale a component during input

function scaleIn(theComp) {  
    if (e[iTRACE] & itVERBSR) 
		console.log(scaleIn.caller.name+": scaleIn("+theComp+")");
    
    var inputError = false;
    var signIsMinus = false;
    var regValue = 0;

    var theREG = XREG + theComp - 1;
    var theREGLP = XREGLP + theComp - 1;
    var XYZ = ["X", "Y", "Z"][theComp - 1];
    
    var value = 0;
    eStore(IDAD1TEM, eFetch(theREG));
    eStore(IDAD2TEM, eFetch(theREGLP));
    value = dp2CofE(IDAD1TEM);
    value = (((value * 1e5) / pow_2_28) + 0.5) >>> 0;
    
    var scaleRoutine = ncGetSfr(e[NOUNREG], theComp);
    if (e[DECBRNCH] == 0) scaleRoutine = 0;            // No scaling of octal input
    var scaleFactor = ncGetSfIn(e[NOUNREG], theComp);
    if (scaleFactor == 0) scaleFactor = 1;             // No scale factor? Then identity
    
    if (e[iTRACE] & itSCALE) {
        console.log("Before scaling:");
        console.log("     e["+XYZ+"REG]="+o(theREG));
        console.log("     e["+XYZ+"REGLP]="+o(theREGLP));
        console.log("     value="+value);
        console.log("     sfin="+scaleFactor);
        console.log("     sfrtn="+scaleRoutine);
    }
    
    switch (scaleRoutine) {
        case 0:  // [1]:Octal only
            if (nIsDecimalOnly(e[NOUNREG]))
                inputError = true;
            break;
        case 1:  // [1]:Straight fractional
			eStore(theREG, value);
            break;
        case 2:  // [1]:CDU degrees (0 to 359.99)
            if (Math.abs(value) > 36000) {
                inputError = true;
            } else {
                if (value < 0) value = value + 36000;
                e[theREG] = Math.floor((value / 36000) * pow_2_15) % pow_2_15;
            }
            break;
        case 3:  // [1]:Arithmetic SF
            value = ((value / 1e5) * scaleFactor) >>> 0;
            e[theREG] = value >> 14;
            e[theREGLP] = value & MaskR14;
            if (Math.abs(value) > MaxMagn) inputError = true;
            break;
        case 4:  // [2]:Arith DP1
            value = ((value / 1e5) * scaleFactor) >>> 0;
            e[theREG] = (value / pow_2_14) >>> 0;
            e[theREGLP] = value % pow_2_14;
            break;
        case 5:  // [2]:Arith DP2
            value = ((value / 1e5) * scaleFactor * pow_2_7) >>> 0;
            e[theREG] = (value / pow_2_14) >>> 0;
            e[theREGLP] = value % pow_2_14;
            break;
        case 6:  // [1]:Y Optics Degrees
            if ((value >= 90000) || (value < 0)) {
                inputError = true;
            } else {
                value -= 19775;   // Optics bias
                value = ((value / 90000) * pow_2_15) >>> 0;
                if (value < 0) value += MaxUns;
                e[theREG] = value % pow_2_15;
            }
            break;
        case 7:  // [2]:Arith DP3
            value = (value * (scaleFactor / 1e5)) >>> 0;
            e[theREG] = ((value / pow_2_14) >>> 0) % pow_2_14;
            e[theREGLP] = (value % pow_2_14) >>> 0;
            break;
        case 8:   // [2]:R1=00HHH R2=000MM R3=0SSmm
            if (theComp == 1) {
                regValue = (e[XREG] << 14) + e[XREGLP];
                e[XREGLP] = (((regValue * 1e5) / pow_2_28) + 0.5) >>> 0;
                regValue = (e[YREG] << 14) + e[YREGLP];
                e[YREGLP] = (((regValue * 1e5) / pow_2_28) + 0.5) >>> 0;
                regValue = (e[ZREG] << 14) + e[ZREGLP];
                e[ZREGLP] = (((regValue * 1e5) / pow_2_28) + 0.5) >>> 0;
                
                if ((e[YREGLP] > 59) || (e[ZREGLP] > 5999))
                    inputError = true;

                value  = e[XREGLP] * 360000;
                value += e[YREGLP] * 6000;
                value += e[ZREGLP];
                value = value >>> 0;

                if (value > dpMaxMagn) 
                    inputError = true;

                if (!inputError) {
                    e[XREG] = (value / pow_2_14) >>> 0;
                    e[XREGLP] = (value % pow_2_14) >>> 0;
                }
            }
            break;
        case 10: // [2]:Arith DP4 [x]
            value = Math.floor((value / 1e5) * scaleFactor * pow_2_28 * pow_2_3);
            e[theREG] = value >> 14;
            e[theREGLP] = value % ModMagn;
            if (signIsMinus) {
                e[theREG] ^= MaxUns;
                e[theREGLP] ^= MaxUns;
            }
            break;
        case 11: // [1]:Arith 1 SF
            e[theREG] = Math.round((value / 1e5) * scaleFactor * pow_2_14);
            break;
        case 13: // [2]:DP straight fractional
            // e[theREG]   = ((value * pow_2_14) * 1e5) & MaxMagn;
            // e[theREGLP] = ((value * pow_2_28) * 1e5) & MaxMagn;
            break;
        default:  // cases 9 & 12 will end up here -- input not allowed
            inputError = true;
    }
                
    if (e[iTRACE] & itSCALE) {
        console.log("After scaling:");
        console.log("     e["+XYZ+"REG]="+o(theREG));
        console.log("     e["+XYZ+"REGLP]="+o(theREGLP));
        console.log("     value="+value);
    }
    
    if (inputError) setAlert(aOPR_ERR);
    return !inputError;
}

// Scale a component for output

function scaleOutput(theValue, SFRTN, OSF) { // theValue can be negative
    if (e[iTRACE] & itNOUNTAB) 
		console.log(scaleOutput.caller.name+": scaleOutput("+
	                theValue+", "+SFRTN+", "+OSF+")");
    
    var scaledValue;
	var precisionScaleFactor = (sfrIsDp(SFRTN)) ? pow_2_28 : pow_2_14;
    
    scaledValue = theValue / precisionScaleFactor;
    if (e[iTRACE] & itSCALE) console.log("{1}scaledValue="+scaledValue);

    if (OSF != 0) {
        scaledValue *= OSF / precisionScaleFactor;
        if (e[iTRACE] & itSCALE) console.log("{2}scaledValue="+scaledValue);
    }
    
    switch (SFRTN) {
        case 0:  // Octal
            scaledValue = theValue;
            break;
        case 1:  // Straight fractional
            scaledValue *= 1e5;
            break;
        case 2:  // CDU Degrees (XXX.XX)
            scaledValue /= 2;
            scaledValue = ((scaledValue * 36000) + 0.5) >>> 0;
            break;
        case 3:  // Arithmetic SP
            scaledValue = theValue;
            if (theValue & spSign) {
                scaledValue %= pow_2_14;
                scaledValue = scaledValue - pow_2_14 + 1;
            }
            break;
        case 4:  // Arith DP1
            scaledValue *= 1e5;
            scaledValue *= pow_2_14;
            break;
        case 5:  // Arith DP2
            scaledValue *= 1e5;
            break;
        case 6:  // Y Optics Degrees (XX.XXX)
            scaledValue = theValue;
            scaledValue /= pow_2_15;
            scaledValue *= 90000;
            scaledValue += 19775;
            scaledValue = (scaledValue + 0.5) >>> 0
            break;
        case 7:  // Arith DP3
            scaledValue *= 1e5;
            scaledValue *= pow_2_7;
            break;
        case 8:  // R1=00HHH R2=000MM R3=0SSmm
            scaledValue *= 1e5;
            break;
        case 9:  // MM SS
            scaledValue *= 1e5;
            break;
        case 10:  // Arith DP4
            if (theValue < 0) {
                scaledValue = (-theValue) / precisionScaleFactor;
                if (OSF != 0) scaledValue *= OSF / precisionScaleFactor;
                scaledValue = -scaledValue;
            }
            scaledValue *= 1e5;
            break;
        case 11:  // Arith 1 SP
            if (theValue & spSign) {
                scaledValue %= pow_2_14;
                scaledValue = scaledValue - pow_2_14 + 1;
            }
            scaledValue *= 1e5;
            break;
        case 12:  // XX XX
            scaledValue *= 1e5;
            break;
        case 13:  // DP Straight Fractional
            scaledValue *= 1e10;
            break;
    }

    if (e[iTRACE] & itSCALE) console.log("{3}scaledValue="+scaledValue);

    return Math.round(scaledValue);
}

// Notes:
//
// * IN LOADING AN 'HOURS, MINUTES, SECONDS' NOUN, ALL 3 WORDS MUST BE
//   LOADED, OR ALARM.
//
// * ALARM IF AN ATTEMPT IS MADE TO LOAD 'SPLIT MINUTES/SECONDS' (MM SS).
//   THIS IS USED FOR DISPLAY ONLY.
//
// ==========================================================================
//   Component
//   Code       Interpretation
//   ---------  --------------
//   00000      1 component
//   00001      2 components
//   00010      3 components
//   X1XXX      Decimal only
//   1XXXX      No load
// ==========================================================================
//    SF
//    Routine
//    Code     Interpretation
//    -------  --------------
//  0 00000    Octal only
//  1 00001    Straight Fractional
//  2 00010    CDU Degrees (XXX.XX)
//  3 00011    Arithmetic SP
//  4 00100    Arith DP1  **Out(Mult by 2EXP14 at end)  **In(Straight)
//  5 00101    Arith DP2  **Out(Straight)               **In(SL 7 at end)
//  6 00110    Y Optics degrees (XX.XXX max 89.999)
//  7 00111    Arith DP3  **Out(SL 7 at end)            **In(Straight)
//  8 01000    Whole hours in R1, whole minutes in R2, seconds (0XX.XX) in R3
//  9 01001    MM SS (max 59 59)
// 10 01010    Arith DP4  **Out(Straight)               **In(SL 3 at end)
// 11 01011    Arith SF   **Out(mult by 2EXP14 at end)  **In(Straight)
// 12 01100    XX XX
// 13 01101    DP straight fractional
// ==========================================================================
//    SF
//    Constant
//    Code     Interpretation
//    -------- --------------
//  0 00000    Whole
//  0 00000    DP Time in seconds (XXX.XX seconds)
//  1 00001    unused
//  2 00010    CDU degrees
//  2 00010    Y optics degrees
//  3 00011    DP degrees (90) XX.XXX
//  4 00100    DP degrees (360) XXX.XX
//  5 00101    Degrees (180) XXX.XX
//  6 00110    Weight (XXXXX. lbs)
//  7 00111    Position5 (XXX.XX nmi)
//  8 01000    Position4 (XXXX.X nmi)
//  9 01001    Velocity2 (XXXXX. ft/sec)
// 10 01010    Velocity3 (XXXX.X ft/sec)
// 11 01011    Elevation degrees (+0..+89.999)
// 12 01100    Trim degrees (XXX.XX deg)
// 13 01101    Inertia (XXXXXB8. slug ft ft)
// 13 01101    Thrust moment (XXXXXB8. ft lbs)
// 14 01110    Velocity/2VS (XXXXX. ft/sec)
// 15 01111    Position6 (XXXX.X nmi)
// 16 10000    Drag acceleration (XXX.XX G)
// 17 10001    Position8 (XXXX.X nmi)
// 18 10010    Position9 (XXXXX. ft)
// 19 10011    Velocity4 (XXXX.X ft/sec)
// ==========================================================================

// Noun-Address-Table
//
// NOTE: These tables and addresses are specific to Colossus 3 (Apollos 15-17)
//
// 100 1-word entries: 0..99 (both Normal and Mixed nouns)
// Indexed by noun ID
//
// For Normal nouns : contains the ECADR of the noun data
// For Mixed nouns  : bits 15:11 contain the component code
//                    bits 10:1 contain an index into IDADDTAB

var NNADTAB;

var ColossusNNADTAB =  [ 
        000000, 040000, 040000, 040000, 000000,   // 0
		001250, 000775, 001206, 001363, 000375, 
		077776, 002462, 001255, 002460, 002355,   // 10
		077777, 001254, 001013, 001307, 000000, 
		000032, 000037, 001307, 000000, 001254,   // 20
		001250, 001016, 001362, 003774, 001250, 
		001250, 003735, 002336, 003412, 001250,   // 30
		003660, 000024, 003662, 001516, 002640, 
		064000, 002003, 024006, 024011, 064014,   // 40
		064017, 002022, 022025, 022030, 024033, 
		064036, 022041, 000044, 024047, 024052,   // 50
		024055, 022060, 000000, 024066, 024071, 
		024074, 024077, 024102, 064105, 024110,   // 60
		024113, 024116, 024121, 024124, 024127, 
		004132, 004135, 000000, 004143, 004146,   // 70
		064151, 000000, 000000, 024162, 022165, 
		064170, 024173, 024176, 024201, 024204,   // 80
		024207, 024212, 002215, 024220, 024223, 
		024226, 002231, 002234, 004237, 002242,   // 90
		004245, 024250, 004253, 004256, 024261 ];
		
var LuminaryNNADTAB = [
        000000, 040000, 040000, 040000, 001044,   // 0
		001044, 001143, 001002, 001363, 000375,
		077776, 003633, 001050, 001774, 001050,   // 10
		077777, 001050, 000000, 002335, 000000,
		000032, 000037, 000321, 000000, 001050,   // 20
		001044, 002371, 001362, 000000, 000000,
		000000, 000000, 002133, 003441, 001044,   // 30
		003453, 000024, 003635, 001516, 000000,
		064000, 002003, 024006, 024011, 064014,   // 40
		064017, 002022, 022025, 022030, 024033,
		000000, 022041, 000044, 000000, 024052,   // 50
		024055, 002060, 000000, 024066, 024071,
		024074, 064077, 064102, 024105, 064110,   // 60
		024113, 062116, 004121, 064124, 024127,
		004132, 004135, 002140, 002143, 064146,   // 70
		064151, 024154, 064157, 064162, 024165,
		002170, 024173, 024176, 024201, 024204,   // 80
		024207, 024212, 002215, 024220, 024223,
		024226, 004231, 004234, 004237, 064242,   // 90
		000000, 000000, 004253, 004256, 024261 ];

// Noun-Type-Table
//
// 100 1-word entries: 0..99 (both Normal and Mixed Nouns)
// Indexed by noun ID
//
// For Normal nouns : bits 15:11 contain the component code
//                    bits 10:6 contain the SF routine #
//                    bits 5:1 contain the SF constant #
// For Mixed nouns  : bits 15:11 contain the SF constant # for component 3
//                    bits 10:6 contain the SF constant # for component 2
//                    bits 5:1 contain the SF constant # for component 1

var NNTYPTAB;

var ColossusNNTYPTAB = [ 
        000000, 004040, 004140, 004102, 000000,   // 0
		000504, 002000, 004000, 004000, 004000,
		000000, 024400, 002000, 024400, 000511,   // 10
		000000, 024400, 004102, 004102, 000000,
		004102, 004140, 004102, 000000, 024400,   // 20
		004140, 004000, 000140, 020140, 020102,
		004140, 024400, 024400, 024400, 024400,   // 30
		024400, 024400, 024400, 024400, 024400, 
		024500, 000542, 024410, 020204, 000410,   // 40
		010000, 000000, 000306, 000614, 000507, 
		000417, 000204, 000004, 010507, 010507,   // 50 
		010200, 000444, 000000, 024510, 024512,
		010440, 000204, 020451, 000457, 036460,   // 60
		000000, 037044, 010217, 034444, 035004,
		000000, 000000, 000000, 010450, 040444,   // 70
		000010, 000000, 000000, 010204, 000113, 
		022440, 024512, 024512, 024512, 024512,   // 80
		024512, 022451, 000102, 000000, 016143,
		024507, 000102, 000102, 006143, 000102,   // 90
		022440, 024507, 000000, 000000, 001162 ];

var LuminaryNNTYPTAB = [ 
		000000, 004040, 004140, 004102, 000504,   // 0
		000504, 004000, 004000, 004000, 004000,
		000000, 024400, 002000, 024400, 004140,   // 10
		000000, 024400, 000000, 004102, 000000, 
		004102, 004140, 004102, 000000, 024400,   // 20
		004140, 004000, 000140, 000000, 000000,
		000000, 000000, 024400, 024400, 024400,   // 30 
		024400, 024400, 024400, 024400, 000000,
		024500, 000542, 024410, 020204, 000410,   // 40
		010000, 000000, 000306, 001367, 000507,
		000000, 000204, 000004, 000000, 010507,   // 50
		010200, 000204, 000000, 024510, 024512, 
		060535, 054000, 024012, 060530, 060500,   // 60
		000000, 000016, 053223, 024026, 061430,
		000000, 000000, 000102, 000102, 010200,   // 70
		000010, 020512, 024500, 000654, 000102,
		000200, 024512, 024512, 024512, 024512,   // 80
		024512, 024512, 000102, 000000, 016143, 
		010507, 010450, 060500, 006143, 060512,   // 90
		000000, 000000, 000000, 000000, 071572 ];

// SF-Input-Table
//
// 20 2-word entries
// Indexed by SF-Constant-Code

var SFINTAB;

var ColossusSFINTAB  = [ 
        000006, 003240,   000000, 000000,   000000, 000000,   010707, 003435,    // 0
        013070, 034345,   000005, 021616,   026113, 031713,   000070, 020460,    // 4
        001065, 005740,   011414, 031463,   007475, 016051,   000001, 003434,    // 8
        000002, 022245,   000014, 035607,   007606, 006300,   016631, 011307,    // 12
        012000, 000000,   027176, 014235,   001670, 020000,   007475, 016051 ];  // 16

var LuminarySFINTAB  = [ 
        000006, 003240,   000000, 000000,   000000, 000000,   010707, 003435,    // 0
        013070, 034345,   000005, 021616,   026113, 031713,   000070, 020460,    // 4
        001065, 005740,   011414, 031463,   007475, 016051,   000001, 003434,    // 8
        000047, 021135,   077766, 050711,   000005, 025006,   000002, 023224,    // 12
        000014, 006500,   000001, 003036,   004256, 007071,   077766, 060557,    // 16
		000005, 001114,   000007, 001247,   004324, 027600,   000036, 020440,    // 20
		000035, 030400,   023420, 000000,   001670, 020000,   007475, 016051,    // 24
		014400, 000000,   036365, 030244 ];                                      // 28

// SF-Output-Table
//
// 20 2-word entries
// Indexed by SF-Constant-Code

var SFOUTTAB;

var ColossusSFOUTTAB = [ 
        005174, 013261,   000000, 000000,   000000, 000000,   000714, 031463,    // 0
        013412, 007534,   005605, 003656,   000001, 016170,   000441, 034306,    // 4
        007176, 021603,   015340, 015340,   001031, 021032,   034631, 023146,    // 8
        014340, 024145,   002363, 003721,   020373, 002122,   000424, 030446,    // 12
        000631, 023146,   000260, 006213,   004231, 027400,   001031, 021032 ];  // 16

var LuminarySFOUTTAB = [ 
        005174, 013261,   000000, 000000,   000000, 000000,   000714, 031463,    // 0
        013412, 007534,   005605, 003656,   000001, 016170,   000441, 034306,    // 4
        007176, 021603,   015340, 015340,   001031, 021032,   034631, 023146,    // 8
        000636, 014552,   074552, 070307,   005520, 015312,   014226, 031757,    // 12
        002476, 005531,   035152, 021203,   000007, 013734,   074477, 050643,    // 16
		006265, 016004,   004426, 031433,   034772, 007016,   001030, 033675,    // 20
		001046, 015700,   000321, 026706,   004231, 027400,   001031, 021032,    // 24
		012172, 034122,   000206, 014206 ];                                      // 28

// Indirect-Address-Table
//
// 60 3-word entries (Mixed nouns only)
// Indexed by the value in NNADTAB.
//
// Each word contains the ECADR of the Noun component (1, 2, 3)

var IDADDTAB;

var ColossusIDADDTAB = [ 
        003660, 003762, 003425,   001250, 001251, 000000,    // 40
		002354, 002356, 003762,   000746, 000750, 000752,
		002342, 002344, 002334,   000771, 003660, 003625,
		003065, 003066, 000000,   003073, 003072, 000000,
		003023, 003024, 000000,   003501, 003503, 003505,
		002346, 002344, 002334,   002311, 002313, 000000,    // 50
		002632, 000000, 000000,   002311, 002313, 002315,
		002311, 002313, 002315,   003765, 003743, 003753,
		003633, 003631, 000000,   000000, 000000, 000000,
		002640, 002634, 002636,   002610, 002612, 002614,
		003721, 003756, 003760,   003400, 003402, 003326,    // 60
		003722, 003740, 003736,   003713, 003724, 003726,
		003637, 003722, 003713,   000013, 000013, 000013,
		003315, 003675, 003715,   003713, 000746, 000750,
		003315, 003722, 003677,   003315, 003174, 003756,
		001140, 003751, 003752,   001140, 003751, 003752,    // 70
		000000, 000000, 000000,   003620, 003622, 003624,
		003315, 003722, 003637,   002632, 002546, 003655,
		000000, 000000, 000000,   000000, 000000, 000000,
		003741, 003737, 001352,   003372, 003373, 000000,
		003660, 003762, 003425,   003404, 003406, 003410,    // 80
		003537, 003541, 003543,   003674, 003676, 003700,
		003537, 003541, 003543,   003664, 003666, 003670,
		003404, 003406, 003410,   003725, 003727, 000000,
		003704, 003706, 003710,   000746, 002350, 002352,
		001755, 001757, 001761,   000036, 000035, 000000,    // 90
		002773, 002775, 000000,   002757, 002761, 002763,
		003725, 003727, 000000,   003660, 003724, 003722,
		002311, 002313, 002315,   001250, 001251, 001252,
		001253, 001254, 001255,   002311, 002313, 002315];

var LuminaryIDADDTAB = [ 
        003453, 003663, 003507,   001044, 001045, 000000,    // 40
		002307, 002311, 003663,   001117, 001121, 001123,
		002112, 002114, 002131,   003462, 003453, 002243,
		001340, 000374, 000000,   001326, 001327, 000000,
		003002, 003001, 000000,   000314, 000316, 001353,
		000000, 000000, 000000,   002171, 002173, 000000,    // 50
		001753, 000000, 000000,   000000, 000000, 000000,
		002213, 002215, 002217,   003466, 002247, 003620,
		002171, 002173, 000000,   000000, 000000, 000000,
		003605, 003575, 002340,   002273, 002275, 002277,
		003734, 003473, 003774,   003475, 003453, 002613,    // 60
		003471, 003453, 003507,   003664, 003473, 003774,
		003666, 003473, 003534,   000013, 000013, 000013,
		002177, 000000, 000000,   002171, 002173, 002175,
		002613, 003475, 003471,   002635, 002633, 002631,
		001235, 001236, 001237,   001235, 001236, 001237,    // 70
		000035, 000036, 000000,   001106, 001107, 000000,
		003453, 002353, 002355,   003577, 002243, 002245,
		002267, 002263, 003642,   003453, 003503, 003471,
		001330, 001331, 001271,   001240, 001241, 000734,
		003733, 003734, 000000,   003433, 003435, 003437,    // 80
		003433, 003435, 003437,   003622, 003624, 003626,
		001250, 001252, 001254,   003501, 003503, 003505,
		003433, 003435, 003437,   001344, 001345, 000000,
		002706, 002710, 002712,   002706, 002710, 002712,
		002171, 002173, 002175,   003715, 003711, 003713,    // 90
		003750, 003473, 003774,   002737, 002741, 002743,
		003501, 003473, 003534,   000000, 000000, 000000,
		000000, 000000, 000000,   001044, 001045, 001046,
		001047, 001050, 001051,   002171, 002173, 002175];

// SF-Routine-Mixed-Table
//
// 60 1-word entries 40..99 (Mixed nouns only)
// Indexed by noun ID - 40
//
// Bits 15:11 contain the SF routine # for component 3
// Bits 10:6 contain the SF routine # for component 2
// Bits 5:1 contain the SF routine # for component 1

var RUTMXTAB;

var ColossusRUTMXTAB = [ 
        016351, 000142, 016347, 016512, 022347,   // 40
        024454, 000000, 000553, 000143, 006344, 
        022347, 000512, 000012, 024344, 024344,   // 50
        024503, 000512, 000007, 016347, 016347, 
        024503, 006512, 016512, 022507, 016505,   // 60
        020410, 016352, 024507, 024512, 024252, 
        000000, 000000, 000000, 024507, 012512,   // 70
        022447, 000000, 000000, 024512, 000103, 
        024511, 016347, 016347, 016347, 016347,   // 80
        016347, 024512, 000302, 032655, 010347, 
        016344, 000302, 000302, 016347, 000302,   // 90
        024511, 016344, 006143, 006043, 006247 ];
                 
var LuminaryRUTMXTAB = [ 
        016351, 000142, 016347, 016512, 022347,   // 40
        024443, 000000, 000553, 000143, 006344, 
        000000, 000512, 000012, 000000, 024344,   // 50
        024503, 000512, 000000, 016347, 016347, 
        010347, 024451, 016447, 010344, 010354,   // 60
        020410, 000304, 010204, 016452, 010204, 
        000000, 000000, 000115, 000115, 024511,   // 70
        022447, 016347, 016351, 022756, 006102, 
        000503, 016347, 016347, 016347, 016347,   // 80
        016347, 016347, 000102, 002041, 010347, 
        024344, 024507, 010343, 016347, 010347,   // 90
        000000, 000000, 006143, 006043, 024247 ];
                 
/////////////////////////////////////////////
// --- Symbolic names for noun storage --- //
/////////////////////////////////////////////

const FAILREG  = 00375;
const LAT      = 00746;
const LANDLAT  = 00746;
const LONG     = 00750;
const ALT      = 00752;
const VHFCNT   = 00771;
const OPTION1  = 00775;
const CPHIX    = 01013;
const N26PRI   = 01016;
const STARCODE = 01140;
const DSPTEM1  = 01250;
const DSPTEM2  = 01254;
const DSPTEMX  = 01254;
const OPTIONX  = 01255;
const TCO      = 01300;  // unique to iDSKY -- time-of-cutoff used by prog 15
const THETAD   = 01307;
const AZIMANGL = 01352;
const SMODE    = 01362;  // 4 = CORE CHECK  5 = ROPE CHECK  10 = BOTH
const ALMCADR  = 01363;
const TET      = 01516;
const TEPHEM   = 01706;
const YCSM     = 01755;
const YDOTC    = 01757;
const YDOTL    = 01761;
const RHOSB    = 02311;
const RANGE    = 02311;
const WWPOS    = 02311;
const GAMMASB  = 02313;
const RRATE    = 02313;
const WWVEL    = 02313;
const RTHETA   = 02313;
const RRATE2   = 02315;
const WWOPT    = 02315;
const TFF      = 02334;
const TPER     = 02336;
const HAPOX    = 02342;
const HPERX    = 02344;
const RSPRREC  = 02346;
const LANDLONG = 02350;
const LANDALT  = 02352;
const HAPO     = 02354;
const VCO      = 02355;
const HPER     = 02356;
const TCDH     = 02460;
const TCSI     = 02462;
const T1TOT2   = 02546;
const DVLOS    = 02610;
const ACTCENT  = 02632;
const DIFFALT  = 02632;
const DELVTPI  = 02634;
const DELVTPF  = 02636;
const T3TOT4   = 02640;
const POSTTPI  = 02640;
const OGC      = 02757;
const SAC      = 02773;
const PAC      = 02775;
const PACTOFF  = 03023;
const YACTOFF  = 03024;
const DAPDATR1 = 03065;
const DAPDATR2 = 03066;

const LEMMASS  = 03072;
// All values in this table are pounds
//                    Ap08   Ap09   Ap10   Ap11   Ap12   Ap13   Ap14   Ap15   Ap16   Ap17
//        At launch  19900  32132  30735  33297  33587  33502  33652  36222  36255  36279
//        After LOI     --     --  30732  33295  33584     --  33649  36220  36252  36276
//       At landing     --     --     --  16153  16564     --  16372  18175  18208  17808
// At lunar liftoff     --  10216   8273  10777  10750     --  10780  10915  10958  11005
//   At LM jettison     --   5616   5243   5463   5437  24647   5307   5325   5306   5277

const CSMMASS  = 03073;
// All values in this table are pounds
//                    Ap08   Ap09   Ap10   Ap11   Ap12   Ap13   Ap14   Ap15   Ap16   Ap17
//        At launch  63531  59086  63567  63508  63578  63812  64464  66955  67010  66951
//        After LOI  46743     --  38697  38743  38751     --  38174  40109  41395  40264
//     At entry I/F  12171  12257  12137  12096  12277  12361  12704  12953  13015  13140

const Q7       = 03174;
const ROLLC    = 03315;
const HEADSUP  = 03326;
const RATEPTC  = 03372;
const DBPTC    = 03373;
const LATSPL   = 03400;
const LNGSPL   = 03402;
const DELVLVC  = 03404;
const TIG      = 03412;
const DVTOTAL  = 03425;
const N49DISP  = 03501;
const DELVOV   = 03537;
const P21ALT   = 03620;
const P21VEL   = 03622;
const P21GAM   = 03624;
const MGA      = 03625;
const RTEDVD   = 03631;
const RTEGAM2D = 03633;
const D        = 03637;
const T2TOT3   = 03655;
const TTOGO    = 03660;
const TTPI     = 03662;
const VGBODY   = 03664;
const DELVIMU  = 03674;
const XRNGERR  = 03675;
const RDOT     = 03677;
const STARSAV3 = 03704;
const RTGO     = 03713;
const RTGON64  = 03713;
const RTGON67  = 03713;
const DNRNGERR = 03715;
const GMAX     = 03721;
const VMAGI    = 03722;
const VNOW     = 03722;
const VIO      = 03724;
const VGTLI    = 03724;
const MRKBUFF1 = 03722;
const TTE      = 03726;
const AGEOFW   = 03735;
const ALTI     = 03736;
const UTPIT    = 03737;
const HDOT     = 03740;
const UTYAW    = 03741;
const ELEV     = 03743;
const LANDMARK = 03751;
const HORIZON  = 03752;
const CENTANG  = 03753;
const VPRED    = 03756;
const VL       = 03756;
const GAMMAEI  = 03760;
const VGDISP   = 03762;
const NN1      = 03765;
