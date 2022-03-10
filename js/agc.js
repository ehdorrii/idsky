//
// agc.js - The code that initializes the AGC lives here, as well as the
//          event handling routines and the periodic timer service.
//
// The whole iDSKY thing is (like all Javascript/HTML apps) event-driven.
// Javascript doesn't do interrupts, so it all runs off events like mouse-clicks,
// or screen taps, plus timer events.
// 
// The user-interface part is relatively easy -- the user clicks or taps keys,
// which sends events to dskyKeyInput() in dsky.js, which then calls KEYRUPT (in this 
// module), which calls CHARIN in pinball.js, which then calls specific key handlers
// (also in pinball). The key handlers in pinball then take some appropriate action
// to process the keypress. Stuff happens, the display is updated, and the call
// stack unwinds.
//
// In the real AGC however, the EXECUTIVE has a list of jobs and tasks that it runs
// because, well, that's what an executive does. Multiple things can seem to be
// running simultaneously because it gives each job and task a slice of time to do
// its work, and when its time is up, the executive re-takes control, even if the job
// or task is not finished. (Preemptive multitasking.) It *also* processes
// interrupts: let's say a job is in the middle of doing its work, maybe a long 
// calculation. If some event occurs that needs attention (perhaps a keystroke from
// the DSKY), the hardware generates a signal, the currently executing code is
// interrupted and the event is handled; then the interrupted code is resumed.
//
// BUT, Javascript doesn't do interrupts. Once something is started, Javascript is
// completely synchronous -- it just keeps executing whatever was started until that
// thing is finished. If (say) a timer comes due while a "program" is running, the
// timer handler doesn't get processed until the currently executing code yields
// control back to the Javascript interpreter. So you can't multi-task the same
// way the AGC does. 
//
// Therefore, programs and certain verbs are implemented in iDSKY as code that does
// something, and then sets a timer to get itself called again after some delay. In 
// this way other code gets a chance to execute. (Cooperative multitasking.)

// With that out of the way, here is a high-level view of how this AGC simulation
// works:
//
// 1. A JavaScript interval timer is set, which calls T2RUPT() every 0.1 seconds.
//    T2RUPT is what updates the AGC timer. In the real AGC, T2RUPT is fired every
//    0.01 seconds, but this frequency is not really necessary in iDSKY
// 
// 2. A JavaScript interval timer is set, which calls T4RUPT() every 0.12 seconds.
//    This is the same frequency that T4RUPT is fired in the real AGC. Since
//    display updates are done in T4RUPT, I wanted to maintain the frequency. In
//    addition to display updates, T4RUPT updates the accelerometer and gyro values
//    (on devices that have those sensors), and calls the self-test routine. On the
//    real AGC, T4RUPT is used to schedule jobs and tasks as well.
//
// 3. When a screen tap or mouse click occurs on the displayed DSKY keyboard,
//    KEYRUPT() is called. If the AGC is in standby mode, the event is ignored.
//    Otherwise the appropriate keycode is stored in MPAC, and the CHARIN() function
//    (which lives in pinball.js) is scheduled via a JavaScript timer. [Note that
//    the PRO key gets special handling, since it is the only key that is active
//    when the AGC is in standby mode.]
//
// 4. When a "Program" is selected, it is called by the V37 handler (changeProgram()),
//    and the program itself does whatever it is supposed to do by scheduling timers
//    whose IDs are then stored id prog_TimerID.

const agcDebug = false;
if (agcDebug) e[iTRACE] |= itAGC;

const selfTest = true;      // Turn on coretest by default

var STBY = false;

var T4RUPT_TimerID = 0;     // setTimeout() timer
var T4Increment = 120;

var T2Epoch = new Date();   // Epoch is only reset by the launch discrete
var centiseconds = 0;       // So JS doesn't create a var every time T2RUPT is called
var T2RUPT_TimerID = 0;     // setInterval() timer
var T2Increment = 100;      // How often (in milliseconds) T2RUPT is called

var prog_TimerID = 0;       // Program Timeout ID -- used to stop an active program

var mon_TimerID = 0;        // Monitor Timeout ID -- used to stop an active monitor
var mProg = 0;              // The routine to handle active monitor

var proceed_TimerID;        // Used for the PRO key 5-second check with Prog 06
var lightsTest_TimerID;     // Lights test in progress when this is non-zero

var pRECYCLE;               // A handler for "Recycle" (V32)
var pPWOI;                  // A handler for "Proceed Without Input" (V33)
var pTERM;                  // A handler for "Terminate" (V34)
var pIDLE;                  // A handler for NVSBUSY
var pENTR;                  // To be executed at ENTR on data entry

var compActy;               // Set to stop aCOMP_ACTY from being extinguished in KEYRUPT

