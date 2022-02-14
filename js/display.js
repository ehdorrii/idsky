//
// display.js - The parts of pinball that control the display are roughly
//     half of pinball, so those routines are separated out here.
//

/*
    DSPTAB
    RELADD  CHAN  RELAYWD   -15- 14 13 12 -11- 10 09 08 07 06  05 04 03 02 01
      +0    0o10   0001     SVRQ          R3S- --R3D4 (1)----  --R3D5 (0)----
      +1    0o10   0010     SVRQ          R3S+ --R3D2 (3)----  --R3D3 (2)----
      +2    0o10   0011     SVRQ               --R2D5 (5)----  --R3D1 (4)----
      +3    0o10   0100     SVRQ          R2S- --R2D3 (7)----  --R2D4 (6)----
      +4    0o10   0101     SVRQ          R2S+ --R2D1 (9)----  --R2D2 (8)----
      +5    0o10   0110     SVRQ          R1S- --R1D4 (11)---  --R1D5 (10)---
      +6    0o10   0111     SVRQ          R1S+ --R1D2 (13)---  --R1D3 (12)---
      +7    0o10   1000     SVRQ                               --R1D1 (14)---
      +8    0o10   1001     SVRQ               ---ND1 (17)---  ---ND2 (16)---
      +9    0o10   1010     SVRQ               ---VD1 (19)---  ---VD2 (18)---
     +10    0o10   1011     SVRQ               ---MD1 (21)---  ---MD2 (20)---
     +11    0o11   1100     SVRQ                        OPR    KEY   UPLK  
                                                        ERR    REL   ACTY 
                                                           VN     TEMP  COMP
                                                           FLASH        ACTY
                                                        07 06  05 04 03 02
 
   Bit 15 in each DSPTAB entry is a service request bit (SVRQ) indicating that the 
   corresponding DSPTAB entry has been changed and needs to be processed.
   
   The RELAYWD is *not* part of the DSPTAB: it is inserted into bits 15-12 of the word
   (again, NOT in DSPTAB) prior to outputting the word to its channel.
   
   The 5-bit output relay codes are:
   
   Blank   00000         3   11011         7   10011
       0   10101         4   01111         8   11101
       1   00011         5   11110         9   11111
       2   11001         6   11100
       
   The alerts delivered to the DSKY on channel 11 (0o13) are not maintained in DSPTAB.
   They bits of channel 11 are assigned as follows:
   
       Bits 15-10  -  unassigned
            Bit 9  -  PROG
            Bit 8  -  TRACKER
            Bit 7  -  unassigned
            Bit 6  -  GIMBAL LOCK
            Bit 5  -  ALT
            Bit 4  -  NO ATT
            Bit 3  -  VEL
         Bits 2-1  -  unassigned
*/

const displayDebug = false;
if (displayDebug) e[iTRACE] |= itDISPLAY;

// This (sparse) array is used to remember the states of the Alerts

var AlertsCh = [];

AlertsCh[8] = 0;          // Alerts delivered on Channel 8
//  VEL (LM only), NO ATT, ALT (LM only), GIMBAL LOCK, TRACKER, PROG

AlertsCh[9] = 0;          // Alerts delivered on Channel 9
//  COMP ACTY, UPLINK ACTY, TEMP, KEY REL, flash verb/noun, OPR ERR

AlertsCh[11] = 0;         // Alerts delivered on Channel 11
//  test lights, STBY, RESTART      
//    "test lights" tells the DSKY to illuminate STBY and RESTART for the duration of the
//    test (RESTART is really a separate discrete. I put it here for convenience.)

var OUT0;                 // channel buffer

const dtMD1  = 21;
const dtMD2  = 20;
const dtVD1  = 19;
const dtVD2  = 18;
const dtND1  = 17;
const dtND2  = 16;
const dtR1D1 = 14;
const dtR1D2 = 13;
const dtR1D3 = 12;
const dtR1D4 = 11;
const dtR1D5 = 10;
const dtR2D1 = 9;
const dtR2D2 = 8;
const dtR2D3 = 7;
const dtR2D4 = 6;
const dtR2D5 = 5;
const dtR3D1 = 4;
const dtR3D2 = 3;
const dtR3D3 = 2;
const dtR3D4 = 1;
const dtR3D5 = 0;

