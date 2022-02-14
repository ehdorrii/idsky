//
// pinball.js - The part of the package that simulates the DSKY interaction
//     code of the AGC.
//
//     Lacking any hardware to hook it all up to, there's not really
//     a whole lot of actually useful stuff that can be done with the AGC;
//     but this part -- which I've tried to be quite faithful to - is
//     intended to give one the flavor of the user interaction.
//

/*===================
Pinball Techniques and Erasable Usage

Erasable Usage

Symbol     Addr8    Use / Meaning
--------	----	-------------
CADRSTOR	1245	Address of sleeping process
CLPASS      1220    Indicator for CLR: 
                         +0=first pass - can be backed up
                        +NZ=hi pass - can be backed up
                        –NZ=first pass - cannot back up
DECBRNCH	1203	Base/sign: 0=Octal  1=+Dec  2=–Dec
DSALMOUT			Channel 9
DSPCNT		1201	Counter for DSPOUT
DSPCOUNT	1202	Points to current position in DSPTAB;
						minus means last digit entered
DSPLIST		1246	Process waiting to use display:
						+NZ: DSPLIST<-0; ->JOBWAKE
						+0:  Turn off KEY REL; DSPLOCK<-0
						–NZ: same as +NZ
						–0:  never happens? 
DSPLOCK		1215	Keyboard/display interlock
DSPTAB		1226	Internal representation of num display
DSREL		0141	Offset into DSPTAB
ENDIDLE				Exit for job that wants to sleep while
					awaiting operator input
INREL		0137	Display element being entered into
						0=V 1=N 2=R1 3=R2 4=R3
LOADSTAT	1217	+0=Inactive (waiting for data)
					+1=Proceed, no data (set by V33/PRO)
					–1=Terminate (set by V34)
					–0=Data in or resequence (set by end
						of load routine or V32)
MODREG		1214	Current Mode (program)
MONSAVE		1223	V & N of current monitor (7 bits each)
MONSAVE1	1224	CADR of monitored noun
MONSAVE2	1225	NVMON options:
						14-8: A “Please” verb 
						3-1: Regs to blank (via BLANKSUB) 
MPAC		0154	Multiple purpose accumulator
NOUNCADR	1222	CADR of the current noun
NOUNREG		1205	Current Noun
NOUT		1221	Count of pending entries in DSPTAB
NVQTEM		1242	Addr/Bank of Noun
REQRET		1216	Address to go to after a load request
					has been satisfied
VERBREG		1204	Current Verb
VERBSAVE	1244	Save previous verb for recycle
XREG		1206	Entry buffer for reg 1
XREGLP		1211	Entry buffer low part for reg 1
YREG		1207	Entry buffer for reg 2
YREGLP		1212	Entry buffer low part for reg 2
ZREG		1210	Entry buffer for reg3 
ZREGLP		1213	Entry buffer low part for reg 3

o Scaling is performed on decimal input into R1/2/3 when the fifth digit is keyed.

o At maximum capacity, a monitor (or other recurring display?) can be interrupted 
  by a load of a MATBS noun.
  
o The display system is blocked (e[DSPLOCK]<-NZ) by the depression of any key 
  except RSET or KEY REL. It is also blocked by the external monitor bit (i.e. a 
  monitor is running). It is released (e[DSPLOCK]<-0) by KEY REL, all extended 
  verbs, Proceed without data, Terminate, Resequence, init executive, recall part 
  of RECALTST if ENDIDLE was used, V30, V31, monitor setup.
  
o For "Please perform" situations, NVSUB should be used twice: first place the 
  coded number for the action desired into registers, call NVSUB with display verb 
  and 'checklist' noun; call NVSUB again with "Please Perform" verb and noun=0.
  
o "Going to sleep" means a job is waiting for user input.
 
===================*/

const pinballDebug = false;
const pinballDebugDeep = false;

if (pinballDebug) e[iTRACE] |= itPINBALL;
if (pinballDebugDeep) e[iTRACE] |= itPINBALLd;