e[MISSION] = 16;            // At initial load only, default mission to Apollo 16

////////////////////////////////
// End of data, start of code //
////////////////////////////////

//
//////////////////////////////////////////////////////////////
//
//  agcInit - equivalent to "turning on" the agc
//

function agcInit() {
    if (e[iTRACE] & itAGC) console.log(agcInit.caller.name+": agcInit()");

    var ix;
	
    STBY = false;
	
	// At power-on or first initialization, set things up according to whether
	// the AGC is configured as a CMC or LGC
	
    if (flagIsSet(COMPUTER)) {
        dskyOn("CMC");
    } else {
        dskyOn("LGC");
    }
    setProgs();
	setNounTabs();
    
	// Begin the T2 timer, which keeps track of AGC time
	
    if (T2RUPT_TimerID === 0)
        T2RUPT_TimerID = setInterval(T2RUPT, T2Increment);

	// Ensure the DSKY display is completely empty
	
	BLANKALL();
    setAlert(aCOMP_ACTY);
	
	// After a half-second delay, finish initializing
    
    setTimeout(function() {
        if (T4RUPT_TimerID === 0)
            T4RUPT_TimerID = setInterval(T4RUPT, T4Increment);

		pRECYCLE = doNothing;
        pPWOI = doNothing;    // No handler for "Proceed without input"
        pTERM = doNothing;    // No handler for "Terminate Load/Test"
        pENTR = doNothing;    // No handler for ENTR key
        pIDLE = doNothing;    // No waiting process

        DOFSTART();
		
        e[VERBREG] = 0;
        e[NOUNREG] = 0;
		// e[MMREG] = 077777;
         
        e[MONSAVE] = 0;
        e[MONSAVE1] = 0;
        
        // pad();    // AT the moment, this conflicts with padLoad();

        for (ix=000; ix<016; ix++) {
            Channel[ix] = 0;
        }
        for (ix=030; ix<033; ix++) {
            Channel[ix] = 0;
        }
        Channel[077] = 0;

        if (selfTest) e[SMODE] |= 4;
        resetCompActy();
    }, 500);
}

function DOFSTART() {  // Do Fresh Start
    if (e[iTRACE] & itAGC) console.log(DOFSTART.caller.name+": DOFSTART()");
	
    e[ERESTORE] = 0;             // @@ Review against the actual DOFSTART code
	e[SMODE] = 0;
    e[PROGPASS] = 0;
	e[DSPCOUNT] = Bit15;         // disallow digit entry
	e[WTOPTION] = 0;
	
    spStore(MMNUMBER, 0, -1);
	DSPMM(-1);
	
    setFlag(DSKYFLAG);           // Displays are sent to DSKY
	processCh9(0);
	processCh11(0);
}

function pad() {
    if (e[iTRACE] & itAGC) console.log(pad.caller.name+": pad()");

    // The values here are kilograms

}

function agcStby() {
    if (e[iTRACE] & itAGC) console.log(agcStby.caller.name+": agcStby()");

    if (T2RUPT_TimerID) {
        clearTimeout(T2RUPT_TimerID);
        T2RUPT_TimerID = 0;
    }
    if (T4RUPT_TimerID) {
        clearTimeout(T4RUPT_TimerID);
        T4RUPT_TimerID = 0;
    }
    cancelProg();
    KILLMON();
    STBY = true;
}

// On the real AGC, T2RUPT just increments the TIME2.TIME1 timer. Unfortunately,
// because JavaScript timers are sometimes delayed because of the synchronous
// nature of the JavaScript interpretor, this causes the TIME2.TIME1 timer to
// run slow. To ameliorate this issue, I store an epoch date object at AGC
// initialization, and T2RUPT sets the value of TIME2.TIME1 to be the offset of
// the current time from the epoch time.

function T2RUPT() {
	centiseconds = 0|(((new Date()) - T2Epoch) / 10);
    e[TIME1] = centiseconds & 037777;
	e[TIME2] = (centiseconds >> 14) & 037777;
}

// Because T2RUPT calculates the value of TIME2.TIME1 from an epoch value, any
// time TIME2.TIME1 is updated anywhere else, the epoch must be recalculated.
// That is what T2Update does. Any code that alters TIME2 and/or TIME1 *must*
// call T2Update() immediately afterwards -- before yielding to the JavaScript
// interpretor.

function T2Update() {
    centiseconds = e[TIME1] + (e[TIME2] << 14);
	T2Epoch = (new Date()) - (centiseconds * 10);
}

// In the real AGC, T4RUPT is used to run certain routines based on the 
// cycling value of RUPTREG1.