function updateDisplay() {
    // if (e[iTRACE] & itDISPLAY) console.log("updateDisplay()");
    
	if (!testAlert(aTEST_LIGHTS)) {
        for (var offset=12; offset>=0; offset--) {   // For each word in DSPTAB
            if (e[DSPTAB+offset] & Bit15) {          // If the SVRQ bit is set...
                OUT0 = e[DSPTAB+offset] & MaskR11;   // Mask off SVRQ bit
                OUT0 |= (offset+1) << 11;            // Put relay word into high bits
                agcToDsky(8, OUT0);                  // Send to DSKY
                e[DSPTAB+offset] ^= Bit15;           // Turn off the SVRQ bit
            }
        }
        
        // ---Alerts on Channel 9---
    //*D*//    agcToDsky(9, AlertsCh[9]);

        // ---Alerts on Channel 11---
    //*D*//    agcToDsky(11, AlertsCh[11]);
    }
}

function showOctal(theRegister, theValue) {
    if (e[iTRACE] & itDISPLAY) 
		console.log(showOctal.caller.name+": showOctal("+
	                theRegister+", "+octal5(theValue)+")");
    
    var isError = false;
    
    if (theValue === NaN) isError = progAlert(02001, 00203, theRegister);
    if (theValue === undefined) isError = progAlert(02003, 00203, theRegister);
    if (isError) {
        console.trace();
        return;
     }
     
    var theMask, theShift;

    var dtIndex = [dtR1D5, dtR2D5, dtR3D5][theRegister-1];
    var dtLimit = dtIndex + 5;
    var dtSign = [5, 3, 0][theRegister-1];
    
    e[DSPTAB+dtSign] &= MaxUns - Bit11;
    e[DSPTAB+dtSign+1] &= MaxUns - Bit11;
    
    for (; dtIndex<dtLimit; dtIndex++) {
        e[DSREL] = Math.floor(dtIndex / 2);
        theShift = (dtIndex % 2) * 5;
        theMask = MaskR5 << theShift;
        e[DSPTAB+e[DSREL]] &= MaxUns ^ theMask;
        e[DSPTAB+e[DSREL]] |= RelayCodes[theValue % 8] << theShift;
        e[DSPTAB+e[DSREL]] |= Bit15;
        theValue = Math.floor(theValue / 8);
    }
}

function showSP(theRegister, theValue) {
    if (e[iTRACE] & itDISPLAY) 
		console.log(showSP.caller.name+": showSP("+
	                theRegister+", "+theValue+")");
    
    var isError = false;
    
    if (theValue === NaN) isError = progAlert(02001, 00204, theRegister);
    if (theValue === undefined) isError = progAlert(02003, 00204, theRegister);
    if (isError) return;
     
    var theMagnitude = Math.floor(Math.abs(theValue)) % 1e5;
    
    var dtIndex = [dtR1D5, dtR2D5, dtR3D5][theRegister-1];
    var dtLimit = dtIndex + 5;
    var dtSign = [5, 3, 0][theRegister-1];
    
    e[DSPTAB+dtSign] &= MaxUns - Bit11;
    e[DSPTAB+dtSign+1] &= MaxUns - Bit11;
    if (theValue >= 0) dtSign++;
    e[DSPTAB+dtSign] |= Bit11;
    
    for (; dtIndex<dtLimit; dtIndex++) {
        e[DSREL] = Math.floor(dtIndex / 2);
        var theShift = (dtIndex % 2) * 5;
        theMask = MaskR5 << theShift;
        e[DSPTAB+e[DSREL]] &= MaxUns ^ theMask;
        e[DSPTAB+e[DSREL]] |= RelayCodes[theMagnitude % 10] << theShift;
        e[DSPTAB+e[DSREL]] |= Bit15;
        theMagnitude = Math.floor(theMagnitude / 10);
    }
}

