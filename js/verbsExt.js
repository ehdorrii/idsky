//
// verbsExt.js - All the extended verbs are implemented here
//
//     Only a handful of extended verbs are implemented. Also, I've defined
//     a few new extended verbs:
//
//     76 - sets the timer to the current TOD & starts monitor
//     77 - iDSKY functional self-test
//     79 - Specify mission profile to simulate

const verbxDebug = false;

if (verbxDebug) e[iTRACE] |= itVERBSX;

////////////////////////////////////////////////////////
//// Verb 55 : Update clock

function adjustTime() {
    if (e[iTRACE] & itVERBSX) 
		console.log("adjustTime()");
	
    NVSUB(25, 24, 0);
	pENTR = adjustTime_p2;
}

function adjustTime_p2() {
    if (e[iTRACE] & itVERBSX) 
		console.log("adjustTime_p2()");
	
    dpStore(TIME2, dpMagnOfE(TIME2) + dpMagnOfE(DSPTEM2), 1);
	T2Update();
}
    

////////////////////////////////////////////////////////
//// Verbs 70-73 : Update memory

function agcUpdate() {
    if (e[iTRACE] & itVERBSX) console.log("agcUpdate()");
	
	AGC_Update();
}

////////////////////////////////////////////////////////
//// Verb 74 : dump erasable memory (to console instead of downlink)

function dumpMemory() {
    if (e[iTRACE] & itVERBSX) console.log("dumpMemory()");

    var chunk = 8;            // Number of words per line (should be a power of 2)
    var addr = "";            // The address in erasable
    var data = "";            // "chunk" words of erasable
    
    var previousData = "";    // A record of the previous line's data
    var rangeLow = -1;        // If non-negative, the low end of duplicate range
    var rangeHigh = -1;       // If non-negative, the high end of the duplicate range

    for (var iy=0; iy<eMemSize; iy+=chunk) {
        addr = zeroPad(iy.toString(8)) + ": ";
        data = "";
        for (var ix=0; ix<chunk; ix++)
            data += zeroPad(eFetch(iy+ix).toString(8)) + " ";
        if (data == previousData) {
            if (rangeLow < 0) rangeLow = iy;
            rangeHigh = iy + (chunk - 1);
        } else {
            if (rangeLow >= 0) {
                console.log(zeroPad(rangeLow.toString(8)) + " to " +
                            zeroPad(rangeHigh.toString(8)) + " same as above");
                rangeLow = -1;
                rangeHigh = -1;
            }
            console.log(addr+data);
            previousData = data;
        }
    }
    if (rangeLow >= 0) {
        console.log(zeroPad(rangeLow.toString(8)) + " to " +
                    zeroPad(rangeHigh.toString(8)) + " same as above");
    }   
    BLANKALL();    
}

function zeroPad(theNum) {
    var s = "00000" + theNum;
    return s.substr(s.length-5);
}

////////////////////////////////////////////////////////
//// Verb 75 : "Backup" liftoff signal (but the only way in iDSKY)

function doLiftoff() {
    if (e[iTRACE] & itVERBSX) console.log("doLiftoff()");
    
    Channel[030] |= Bit5;                             // set the liftoff discrete
    KeyRelKey();
}

////////////////////////////////////////////////////////
//// Verb 76 : {iDSKY only} Set TIME1:TIME2 to current TOD & display

function doClock() {
    if (e[iTRACE] & itVERBSX) console.log("doClock()");
    
	cancelProg();
	setFlag(NODOP01);
	e[DSPLOCK] = 0;
	
    var d = new Date();
	d.setHours(0);
	d.setMinutes(0);
	d.setSeconds(0);
	T2Epoch = d;
	NVSUB(16, 36, 0);
}

//////////////////////////////////////////
//// Verb 77 : Functional Self Test (iDSKY)

