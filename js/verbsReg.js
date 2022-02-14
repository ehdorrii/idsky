//
// verbsReg.js - All the regular verbs are implemented here
//
// Most of the "regular" verbs (display, monitor, load) are implemented.
//

const verbrDebug = false;
const verbrCalcDebug = false;

if (verbrDebug) e[iTRACE] |= itVERBSR;
if (verbrCalcDebug) e[iTRACE] |= itSCALE;

//////////////////////////////////////////////
//// Verb 01 : Octal Display Component 1 in R1

function displayOctal1() {
    if (e[iTRACE] & itVERBSR) 
		console.log(displayOctal1.caller.name+": displayOctal1()");

    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        showOctal(1, e[e[NOUNCADR]]);
    }
}

//////////////////////////////////////////////
//// Verb 02 : Octal Display Component 2 in R1

function displayOctal2() {
    if (e[iTRACE] & itVERBSR) 
		console.log(displayOctal2.caller.name+": displayOctal2()");

    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        showOctal(1, e[e[NOUNCADR]+1]);
    }
}

//////////////////////////////////////////////
//// Verb 03 : Octal Display Component 3 in R1

function displayOctal3() {
    if (e[iTRACE] & itVERBSR) 
		console.log(displayOctal3.caller.name+": displayOctal3()");

    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        showOctal(1, e[e[NOUNCADR]+2]);
    }
}

////////////////////////////////////////////////////////
//// Verb 04 : Octal Display Components 1 & 2 in R1 & R2

function displayOctal12() {
    if (e[iTRACE] & itVERBSR) 
		console.log(displayOctal12.caller.name+": displayOctal12()");

    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        showOctal(1, e[e[NOUNCADR]]);
        showOctal(2, e[e[NOUNCADR]+1]);
    }
}

///////////////////////////////////////////////////////////////
//// Verb 05 : Octal Display Components 1, 2 & 3 in R1, R2 & R3

function displayOctal123() {
    if (e[iTRACE] & itVERBSR) 
		console.log(displayOctal123.caller.name+": displayOctal123()");

    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        showOctal(1, e[e[NOUNCADR]]);
        showOctal(2, e[e[NOUNCADR]+1]);
        showOctal(3, e[e[NOUNCADR]+2]);
    }
}

//////////////////////////////
//// Verb 06 : Decimal Display 
////         : Specify Machine Address: Show 3 single words in Decimal in R1, R2, R3
////         : Other Nouns: Show # of components in Noun, in unscaled SP decimal

function displayDecimal() {
    if (e[iTRACE] & itVERBSR) 
		console.log(displayDecimal.caller.name+": displayDecimal()");

    if (e[NOUNREG] < 4) {    // Specify Machine Address
        showSP(1, scaleOutput(ncGetCadr(e[NOUNREG], 1), 1, 0));
        showSP(2, scaleOutput(ncGetCadr(e[NOUNREG], 2), 1, 0));
        showSP(3, scaleOutput(ncGetCadr(e[NOUNREG], 3), 1, 0));
    } else {
        var theValue;
            
        if (ncGetSfr(e[NOUNREG], 1) == 0) {           // SF Routine 0 is "Octal only"
            setAlert(aOPR_ERR);
        } else if (ncGetSfr(e[NOUNREG], 1) == 8) {    // R1:00HHH  R2:000MM  R3:0SSmm
            theValue =  dpMagnOfE(ncGetCadr(e[NOUNREG], 1));
            showHMS(theValue);
        } else {
            var compCount = nGetCompCount(e[NOUNREG]);
            for (var ix=1; ix<=compCount; ix++) {
                if (ncGetSfr(e[NOUNREG], ix) == 12) {
                    showXXYY(ix, ncGetCadr(e[NOUNREG], ix));
                } else if (ncGetSfr(e[NOUNREG], ix) == 9) {
                    theValue = signOfE(ncGetCadr(e[NOUNREG], ix)) * 
					           dpMagnOfE(ncGetCadr(e[NOUNREG], ix));
                    showMMSS(ix, theValue);
                } else {
                    if (!ncIsDp(e[NOUNREG], ix)) {
                        theValue = e[ncGetCadr(e[NOUNREG], ix)];
                    } else {
                        theValue = dpMagnOfE(ncGetCadr(e[NOUNREG], ix)) * 
						           signOfE(ncGetCadr(e[NOUNREG], ix));
                    }
                    theValue = scaleOutput(theValue,
                                           ncGetSfr(e[NOUNREG], ix), 
                                           ncGetSfOut(e[NOUNREG], ix));
                    showSP(ix, theValue);
                }
            }
        }
    }
}