function showDP(theValue) {
    if (e[iTRACE] & itDISPLAY) 
		console.log(showDP.caller.name+": showDP("+theValue+")");
    
    var isError = false;
    
    if (theValue === NaN) isError = progAlert(02001, 00205, 0);
    if (theValue === undefined) isError = progAlert(02003, 00205, 0);
    if (isError) {
        console.trace();
        return;
     }
     
    var theMagnitude = Math.floor(Math.abs(theValue)) % 1e10;

    for (var ix=3; ix<=6; ix++) e[DSPTAB+ix] &= MaxUns - Bit11;
    if (theValue < 0)
        e[DSPTAB+5] |= Bit11;
    else
        e[DSPTAB+6] |= Bit11;
    
    for (var dtIndex=dtR2D5; dtIndex<=dtR1D1; dtIndex++) {
        var dtEntry = Math.floor(dtIndex / 2);
        var theShift = (dtIndex % 2) * 5;
        theMask = MaskR5 << theShift;
        e[DSPTAB+dtEntry] &= MaxUns ^ theMask;
        e[DSPTAB+dtEntry] |= RelayCodes[theMagnitude % 10] << theShift;
        e[DSPTAB+dtEntry] |= Bit15;
        theMagnitude = Math.floor(theMagnitude / 10);
    }
}

function showHMS(theValue) {
    if (e[iTRACE] & itDISPLAY) 
		console.log(showHMS.caller.name+": showHMS("+theValue+")");

    var ix, theMagnitude, theHours, theMinutes, theSeconds;

    BLANKSUB(R1R2R3);
        
    theMagnitude = Math.floor(Math.abs(theValue));

    theHours = Math.floor(theMagnitude / 360000);
    theMinutes = Math.floor(theMagnitude / 6000) % 60;
    theMSeconds = theMagnitude % 6000;

    showSP(1, theHours);
    showSP(2, theMinutes);
    showSP(3, theMSeconds);
}

function showMMSS(theRegister, theValue) {
    if (e[iTRACE] & itDISPLAY) 
		console.log(showMMSS.caller.name+": showMS("+
	                theRegister+", "+theValue+")");

    var theMagnitude = Math.floor(Math.abs(theValue) / 100);
    if (theMagnitude > 3599) theMagnitude = 3599;

    var theMinutes = Math.floor(theMagnitude / 60) % 60;
    var theSeconds = theMagnitude % 60;
    var theMMSS = theSeconds + (theMinutes * 1e3);
    if (theValue < 0) theMMSS = 0 - theMMSS;
    
    showSP(theRegister, theMMSS);
    
    var dtIndex = [6, 3, 1][theRegister-1];
    var theShift = [0, 5, 0][theRegister-1];
    e[DSPTAB+dtIndex] &= MaxUns - (MaskR5 << theShift);
}

function showXXYY(theRegister, theCadr) { 
    if (e[iTRACE] & itDISPLAY) 
		console.log(showXXYY.caller.name+": showXXYY("+
	                theRegister+", "+theCadr+")");

    var theValue = (spMagnOfE(theCadr) % 100) * 1e3;
    theValue += spMagnOfE(theCadr+1) % 100;

    showSP(theRegister, theValue);

    var dtIndex = [6, 3, 1][theRegister-1];
    var theShift = [0, 5, 0][theRegister-1];
    e[DSPTAB+dtIndex] &= MaxUns - (MaskR5 << theShift);
}

function NVSUB(theVerb, theNoun, theRoutine) { 
    if (e[iTRACE] & itDISPLAY) 
		console.log("NVSUB("+theVerb+", "+theNoun+", "+theRoutine.name+")");
    
    var executedOK = true;
    
    if (e[DSPLOCK] == 0) {          // When nothing else is using the DSKY
        var myVerb = (0|theVerb) % 100;
        e[VERBREG] = myVerb;
        DSPVV(myVerb);

        var myNoun = (0|theNoun) % 100;
        e[NOUNREG] = myNoun;
        DSPNN(myNoun);

        if (ncIsValid()) {
            XEQVERB();
        } else {
            progAlert(021501, 000212, 0);
        }
    } else {
        if (e[iTRACE] & itDISPLAY) console.log("DSPLOCK="+o(DSPLOCK));
        if (theRoutine !== 0) {
            if (pIDLE !== doNothing) {
                progAlert(021206, 00212, 0);
            } else {
                pIDLE = theRoutine;
                setAlert(aKEY_REL);
            }
        }
        executedOK = false;
    }
    
    return executedOK;
}

function DSPMM(theCode) {
    if (e[iTRACE] & itDISPLAY) 
		console.log(DSPMM.caller.name+": DSPMM("+theCode+")");
	
    DSPXX(theCode, 10);
}    
 
function DSPVV(theCode) {
    if (e[iTRACE] & itDISPLAY) 
		console.log(DSPVV.caller.name+": DSPVV("+theCode+")");
	
    DSPXX(theCode, 9);
}    
 