function functionTest() {
    if (e[iTRACE] & itVERBSR) console.log("functionTest()");
	
    e[FSTSTEP] = 0;
    e[FSTDTAIX] = 0;
    e[FSTSTINC] = 1;
	
	// Setting these two alerts is the signal that this
	// self-test verb is in progress. Nothing else in
	// iDSKY sets these alerts.
	
	setAlert(aTEMP);
	setAlert(aGIMBAL_LOCK);
	
	// V77 usurps the "PROG" part of the display to indicate
	// what stage of the self-test is in progress.
	
	DSPMM(e[FSTSTEP]);
	
	pPWOI = functionTestStepN;
    pTERM = endFunctionTest;
}

var ftData = [ 000000, 000001, 007776, 007777,  010000, 010001, 017776, 017777, 
               020000, 020001, 027776, 027777,  030000, 030001, 037776, 037777,
               040000, 040001, 047776, 047777,  050000, 050001, 057776, 057777, 
               060000, 060001, 067776, 067777,  070000, 070001, 077776, 077777 ];
               
function functionTestStepN() {
    e[FSTSTEP] += e[FSTSTINC];
	switch (e[FSTSTEP]) {
		
		// the case is displayed in the PROG area
		
        case 1:
            showOctal(1, 1)
            showOctal(2, 0);
            showOctal(3, 077777);
            break;
		case 2:
			showSP(1, 1);
			showSP(2, 0);
			showSP(3, 077777);
			break;
        case 3:
            BLANKSUB(R3);
            showDP(MaskR28);
            break;
        case 4:
            showDP(-MaskR28);
            break;
        case 5:
            //       HHH                     MM                SS          mm
            showHMS((123 * 60 * 60 * 100) + (45 * 60 * 100) + (56 * 100) + 78);
            break;
		case 6:
			showMMSS(1, 0);
			showMMSS(2, ((34 * 60) + 56) * 100);  // SB +34 56
			showMMSS(3, ((61 * 60) + 56) * 100);  // SB +59 59
			break;
		case 7:
			showMMSS(1, -1);
			showMMSS(2, ((34 * 60) + 56) * -100);  // SB -34 56
			showMMSS(3, ((61 * 60) + 56) * -100);  // SB -59 59
			break;
        case 8:
            e[XREG] = 12;
            e[XREG+1] = 34;
            showXXYY(1, XREG);
            e[XREG] = 97;
            e[XREG+1] = 98;
            showXXYY(2, XREG);
            e[XREG] = 123;
            e[XREG+1] = 978;
            showXXYY(3, XREG);
            break;
		case 9:
		    showSP(1, 0);
			showSP(2, 0);
			showSP(3, 0);
			break;
		case 10:
		    BLANKSUB(R1);
			break;
		case 11:
		    BLANKSUB(R2);
			break;
		case 12:
		    BLANKSUB(R3);
			break;
		case 13:
		    showSP(1, 1);
			showSP(2, 1);
			showSP(3, 1);
			break;
		case 14:
		    BLANKSUB(R3);
			break;
		case 15:
		    BLANKSUB(R2);
			break;
		case 16:
		    BLANKSUB(R1);
			break;
		case 17:
		    showSP(1, 2);
			showSP(2, 2);
			showSP(3, 2);
			break;
	    case 18:
			BLANKSUB(R1R2R3);
			break;
        case 19:
            // For each of the values in ftData, display the Fractional, Whole, 
			// and Degrees scaled value. This is equivalent to V06N01, V06N02, V06N03
            // displays. VV=77  NN=first and last octal digits of the raw value
			
            e[V77DATA] = ftData[e[FSTDTAIX]];
            showSP(1, scaleOutput(e[V77DATA], 1, 0));
            showSP(2, scaleOutput(e[V77DATA], 3, 0));
            showSP(3, scaleOutput(e[V77DATA], 2, 0));
			
            DSPNN((((e[V77DATA] / 4096) >>> 0) * 10) + (e[V77DATA] & MaskR3));
            e[FSTDTAIX]++;
            e[FSTSTINC] = (e[FSTDTAIX] < ftData.length) ? 0 : 1;
            break;
		default:
			e[FSTSTEP] = 0;
	}
    if (e[FSTSTEP] > 0) 
		DSPMM(e[FSTSTEP]);
	else {
        endFunctionTest();
	}
}	
		
