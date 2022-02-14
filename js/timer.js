//
// timer.js - The code that initializes and controls the Mission Timer lives here.
//
// The Mission Timer is independent of the AGC. There is a signal common to the 
// AGC and the mission timer: the liftoff discrete. When liftoff occurs, the 
// Mission Timer is reset to zero. The timer will count up only if SW4 is in the
// up ("START") position.
//
// Switches SW1..SW3 are spring-loaded to the center position. Switch SW4 can be
// set to the up or center position; it is spring-loaded to return from the down
// position to the center position.
//

/*
  The Mission Timer:
                                  HOURS   MIN    SEC
         HOURS    MIN    SEC       -------TENS------   START
         0 0 0    0 0    0 0       SW1    SW2    SW3    SW4  STOP
                                   ------UNITS------   RESET
*/

var mtTrace = false;

var mtIntervalID = 0;
var mtLiftoffSense = 0;

var mtStartTime = 0;
var mtOffsetTime = 0;

var mtDigitImages = new Array();
var mtSwitchImages = new Array();

var toggleSetClick;
var toggleSetResetClick;

function mtDefineImages() {  // called from ui.js after page load is complete
    mtDigitImages[0] = imgDir + 'Digit_0.png';
    mtDigitImages[1] = imgDir + 'Digit_1.png';
    mtDigitImages[2] = imgDir + 'Digit_2.png';
    mtDigitImages[3] = imgDir + 'Digit_3.png';
    mtDigitImages[4] = imgDir + 'Digit_4.png';
    mtDigitImages[5] = imgDir + 'Digit_5.png';
    mtDigitImages[6] = imgDir + 'Digit_6.png';
    mtDigitImages[7] = imgDir + 'Digit_7.png';
    mtDigitImages[8] = imgDir + 'Digit_8.png';
    mtDigitImages[9] = imgDir + 'Digit_9.png';
    mtDigitImages[10] = imgDir + 'Digit_blank.png';
	// The symbol I call 'psi' (because that's what it looks like to me) is an
	// indication that the mission timer "has switched to an internal timing
	// pulse resulting from a CTE external signal loss." In short, it's a failure
	// indication, and not something that would ever be on in "normal"
	// operating conditions. So iDSKY doesn't ever turn it on. 
    mtDigitImages[11] = imgDir + 'Digit_psi.png';

    mtSwitchImages['down']    = imgDir + 'Toggle_Down.png';
    mtSwitchImages['neutral'] = imgDir + 'Toggle_Neutral.png';
    mtSwitchImages['up']      = imgDir + 'Toggle_Up.png';
}

function mtDefineSounds() {
	// I've never liked the sounds provided by these .wav files, plus they
	// lag keypresses noticably. But if you like aural feedback, feel free
	// to use them by setting "doKeyClick" to true at the beginning of ui.js
	toggleSetClick = new Audio('wav/toggle1.wav');
	toggleSetResetClick = new Audio('wav/toggle2.wav');
}

function mtChangeImageOnDiv(imgId, imgName) {
    var theImageSlot = document.getElementById(imgId);
    theImageSlot.src = imgName;
}   

function mtInit() {
    if (mtTrace) console.log("mtInit()");
    if (mtIntervalID === 0) {
        mtIntervalID = setInterval(function () { mtUpdate(); }, 1000);
    }
    mtLiftoffSense = false;
    mtStartTime = 0;
    mtOffsetTime = 0;
    mtChangeImageOnDiv("mtPSI", mtDigitImages[10]);
    mtDisplay();
}

// Handle timer-increment switches (1-3)