function DSPNN(theCode) {
    if (e[iTRACE] & itDISPLAY) 
		console.log(DSPNN.caller.name+": DSPNN("+theCode+")");
	
    DSPXX(theCode, 8);
}    
 
function DSPXX(theCode, dtEntry) { 
    if (theCode < 0) {
        e[DSPTAB+dtEntry] = Bit15;
    } else {
        e[DSPTAB+dtEntry]  = RelayCodes[Math.floor(theCode/10) % 10] << 5;
        e[DSPTAB+dtEntry] |= RelayCodes[theCode % 10];
        e[DSPTAB+dtEntry] |= Bit15;
    }
}

function clearRegister(theRegister) {
    if (e[iTRACE] & itDISPLAY) 
		console.log("clearRegister("+theRegister+")");

    if ((theRegister < 1) || (theRegister > 3)) { 
        progAlert(022002, 00605, theRegister);
        console.log("clearRegister() invalid argument: theRegister="+theRegister);
        return;
    }    
    e[XREG + theRegister - 1] = 0;
    e[XREGLP + theRegister - 1] = 0;

    e[TEM5] = [dtR1D1, dtR2D1, dtR3D1][theRegister - 1];
    var theMask;
    
    // clear the digits
    for (var dtIndex = 4; dtIndex >=0; dtIndex--) {
        e[DSREL] = Math.floor((e[TEM5] - dtIndex) / 2);
        theMask = MaskR5 << (5 * ((e[TEM5] - dtIndex) % 2));
        theMask ^= MaxUns;
        e[DSPTAB+e[DSREL]] &= theMask;
        e[DSPTAB+e[DSREL]] |= Bit15;
    }
    
    // clear the sign
    e[DSREL] = [5, 3, 0][theRegister - 1];
    e[DSPTAB+e[DSREL]] &= (MaxUns ^ Bit11);
    e[DSPTAB+e[DSREL]+1] &= (MaxUns ^ Bit11);
}

function BLANKSUB(regBitmap) {
    // ROUTINE BY WHICH AN INTERNAL PROGRAM MAY BLANK ANY 
    //   COMBINATION OF THE DISPLAY REGISTERS R1, R2, R3
    // BIT1=1 BLANKS R1, BIT2=1 BLANKS R2, BIT3=1 BLANKS R3.
    // ANY COMBINATION OF THESE BITS IS ACCEPTED
    if (e[iTRACE] & itDISPLAY) 
		console.log(BLANKSUB.caller.name+": BLANKSUB("+regBitmap+")");
    
    for (var ix=1; ix<=3; ix++)
        if (regBitmap & (1<<(ix-1)))
            clearRegister(ix);
}

function BLANKALL() {
    // Routine to blank VB & NN & all 3 regs
    for (var dtIndex=9; dtIndex>=0; dtIndex--) e[DSPTAB+dtIndex] = Bit15;
}

function KILLMON() {
    if (mon_TimerID !== 0) {
        clearTimeout(mon_TimerID);
        mon_TimerID = 0;
    }
    e[MONSAVE] = 0;
    e[MONSAVE1] = 0;
    mProg = 0;
    resetAlert(aKEY_REL);
}

function MONITOR(theRoutine) {
    if (e[iTRACE] & itDISPLAY) 
		console.log(MONITOR.caller.name+": MONITOR("+theRoutine+")");
    
    if (mon_TimerID !== 0) clearTimeout(mon_TimerID);

    e[MONSAVE]  = e[VERBREG] << 7;
    e[MONSAVE] |= e[NOUNREG];
    e[MONSAVE1] = e[NOUNCADR];
 
    mProg = theRoutine;
	MON_EX();
    mon_TimerID = setInterval(MON_EX, 1000);
}

function MON_EX() {
    if (e[iTRACE] & itDISPLAY) console.log("MON_EX()");

    if (mProg !== 0) {
        if (e[DSPLOCK]) {
            setAlert(aKEY_REL);
        } else {
            e[VERBREG] = e[MONSAVE] >> 7;   // (Monitor V&N are stored in MONSAVE)
            e[NOUNREG] = e[MONSAVE] & 0177;
            e[NOUNCADR] = e[MONSAVE1];
            
            DSPVV(e[VERBREG]);
            DSPNN(e[NOUNREG]);
            
            mProg();
        }
    }
}