////////////////////////////////////////////
//// Verb 07 : DP Decimal Display in R1 & R2
////         : Specify Machine Address: Show 1 value interpreted as 
////           DP in R1 & R2, sign +/-in R1, sign blank in R2
////         : Other Nouns: OPR ERR if Noun component 1 is not DP;
////           else show component 1 as above

function displayDpDecimal() {
    if (e[iTRACE] & itVERBSR) 
		console.log(displayDpDecimal.caller.name+": displayDpDecimal()");
    var dpValue;
    var dpCadr = ncGetCadr(e[NOUNREG], 1);

    if ((e[NOUNREG] > 3) && (!ncIsDp(e[NOUNREG], 1))) {
        setAlert(aOPR_ERR);
    } else {
        dpValue = (e[dpCadr] & MaxMagn) * MaxMagn;
        dpValue += e[dpCadr+1] & MaxMagn;
        dpValue = scaleOutput(dpValue, 13, 0);
        showDP(dpValue);
    }
}

//////////////////////////////////////////////
//// Verb 11 : Octal Monitor Component 1 in R1

function monitorOctal1() {
    if (e[iTRACE] & itVERBSR) 
		console.log(monitorOctal1.caller.name+": monitorOctal1()");
    
    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        KILLMON();
        showOctal(1, ncGetCadr(e[NOUNREG], 1));
        MONITOR(function() { monOctal(1, 1); });
    }
}

function monOctal(CompStart, CompEnd) {
    if (e[iTRACE] & itVERBSR) 
		console.log(monOctal.caller.name+": monOctal("+CompStart+", "+CompEnd+")");
    
    if (e[NOUNREG] === 15) {
        e[MONSAVE1] = (e[MONSAVE1] + 1) & MaxUns;
        e[NOUNCADR] = e[MONSAVE1];
    }
    var ixReg = 1;
    for (var ixComp=CompStart; ixComp<=CompEnd; ixComp++) {
        showOctal(ixReg, e[e[MONSAVE1]+ixReg-1]);
        ixReg++;
    }
    if ((e[VERBREG] < 15) && ((e[NOUNREG] < 4) || (e[NOUNREG] === 15))) {
        showOctal(3, e[MONSAVE1]);
    }
}
    
//////////////////////////////////////////////
//// Verb 12 : Octal Monitor Component 2 in R1

function monitorOctal2() {
    if (e[iTRACE] & itVERBSR) 
		console.log(monitorOctal2.caller.name+": monitorOctal2()");
    
    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        KILLMON();
        showOctal(1, ncGetCadr(e[NOUNREG], 2));
        MONITOR(function() { monOctal(2, 2); });
    }
}

//////////////////////////////////////////////
//// Verb 13 : Octal Monitor Component 3 in R1

function monitorOctal3() {
    if (e[iTRACE] & itVERBSR) 
		console.log(monitorOctal3.caller.name+": monitorOctal3()");
    
    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        KILLMON();
        showOctal(1, ncGetCadr(e[NOUNREG], 3));
        MONITOR(function() { monOctal(3, 3); });
    }
}

////////////////////////////////////////////////////////
//// Verb 14 : Octal Monitor Components 1 & 2 in R1 & R2

function monitorOctal12() {
    if (e[iTRACE] & itVERBSR) 
		console.log(monitorOctal12.caller.name+": monitorOctal12()");
    
    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        KILLMON();
        showOctal(1, ncGetCadr(e[NOUNREG], 1));
        showOctal(2, ncGetCadr(e[NOUNREG], 2));
        MONITOR(function() { monOctal(1, 2); });
    }
}