function endFunctionTest() {
    e[FSTSTEP] = 0;
    BLANKALL();
	DSPMM(-1);
	resetAlert(aTEMP);
	resetAlert(aGIMBAL_LOCK);
	pPWOI = doNothing;
    pTERM = doNothing;    
}

////////////////////////////////////////////////////////
//// Verb 79 : select Flight profile to simulate

function selectFlight() {
    if (e[iTRACE] & itVERBSX) console.log("selectFlight()");
	
    NVSUB(21, 28, doNothing);
	pENTR = selectFlight_p2;
}

function selectFlight_p2() {
    if (e[iTRACE] & itVERBSX) console.log("selectFlight_p2()");
	
	if ((e[XREGLP] < 10) || (e[XREGLP > 17])) {
		setAlert(aOPR_ERR);
        NVSUB(21, 28, doNothing);
	} else {
		e[MISSION] = e[XREGLP];
		spStore(CSMMASS, ((CSM_Mass_at_Launch[e[MISSION]-baseFlight] / 1e5) * (ncGetSfIn(47, 1) / pow_2_14)), +1);
		spStore(LEMMASS, ((LM_Mass_at_Launch[e[MISSION]-baseFlight] / 1e5) * (ncGetSfIn(47, 2) / pow_2_14)), +1);
	}
	pENTR = doNothing;
}

////////////////////////////////////////////////////////
//// Verb 82 : Display orbital parameters

function orbitalParms() {
    if (e[iTRACE] & itVERBSX) 
		console.log("orbitalParms()");
    
    NVSUB(16, 44, 0);
}

//////////////////////////////
//// Verb 91 : Display BANKSUM

function banksum() {
    if (e[iTRACE] & itVERBSX) 
		console.log("banksum()");

    // NOTES on banksum:
    //   * VN set to 05/01, and flashing
    //   * if user input, illuminate KEY REL
    //   * go to next bank when PRO is pressed -OR- V33E
    //   * is terminated by V34, V36, V96
    //   * the currently displayed bank # is in e[SKEEP4]
    //   * bank number wraps to 00 after 43 (octal)
    //   * e[SMODE] specifies self-test -- not sure what value is used for BANKSUM
    
    e[SMODE] = 5;
    e[SKEEP4] = 043;   // This is so the first bank displayed will be 0
    e[CADRSTOR] = 1;
    pPWOI = nextbank;
    pTERM = endBanksum;
    nextbank();
}

function nextbank() {
    if (e[iTRACE] & itVERBSX) console.log("nextbank()");

    setAlert(aCOMP_ACTY);
    compActy = true;
    BLANKALL();
    setTimeout(function() { 
        NVSUB(5, 1, 0);
        setAlert(aVN_FLASH);
        ix = (eFetch(SKEEP4) + 1) % 044;
        e[SKEEP4] = ix;
        e[DSPTEM2] = fb[ix][0];
        showOctal(1, e[DSPTEM2]);
        showOctal(2, e[SKEEP4]);
        e[DSPTEM2] = fb[ix][1];
        showOctal(3, e[DSPTEM2]);
        resetCompActy();
    }, 1400);
}

function endBanksum() {
    if (e[iTRACE] & itVERBSX) console.log("endBanksum()");

    e[VERBREG] = 0;
    e[NOUNREG] = 0;
    BLANKALL();
    resetAlert(aOPR_ERR);
    pPWOI = doNothing;
    pTERM = doNothing;
    e[CADRSTOR] = 0;
}

//////////////////////////////////////////////////
//// Verb 96 : Terminate Integration and Go To P00

function terminate() {
    if (e[iTRACE] & itVERBSX) console.log("terminate()");

    cancelProg();
    spStore(MMNUMBER, 0, +1);
    progs[eFetch(MMNUMBER)]();
    BLANKALL();
}