var T4Count = 0;
function T4RUPT() {
	e[A] = (e[RUPTREG1] == 0) ? 7 : e[RUPTREG1] - 1;   // Cycling counter for T4RUPT
	eStore(RUPTREG1, e[A]);
	if (flagIsSet(DSKYFLAG) && (spMagnOfE(NOUT) > 0)) {
		eStore(NOUT, spMagnOfE(NOUT)-1);
		eStore(DSRUPTEM, 0, -1);
	}

	e[TIME4] = (e[TIME4] + T4Increment) % ModMagn;

	if (e[DEVCAPFL] & ORIENTEV) {
		spStore(PIPAX, ax*10, +1);
		spStore(PIPAY, ay*10, +1);
		spStore(PIPAZ, az*10, +1);
	}

	if (e[DEVCAPFL] & MOTIONEV) {
		spStore(CDUX, ralpha*10, +1);
		spStore(CDUY, rbeta*10, +1);
		spStore(CDUZ, rgamma*10, +1);
	}

	if (e[SMODE] == 4) coreTest();
	updateDisplay();
}

function KEYRUPT(theChannel, keyCode) {
    if (e[iTRACE] & itAGC) console.log("KEYRUPT("+theChannel+", "+keyCode+")");

    if ((theChannel === 032) && (keyCode === Bit14)) {  // Special handling for PRO key
        ProceedKey();
    } else {
        e[SAMPTIME] = e[TIME2];
        e[SAMPTIME+1] = e[TIME1]; 
    
        if (!STBY) {
            setAlert(aCOMP_ACTY);
            setTimeout(function() {
                if (!testAlert(aTEST_LIGHTS)) {
                    eStore(MPAC, keyCode);
                    CHARIN();
                    if (!compActy) resetAlert(aCOMP_ACTY);
                }
            }, 2);
        }
    }
}

function progAlert(theError, theWhere, theWhat) {
    if (e[iTRACE] & itAGC) 
		console.log(progAlert.caller.name+": progAlert("+
	                octal5(theError)+", "+
					octal5(theWhere)+", "+
					octal5(theWhat)+")");

    console.trace();
    setAlert(aPROG);

    eStore(ALMCADR, theError & 007777);
    eStore(ALMCADR+1, theWhere);
    eStore(ALMCADR+2, theWhat);
	
	eStore(ERCOUNT, eFetch(ERCOUNT)+1);

    if (eFetch(FAILREG) == 0)            // FAILREG holds the first alarm code
        eStore(FAILREG, theError);
    else if (eFetch(FAILREG+1) == 0)     // FAILREG+1 holds the second alarm code
        eStore(FAILREG+1, theError);
    eStore(FAILREG+2, theError);         // FAILREG+2 holds the most recent alarm code
        
    if (theError > 007777) {
        switch (theError >> 12) {
            case 3:
                DOFSTART();
				setAlert(aRESTART);
				break;
            case 2:
                cancelProg();
                e[MODREG] = 0;
                DSPMM(0);
                pPWOI = doNothing;
                pTERM = doNothing;
                pIDLE = doNothing;
				setAlert(aPROG);
				break;
            default:
                NVSUB(5, 9, 0);
        }
    }
    return  true;
}

function coreTest() {

    // This checks for (and corrects) out-of-range values in erasable memory.
    // To reduce overhead, only 16 words are checked per invocation. At this
    // rate, all 2048 words of erasable memory will be checked every 16 seconds.
	//
    // This is a real test, intended to catch programming errors in iDSKY. The
    // results are reported similarly to the real AGC self-test.

    e[SKEEP1] = e[SELFRET];                // The beginning of the range to be checked
    e[SKEEP2] = e[SKEEP1] + 16;            // The end+1 of the range to be checked
    e[SELFRET] = (e[SKEEP2] % eMemSize);   // Increment the start address for next time

    for (var ix=e[SKEEP1]; ix<e[SKEEP2]; ix++) {
        if (isNaN(e[ix])) {
			console.log("e[" + octal5(ix) + "]=NaN");
            progAlert(003001, 000106, ix);
            e[ix] = 0;
        }
        if (e[ix] < 0) {
			console.log("e[" + octal5(ix) + "]=" + e[ix] + " (negative value)");
            progAlert(003002, 000106, ix);
            e[ix] = 0 - e[ix];
        }
        if (e[ix] > MaxUns) {
			console.log("e[" + octal5(ix) + "]=" + e[ix] + " (exceeds word size)");
            progAlert(003003, 000106, ix);
            e[ix] = e[ix] % ModUns;
        }
        if ((e[ix] % 1.0) != 0) {
			console.log("e[" + octal5(ix) + "]=" + e[ix] + " (non-integer)");
            progAlert(003004, 000106, ix);
            e[ix] = 0|e[ix];
        }
    }
}