///////////////////////////////////////////////////////////////
//// Verb 15 : Octal Monitor Components 1, 2 & 3 in R1, R2 & R3

function monitorOctal123() {
    if (e[iTRACE] & itVERBSR) 
		console.log(monitorOctal123.caller.name+": monitorOctal123()");
    
    if (nIsDecimalOnly(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        KILLMON();
        showOctal(1, ncGetCadr(e[NOUNREG], 1));
        showOctal(2, ncGetCadr(e[NOUNREG], 2));
        showOctal(3, ncGetCadr(e[NOUNREG], 3));
        MONITOR(function() { monOctal(1, 3); });
    }
}

//////////////////////////////
//// Verb 16 : Decimal Monitor

function monitorDecimal() {
    if (e[iTRACE] & itVERBSR) 
		console.log(monitorDecimal.caller.name+": monitorDecimal()");

    var error = false;
    var theValue;
    var compCount = nGetCompCount(e[NOUNREG]);

    for (var ix=1; ix<=compCount; ix++) {
        if (ncGetSfr((e[NOUNREG]), ix) === 0) error = true;
    }

    if (error) {
        setAlert(aOPR_ERR);
    } else {    
        KILLMON();
        displayDecimal();
        MONITOR(function() { displayDecimal(); });
    }
}

////////////////////////////////////////////
//// Verb 17 : DP Decimal Monitor in R1 & R2

function monitorDpDecimal() {
    if (e[iTRACE] & itVERBSR) 
		console.log(monitorDpDecimal.caller.name+": monitorDpDecimal()");

    if (ncGetSfr((e[MONSAVE] & MaskR7), 1) === 0) {   // SF Routine 0 is "Octal only"
        setAlert(aOPR_ERR);
    } else {
        KILLMON();
        displayDpDecimal();
        MONITOR(function() { displayDpDecimal(); } );
    }
}

///////////////////////////////////////
//// Load component utility functions

function prepForRLoad(theRegister) {
    if (e[iTRACE] & itVERBSR) 
		console.log(prepForRLoad.caller.name+": prepForRLoad("+theRegister+")");
	
    if (nIsNoLoad(e[NOUNREG])) {
        setAlert(aOPR_ERR);
    } else {
        e[DECBRNCH] = 0;                                      // default to unsigned octal
        e[DSPCOUNT] = [dtR1D1, dtR2D1, dtR3D1][theRegister-1];// location of input        
        e[CLPASS] = 0;                                      
		e[REQRET] = RLoadComplete;
        BLANKSUB(1 << (theRegister - 1));
        if (e[VERBREG] > 23) {                                // If multi-comp load
            e[DSPTAB+9] &= MaxUns - MaskR5;                   //   indicate comp # in
            e[DSPTAB+9] |= RELTAB[theRegister] | Bit15;       //   second digit of Verb
        }
        setAlert(aVN_FLASH);
    }
}    

function RLoadEnter() {
    if (e[iTRACE] & itVERBSR) 
		console.log("RLoadEnter()");
	
    resetAlert(aVN_FLASH);

    // Special case: Noun 7 is used to set/reset bits. Intended for use with FLAGWORDs 
    
    if (e[NOUNREG] == 7) {                          // X=ECADR  Y=Bitmask  Z=Bit values
        if (e[iTRACE] & itVERBSR) console.log("Executing special case for Noun 07");
        
        if (e[ZREG] == 0) {                         // Reset the specified bits?
            e[e[XREG]] &= (077777 - e[YREG]);
        } else {                                    // or set the bits?
            e[e[XREG]] |= e[YREG];
        }
		
    } else {
		
        if (scaleIn(1) && scaleIn(2) && scaleIn(3)) { // are all components valid?
		    if ((e[VERBREG] == 21) || (e[VERBREG] > 23)) {
				if (ncIsDp(e[NOUNREG], 1)) {
					e[ncGetCadr(e[NOUNREG], 1)] = e[XREG];
					e[ncGetCadr(e[NOUNREG], 1)+1] = e[XREGLP];
				} else {
					e[ncGetCadr(e[NOUNREG], 1)] = e[XREG];
				}
			}

            if (ncGetSfr(e[NOUNREG], 1) != 8) {   // Skip comps 2 & 3 for HMS load
			    if ((e[VERBREG] == 22) || (e[VERBREG] > 23)) {
					if (ncIsDp(e[NOUNREG], 2)) {
						e[ncGetCadr(e[NOUNREG], 2)] = e[YREG];
						e[ncGetCadr(e[NOUNREG], 2)+1] = e[YREGLP];
					} else {
						e[ncGetCadr(e[NOUNREG], 2)] = e[YREG];
					}
				}
				if ((e[VERBREG] == 23) || (e[VERBREG] == 25)) {
					if (ncIsDp(e[NOUNREG], 3)) {
						e[ncGetCadr(e[NOUNREG], 3)] = e[ZREG];
						e[ncGetCadr(e[NOUNREG], 3)+1] = e[ZREGLP];
					} else {
						e[ncGetCadr(e[NOUNREG], 3)] = e[ZREG];
					}
				}
			}
            if ((e[NOUNCADR] == TIME2) || (e[NOUNCADR] == TIME1)) T2Update();
        } else {
            load23Comp();
        }
    }
	
	var runMe = pENTR;
	pENTR = doNothing;
	runMe();
}

///////////////////////////////////////
//// Verb 21, 22, 23 : Load Component n into Rn

function load1Comp() {
    if (e[iTRACE] & itVERBSR) 
		console.log(load1Comp.caller.name+": load1Comp()");
    
    prepForRLoad(e[VERBREG]-20);
}

/////////////////////////////////////////////////
//// Verb 24, 25 : Load Components 2 or 3 components into R1 & R2 (& R3)

function load23Comp() {  
    if (e[iTRACE] & itVERBSR) 
		console.log(load23Comp.caller.name+": load23Comp()");
    
    prepForRLoad(1)
}

///////////////////////////////////
//// Verb 27 : Display Fixed Memory

function displayFixed() {
    if (e[iTRACE] & itVERBSR) 
		console.log(displayFixed.caller.name+": displayFixed()");

    var fValue;
    
    switch (e[NOUNREG]) {
        case 15:
            e[NOUNCADR] = (e[NOUNCADR] + 1) % fMemSize;
            showOctal(3, e[NOUNCADR]);
        case 1: case 2: case 3:
            if (e[NOUNCADR] < 128) {
                fValue = f[e[NOUNCADR]];
            } else {
                fValue = 0;
            }
            showOctal(1, fValue);
            break;
        default:
            setAlert(aOPR_ERR);
        }
}

////////////////////////////////////
//// Verb 32 : Recyle

function recycle() {
    if (e[iTRACE] & itVERBSR) 
		console.log(recycle.caller.name+": recycle()");
    
	KILLMON();
    e[VERBREG] = e[VERBSAVE];
    executeVerb();
}

////////////////////////////////////
//// Verb 33 : Proceed without input

function proceedWOI() {
    if (e[iTRACE] & itVERBSR) 
		console.log(proceedWOI.caller.name+": proceedWOI()");
    
	KILLMON();
    pPWOI();
}

/////////////////////////////////////
//// Verb 34 : Terminate Test or Load

function terminateLoad() {
    if (e[iTRACE] & itVERBSR) 
		console.log(terminateLoad.caller.name+": terminateLoad()");
    
    KeyRelKey();
    KILLMON();
    resetAlert(aVN_FLASH);
    e[SMODE] = 0;             // Terminate any tests ?? Really ??
    pTERM();
    pTERM = doNothing;
}

//////////////////////////
//// Verb 35 : Test Lights

function beginLightTest() {
    if (e[iTRACE] & itVERBSR) 
		console.log(beginLightTest.caller.name+": beginLightTest()");
	
    // Lights test is only allowed if the Major Mode is unset (-0) or 00
	if (spMagnOfE(MMNUMBER) == 0) {
		
		KILLMON();
		
		OUT0 = 12 << 11;                                // Relay word for DSPTAB+11
		// PROG + TRACKER + GIMBAL LOCK + ALT + NO ATT + VEL
		OUT0 = OUT0 | (Bit9|Bit8|Bit6|Bit5|Bit4|Bit3);  
		agcToDsky(8, OUT0);                             // Send directly to channel

		var testRelays = Bit15 | Bit11 | RelayCodes[8] | (RelayCodes[8] << 5);
		for (var dtIndex=10; dtIndex>=0; dtIndex--)
			e[DSPTAB+dtIndex] = testRelays; 
		updateDisplay();        
		
		setAlert(aTEST_LIGHTS);
		// OPR ERR + VN-FLASH + KEY REL + TEMP + UPLINK ACTY + COMP ACTY
		OUT0 = Bit7|Bit6|Bit5|Bit4|Bit3|Bit2; 
		agcToDsky(9, OUT0);
		// STBY + RESTART
		OUT0 = Bit12|Bit11;                                  
		agcToDsky(11, OUT0);

		lightsTest_TimerID = setTimeout(function() { endLightTest(); }, 5500);
	} else {
		setAlert(aOPR_ERR);
	}
}

function endLightTest() {
    if (e[iTRACE] & itVERBSR) 
		console.log(endLightTest.caller.name+": endLightTest()");
    
    lightsTest_TimerID = 0;
    AlertsCh[11] = 0;
    agcToDsky(11, AlertsCh[11]);
    
    e[DSPTAB+11] = Bit15;
    OUT0 = 12 << 11;
    OUT0 |= AlertsCh[8];
    agcToDsky(8, OUT0);
    resetAlert(aCOMP_ACTY);
    resetAlert(aTEST_LIGHTS);
    agcToDsky(9, AlertsCh[9]);
	if (e[MMNUMBER] == 0)
		DSPMM(0);
	else
		DSPMM(-1);
}

//////////////////////////////////
//// Verb 36 : Request Fresh Start

function freshStart() {
    if (e[iTRACE] & itVERBSR) 
		console.log(freshStart.caller.name+": freshStart()");
    
    DOFSTART();
    BLANKALL();
    e[CADRSTOR] = 0;
	e[REQRET] = 0;
    e[CLPASS] = 0;
    e[DSPLOCK] = 0;
    e[DSPLIST] = 0;
    pTERM();
    pTERM = doNothing;
}

//////////////////////////////////////////
//// Verb 37 : Change Program (Major Mode)

function changeProgram() {
    if (e[iTRACE] & itVERBSR) 
		console.log(changeProgram.caller.name+": changeProgram()");

    if (e[PROGPASS] !== 1) {              // First time through
        setAlert(aVN_FLASH);              //   prompt for the Program number in
        NounKey();                        //   the Noun field
        e[PROGPASS] = 1;
		e[DSPLOCK] = 1;
    } else {                              // Second time through
        if ((e[DSPCOUNT] & Bit15) == 0) { // Both digits are required for the
            setAlert(aOPR_ERR);           //   Program number
            setAlert(aVN_FLASH);
			NounKey();
			e[PROGPASS] = 1;
		} else {                          // PROG 01 can only be started once
			if ((e[NOUNREG] == 1) && (flagIsSet(NODOP01))) {
				progAlert(021521, 0, 0);
				setAlert(aVN_FLASH);
				DSPMM(-1);
				NounKey();
				e[PROGPASS] = 1;
			} else {
				e[PROGPASS] = 0;
				e[MMNUMBER] = e[NOUNREG];
				e[NOUNREG] = 0;
				e[DSPTAB+8] = Bit15;
				e[VERBREG] = 0;
				e[DSPTAB+9] = Bit15;
				resetAlert(aVN_FLASH);
				KeyRelKey();
				if (progs[e[MMNUMBER]] !== 0) {
					cancelProg();
					DSPMM(e[MMNUMBER]);
					progs[e[MMNUMBER]]();
				} else {
					spStore(MMNUMBER, 0 -1);
					DSPMM(-1);
					setAlert(aOPR_ERR);
				}
            }
        }
    }
}