function mtIncr(e, theSwitch, thePosition, theIncrement) {
    if (mtTrace) console.log("mtIncr("+theSwitch+", "+thePosition+", "+theIncrement+")");
    mtOffsetTime += 1000 * theIncrement;
    mtChangeImageOnDiv("mtSW"+theSwitch, mtSwitchImages[thePosition]);
    if (doKeyClick) {
        toggleSetResetClick.currentTime = 0;
        toggleSetResetClick.play();
    }
	
    switch (theSwitch) {
        case 1:
            setTimeout(function() { 
			               mtChangeImageOnDiv("mtSW1", mtSwitchImages['neutral']); 
					   }, 200);
            break;
        case 2:
            setTimeout(function() { 
			               mtChangeImageOnDiv("mtSW2", mtSwitchImages['neutral']); 
					   }, 200);
            break;
        case 3:
            setTimeout(function() { 
			               mtChangeImageOnDiv("mtSW3", mtSwitchImages['neutral']); 
					   }, 200);
            break;
    }
    mtDisplay();

    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
}

// SWITCH 4:

function mtStart(e) {
    if (mtTrace) console.log("mtStart()");
    if (mtStartTime == 0) {
        mtStartTime = (new Date).getTime();
        mtChangeImageOnDiv("mtSW4", mtSwitchImages['up']);
        if (doKeyClick) {
            toggleSetClick.currentTime = 0;
            toggleSetClick.play();
        }
        mtDisplay();
    }

    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
}

function mtStop(e) {
    if (mtTrace) console.log("mtStop()");
    if (mtStartTime != 0) {
        mtOffsetTime += (new Date).getTime() - mtStartTime;
        mtStartTime = 0;
        mtChangeImageOnDiv("mtSW4", mtSwitchImages['neutral']);
        if (doKeyClick) {
            toggleSetClick.currentTime = 0;
            toggleSetClick.play();
        }
        mtDisplay();
    }

    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
}

function mtReset(e) {
    if (mtTrace) console.log("mtReset()");
    mtStartTime = 0;
    mtOffsetTime = 0;
    mtLiftoffSense = false;
    
    mtChangeImageOnDiv("mtSW4", mtSwitchImages['down']);
        if (doKeyClick) {
            toggleSetResetClick.currentTime = 0;
            toggleSetResetClick.play();
        }
	
    setTimeout(function() { 
	               mtChangeImageOnDiv("mtSW4", mtSwitchImages['neutral']); 
			   }, 200);
    mtDisplay();

    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
}

// Called once per second

function mtUpdate() {
    // The only possible change in Channel 30 Bit 5 (the liftoff
	// discrete) is from "not set" to "set." When that happens, it
	// means liftoff has occurred, and the timer is reset.
	
    if (!mtLiftoffSense) {
        if (Channel[030] & Bit5) {
            mtLiftoffSense = true;
            mtOffsetTime = 0;
            if (mtStartTime != 0)
                mtStartTime = (new Date).getTime();
        }
    }

    if (mtStartTime != 0) mtDisplay();
}
 
function mtDisplay() { 
    var now = (new Date).getTime();
    var theTime = mtOffsetTime;
    if (mtStartTime != 0) theTime += now - mtStartTime;
    theTime = Math.floor(theTime / 1000);

    mtChangeImageOnDiv("mtS2", mtDigitImages[theTime % 10]);
    theTime = Math.floor(theTime / 10);
    mtChangeImageOnDiv("mtS1", mtDigitImages[theTime % 6]);
    theTime = Math.floor(theTime / 6);
    
    mtChangeImageOnDiv("mtM2", mtDigitImages[theTime % 10]);
    theTime = Math.floor(theTime / 10);
    mtChangeImageOnDiv("mtM1", mtDigitImages[theTime % 6]);
    theTime = Math.floor(theTime / 6);

    mtChangeImageOnDiv("mtH3", mtDigitImages[theTime % 10]);
    theTime = Math.floor(theTime / 10);
    mtChangeImageOnDiv("mtH2", mtDigitImages[theTime % 10]);
    theTime = Math.floor(theTime / 10);
    mtChangeImageOnDiv("mtH1", mtDigitImages[theTime % 10]);
}