var INRELTAB = new Array();
INRELTAB[0]  = 4;         // R3D5 (DSPCOUNT = 0)
INRELTAB[1]  = 4;         // R3D4           = (1)
INRELTAB[2]  = 4;         // R3D3           = (2)
INRELTAB[3]  = 4;         // R3D2           = (3)
INRELTAB[4]  = 4;         // R3D1           = (4)
INRELTAB[5]  = 3;         // R2D5           = (5)
INRELTAB[6]  = 3;         // R2D4           = (6)
INRELTAB[7]  = 3;         // R2D3           = (7)
INRELTAB[8]  = 3;         // R2D2           = (8)
INRELTAB[9]  = 3;         // R2D1           = (9)
INRELTAB[10] = 2;         // R1D5           = (10)
INRELTAB[11] = 2;         // R1D4           = (11)
INRELTAB[12] = 2;         // R1D3           = (12)
INRELTAB[13] = 2;         // R1D2           = (13)
INRELTAB[14] = 2;         // R1D1           = (14)
INRELTAB[15] = 0;         // (cannot get here)
INRELTAB[16] = 1;         // ND2            = (16)
INRELTAB[17] = 1;         // ND1            = (17)
INRELTAB[18] = 0;         // VD2            = (18)
INRELTAB[19] = 0;         // VD1            = (19)

var CRITCON = new Array();   // contains the DSPCOUNT of the last digit...
CRITCON[0] = 18;             // ... of each enterable field
CRITCON[1] = 16;
CRITCON[2] = 10;
CRITCON[3] = 5;
CRITCON[4] = 0;

var RELTAB = new Array();
RELTAB[0]  = 004025;
RELTAB[1]  = 010003;
RELTAB[2]  = 014031;
RELTAB[3]  = 020033;
RELTAB[4]  = 024017;
RELTAB[5]  = 030036;
RELTAB[6]  = 034034;
RELTAB[7]  = 040023;
RELTAB[8]  = 044035;
RELTAB[9]  = 050037;
RELTAB[10] = 054000;
RELTAB[11] = 060000;

const RLoadComplete = 1;
const ALoadComplete = 2;

//////////////////////////////////////////////////////////////////////////////////
///////  End of globals and immediate code; start of function definitions  ///////
//////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////
///////                          Helper functions                          ///////
//////////////////////////////////////////////////////////////////////////////////

function doNothing() {
    if (e[iTRACE] & itPINBALLd) console.log("doNothing()");
    return true;
}

function setAlert(theAlert) {
    if (e[iTRACE] & itPINBALLd) console.log(setAlert.caller.name+": setAlert("+theAlert+")");
    
    var theChannel = ChannelForAlert[theAlert];
    AlertsCh[theChannel] |= BitForAlert[theAlert];
    OUT0 = AlertsCh[theChannel];
    if (theChannel === 8) OUT0 |= 060000;
    agcToDsky(theChannel, OUT0);
}

function resetAlert(theAlert) {
    if (e[iTRACE] & itPINBALLd) console.log("resetAlert("+theAlert+")");
    
    if (testAlert(aTEST_LIGHTS)) return;
    var theChannel = ChannelForAlert[theAlert];
    AlertsCh[theChannel] &= (MaxUns ^ BitForAlert[theAlert]);
    OUT0 = AlertsCh[theChannel];
    if (theChannel === 8) OUT0 |= 060000;
    agcToDsky(theChannel, OUT0);
}

function testAlert(theAlert) {
    return (AlertsCh[ChannelForAlert[theAlert]] & BitForAlert[theAlert]) ? true : false;
}

function resetCompActy() {
    compActy = false;
    if (!testAlert(aTEST_LIGHTS))
        resetAlert(aCOMP_ACTY);
}

function PrepForALoad() {       // Machine Cadr To Be Specified               
    if (e[iTRACE] & itPINBALL) console.log("PrepForALoad()");

    e[CLPASS] = Bit15;          // no backup permitted
    BLANKSUB(R3);
    e[DECBRNCH] = 0;            // Octal input
    e[DSPCOUNT] = dtR3D1;       // Begin at R3 digit 1
    setAlert(aVN_FLASH);
    e[REQRET] = ALoadComplete;
}

function ALoadEnter() {
    if (e[iTRACE] & itPINBALL) console.log("ALoadEnter()");

	if  (e[DECBRNCH] !== 0) {   // Decimal not allowed for MCTBS
		setAlert(aOPR_ERR);     // Show error
		PrepForALoad();         // Ask again
	} else {
		e[NOUNCADR] = e[ZREG];  // Capture the address
		e[REQRET] = 0;
	}
}

function XEQVERB() {
    if (e[iTRACE] & itPINBALL) console.log("XEQVERB()");
    var isError = false;

    if (verbs[e[VERBREG]] === undefined) isError = true;
    if (verbs[e[VERBREG]] === 0) isError = true;
    
    if (isError) {
        setAlert(aOPR_ERR);
    } else { 
        resetAlert(aVN_FLASH);
        verbs[e[VERBREG]]();
    }
}

//////////////////////////////////////////////////////////////////////////////////
///////                            Key processers                          ///////
//////////////////////////////////////////////////////////////////////////////////

function EnterKey() {
    if (e[iTRACE] & itPINBALL) console.log(EnterKey.caller.name+": EnterKey()");
    
    // ENTER PASS 0 IS THE EXECUTE FUNCTION. HIGHER ORDER ENTERS ARE TO LOAD
    // DATA. THE SIGN OF REQRET DETERMINES THE PASS, + FOR PASS 0, - FOR HIGHER
    // PASSES.
    //
    // MACHINE CADR TO BE SPECIFIED (MCTBS) NOUNS DESIRE AN ECADR TO BE LOADED
    // WHEN USED WITH LOAD VERBS, MONITOR VERBS, OR DISPLAY VERBS (EXCEPT
    // V37 = FIXED MEMORY DISPLAY, WHICH REQUIRES AN FCADR).

    var eError = false;
    var noExec = false;
    
    e[CLPASS] = 0;
	
    if (e[REQRET] == 0) {                 // ENTPAS0 -- process current verb
        if (e[iTRACE] & itPINBALL) console.log("ENTPAS0");
		
        e[DECBRNCH] = 0;
        e[DSPCOUNT] = MaxUns ^ dtVD1;
        e[VERBSAVE] = MaxUns ^ e[VERBREG];
		
        if (e[VERBREG] < 28) {            // For regular verbs (<30), need to verify noun
            if (!nIsValid(e[NOUNREG])) eError = true;
			
			// For Load verbs (21-25) check if load is allowed
            if ((e[VERBREG] > 20) && 
			    (e[VERBREG] < 26) && 
				nIsNoLoad(e[NOUNREG])) eError = true;
				
			// For Increment machine address (N15), increment and show new value
			// (unless the display will use R3 -- which is where the CADR is displayed)
            if (e[NOUNREG] == 15) {
                e[NOUNCADR]++;
                if ((e[VERBREG] % 10) !== 5) showOctal(3, e[NOUNCADR]);
            }
			
			// For nouns 1-3 (Specify address) and 10 (specify channel)
			// prompt for address (or channel)
            if ((e[NOUNREG] < 4) || (e[NOUNREG] == 10)) {   // MCTBS
                noExec = true;
                PrepForALoad();
            }
			if (!eError) nSetCadr();
        }
		
		if (eError) {
			setAlert(aOPR_ERR);
			noExec = true;
			e[DSPCOUNT] = Bit15;
		}
		
        if (!noExec) {
            e[DSPLOCK] = 0;
            XEQVERB();
        }
		
		
    } else if (e[REQRET] == ALoadComplete) {
		ALoadEnter();
		XEQVERB();
		
		
    } else {    // ENTPASHI -- data load of some kind
        if (e[iTRACE] & itPINBALL) console.log("ENTPASHI");

        if (e[DECBRNCH] !== 0) {                    // If decimal entered
			if ((ncGetSfr(e[NOUNREG], 1) == 0) ||   //   but octal required
			    ((e[DSPCOUNT] & Bit15) == 0)) {     //   or <5 digits entered
                setAlert(aOPR_ERR);                 //   show error
                return;
			}
        }

        e[INREL] = INRELTAB[spMagnOfE(DSPCOUNT)]; // INREL <= VERB:0, NOUN:1, R1:2, R2:3, R3:4

		var lastEnter = false;               // check whether all comps loaded:

		if (e[INREL] == 4) 
			lastEnter = true;
		if ((e[INREL] == 3) && (e[VERBREG] == 24)) 
			lastEnter = true;
		if ((e[INREL] == 2) && (e[VERBREG] < 24)) 
			lastEnter = true;
		
		if (lastEnter) {
			RLoadEnter();
		} else {
			prepForRLoad(e[INREL]);
			e[CLPASS] = 0;
        }
    }
}    
    
function RELDSP() {
    e[DSPLOCK] = 0;
    e[MONSAVE1] &= MaxUns ^ Bit14;
    // anybody waiting to use the display?
	// !! Apparently I never finished translating RELDSP... but:
	// I *think* that the monitor is resumed simply by clearing DSPLOCK
}

function DigitKey() { 
    if (e[iTRACE] & itPINBALL) console.log(DigitKey.caller.name+": DigitKey()");
    
    // DigitKey ASSEMBLES OCTAL 3 BITS AT A TIME. FOR DECIMAL IT CONVERTS INCOMING
    // WORD AS A FRACTION, KEEPING RESULTS TO DP.
    // OCTAL RESULTS ARE LEFT IN XREG, YREG, OR ZREG. HI PART OF DEC IN XREG,
    // YREG, ZREG. THE LOW PARTS IN XREGLP, YREGLP, OR ZREGLP.
    // DECBRNCH IS LEFT AT +0 FOR OCT, +1 FOR +DEC, +2 FOR -DEC.
    // IF DSPCOUNT WAS LEFT -, NO MORE DATA IS ACCEPTED.

    if (e[DSPCOUNT] & Bit15) return;              // -DSPCOUNT means entry is complete
    if ((e[DECBRNCH] == 0) && (e[CHAR] > 7)) {    // DECBRANCH 0 means octal... 
        setAlert(aOPR_ERR);                       // ...entry: 8 & 9 disallowed
        return;
    }
    
    e[INREL] = INRELTAB[e[DSPCOUNT]];             // INREL <= VV:0 NN:1 R1:2 R2:3 R3:4
    e[CLPASS] &= Bit15;                           // Leave CLPASS alone if -NZ
    
    e[CODE] = RELTAB[e[CHAR]] & MaskR5;           // CODE <= relay code for entered digit
    e[CODE] <<= 5 * Math.floor(e[DSPCOUNT] % 2);  // Shift CODE 5 places left if needed
    e[DSREL] = (e[DSPCOUNT] & MaskR5) >> 1;       // DSREL <= offset into DSPTAB
    e[DSPTAB+e[DSREL]] |= e[CODE] + Bit15;        // insert relay code into DSPTAB
    
    if (e[DECBRNCH] == 0) {                       // Octal:
        e[VERBREG+e[INREL]] *= 8;                 // Shift and add
        e[VERBREG+e[INREL]] += e[CHAR];
    } else {                                      // Decimal:
        e[VERBREG+e[INREL]] *= 10;
        e[VERBREG+e[INREL]] += e[CHAR];
    }

    if (e[DSPCOUNT] > CRITCON[e[INREL]]) {        // if not yet filled,
        e[DSPCOUNT]--;                            //   point to next entry position
    } else {                                      // otherwise accept no more digits
        e[DSPCOUNT] ^= MaxUns;                    //   (by making DSPCOUNT -)
        if (e[INREL] > 1) {                       // NN & VV are done; R1-R3 need scaling.
            if (e[DECBRNCH] > 0) {                // if input was decimal
			    // Scale the completed input
                var scaledInput = Math.floor((e[VERBREG+e[INREL]] * pow_2_28) / 1e5);
				// If - input, invert all bits
                if (e[DECBRNCH] > 1) scaledInput ^= MaskR29; 
                // X/Y/ZREGLP <= low 14 bits of result				
                e[VERBREG+e[INREL]+3] = MaskR14 & scaledInput; 
                // X/Y/ZREG <= sign + high 14 bits of result				
                e[VERBREG+e[INREL]] = MaskR15 & (scaledInput >>> 14);        
            }
        }
    }
	if (e[iTRACE] & itPINBALL) {
		console.log("VERBREG="+o(VERBREG)+"  NOUNREG="+o(NOUNREG));
		console.log("   XREG="+o(XREG)   +"     YREG="+o(YREG)  +"    ZREG="+o(ZREG));
		console.log(" XREGLP="+o(XREGLP) +"   YREGLP="+o(YREGLP)+"  ZREGLP="+o(ZREGLP));
	}
}

function ClearKey() {
    if (e[iTRACE] & itPINBALL) {
		console.log(ClearKey.caller.name+": ClearKey()");
		console.log("On entry: DSPCOUNT="+octal(e[DSPCOUNT])+
					" DECBRNCH="+e[DECBRNCH]+
					" CLPASS="+e[CLPASS]+
					" VERBREG="+e[VERBREG]);
	}

	CCS(DSPCOUNT);                          // set A to be within the DSPTAB entry
	if (e[Q] > 1) e[A]++;                   //   for the data just entered
	e[INREL] = INRELTAB[e[A]];              // INREL <= VERB:0, NOUN:1, R1:2, R2:3, R3:4
    
    if (e[INREL] < 2) return;               // If entering VV or NN, ignore CLR
	
	if (e[CLPASS] == 0) {                   // Clear just this register
		clearRegister(e[INREL]-1);          // Blank the register
		e[DSPCOUNT] = [dtR1D1, dtR2D1, dtR3D1][e[INREL]-2]; // Set DSPCOUNT to 1st digit
		e[DECBRNCH] = 0;
	} else {                                // Second or third CLR - back up
        if ((e[INREL] > 2) &&               //     and currently in R2 or R3, 
            ((e[CLPASS] & Bit15) == 0)) {   //     and backup is permitted,     
            e[INREL]--;                     //     backup to previous register
			clearRegister(e[INREL]-1);      // Blank the register
			e[DSPCOUNT] = [dtR1D1, dtR2D1, dtR3D1][e[INREL]-2]; // Set DSPCOUNT to 1st digit
			e[DECBRNCH] = 0;
            e[MIXTEMP] = e[INREL];
            DSPVV(19 + e[INREL]);
		}
    }
    if ((e[CLPASS] & Bit15) == 0) e[CLPASS]++;   // Increase CLPASS
	
    if (e[iTRACE] & itPINBALL) {
		console.log("On exit:  DSPCOUNT="+octal(e[DSPCOUNT])+
					" DECBRNCH="+e[DECBRNCH]+
					" CLPASS="+e[CLPASS]+
					" VERBREG="+e[VERBREG]+
					" INREL="+e[INREL]);
	}
}

function SignKey(theSign) {
    if (e[iTRACE] & itPINBALL) console.log(SignKey.caller.name+": SignKey("+theSign+")");

    if (e[DECBRNCH] > 0) return;                 // If sign already entered, ignore
    if ((e[DSPCOUNT] !== dtR1D1) &&              // if any digits entered, ignore
        (e[DSPCOUNT] !== dtR2D1) && 
        (e[DSPCOUNT] !== dtR3D1)) return;
    
    e[CLPASS] &= Bit15;
    e[DECBRNCH] = theSign;                       // Remember the sign
    
    e[INREL] = INRELTAB[e[DSPCOUNT]];
    e[DSREL] = [5, 3, 0][e[INREL] - 2];          // Get DSPTAB entry # of - sign
    if (theSign == 1) {                          //   for this register
        e[DSPTAB+e[DSREL]] &= MaxUns - Bit11;    // Reset the - sign bit
        e[DSPTAB+e[DSREL]] |= Bit15;            
        e[DSPTAB+e[DSREL]+1] |= Bit11 + Bit15;   // Set the + sign bit       
    } else {
        e[DSPTAB+e[DSREL]+1] &= MaxUns - Bit11;  // Reset the + sign bit
        e[DSPTAB+e[DSREL]+1] |= Bit15;
        e[DSPTAB+e[DSREL]] |= Bit11 + Bit15;     // Set the - sign bit
    }    
}

function VerbKey() {
    if (e[iTRACE] & itPINBALL) console.log(VerbKey.caller.name+": VerbKey()");

    e[VERBREG] = 0;           // Prepare to accept a Verb
    e[DSPCOUNT] = dtVD1;      // Input will go into the VV area  
    e[DSPTAB+9] = Bit15;      // Blank the VV display
    e[DECBRNCH] = 1;          // Input will be +dec  
	e[REQRET] = 0;
}

function NounKey() {
    if (e[iTRACE] & itPINBALL) console.log(NounKey.caller.name+": NounKey()");

    e[NOUNREG] = 0;           // Prepare to accept a Noun
    e[DSPCOUNT] = dtND1;      // Input will go into the NN area       
    e[DSPTAB+8] = Bit15;      // Blank the NN display
    e[DECBRNCH] = 1;          // Input will be +dec         
	e[REQRET] = 0;
}

function KeyRelKey() {
    if (e[iTRACE] & itPINBALL) console.log(KeyRelKey.caller.name+": KeyRelKey()");

    resetAlert(aUPLINK_ACTY);
    e[DSPLOCK] = 0;
    resetAlert(aKEY_REL); 
    resetAlert(aVN_FLASH);
    pIDLE();
    pIDLE = doNothing;
}

function ResetKey() {
    if (e[iTRACE] & itPINBALL) console.log(ResetKey.caller.name+": ResetKey()");
    
    e[DSPLOCK] = e[D2122REG]     // Display lock (KEY-REL) is unaffected by RSET

    resetAlert(aUPLINK_ACTY);
    resetAlert(aOPR_ERR);
    resetAlert(aPROG);
    resetAlert(aRESTART);
    resetAlert(aTRACKER);
    AlertsCh[8] |= Bit15;
	
	eStore(FAILREG, 0);          // 1st and 2nd (but not last) failure codes are cleared
	eStore(FAILREG+1, 0);
    
	// Cause entire display to be refreshed
    for (var dtIndex=11; dtIndex>=0; dtIndex--) e[DSPTAB+dtIndex] |= Bit15; 
}

//////////////////////////////////////////////////////////////////////////////////
///////                         Interface functions                        ///////
//////////////////////////////////////////////////////////////////////////////////
        
function CHARIN() {
    if (e[iTRACE] & itPINBALL) console.log("CHARIN()");

    e[D2122REG] = DSPLOCK;       // Save DSPLOCK in case the key was RSET
    e[DSPLOCK] = 1;              // Block the display from use by other processes 

    if ((e[CADRSTOR] !== 0) & (e[MPAC] !== kRSET)) setAlert(aKEY_REL);
    e[CHAR] = e[MPAC];
    
    if (e[CHAR] === kZERO) { e[CHAR] = 0; }         // The "0" key comes in as keyCode 16
    if (e[CHAR] < 10) { 
        DigitKey();
    } else {
        switch (e[CHAR]) {
            case kVERB:    VerbKey();   break;
            case kRSET:    ResetKey();  break;
            case kKEY_REL: KeyRelKey(); break;
            case kPLUS:    SignKey(1);  break;
            case kMINUS:   SignKey(2);  break;
            case kENTR:    EnterKey();  break;
            case kCLR:     ClearKey();  break;
            case kNOUN:    NounKey();   break;
            default:       setAlert(aOPR_ERR);
        }
    }
}

function ProceedKey() {
    if (e[iTRACE] & itPINBALL) console.log("ProceedKey()");

    if (STBY) {                                   // In STBY mode, only PRO is accepted.
        proceed_TimerID = setTimeout(function() { // A 5-sec PRO press will wake AGC.
            proceed_TimerID = 0;
            agcInit();               // N.B. agcInit pauses 0.5-sec before acting
            setAlert(aNO_ATT);       // NO ATT is illuminated for 90 seconds.
            resetAlert(aSTBY);
            setTimeout(function() { 
			    if (!testAlert(aTEST_LIGHTS)) resetAlert(aNO_ATT); 
				}, 90000);
            setTimeout(function() {
				DSPMM(6);
                NVSUB(37, 0, 0);
                e[PROGPASS] = 0;
                changeProgram();
                }, 600);                          // Wait for agcInit before doing V37.
            }, 5000);
    } else if (e[MMNUMBER] === 6) {               // If P06 is running, a 5-second PRO
        proceed_TimerID = setTimeout(function() { //   press will turn everything off...
            BLANKALL();
            DSPMM(-1);                            
            AlertsCh[8] = 0;
            AlertsCh[9] = 0;
            AlertsCh[11] = 0;
            updateDisplay();
            setTimeout(function() {
                setAlert(aSTBY);
                dskyOff();
                agcStby();              // Cancel all asynch processes
                }, 1000);
            }, 5000);
    } else {
        KILLMON();                      // Stop any currently running Monitor Verb.
        e[DSPLOCK] = 0;
        resetAlert(aKEY_REL);
        pPWOI();                        // Execute "Proceed w/o Input" hook
    }
}

function proRelease() {
    if (e[iTRACE] & itPINBALL) console.log("proRelease()");
    
    if (proceed_TimerID) {
        clearTimeout(proceed_TimerID);
        proceed_TimerID = 0;
    }
}
