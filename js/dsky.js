//
// dsky.js - This source module isolates the DSKY functionality from all the rest
//      of iDSKY, partly in an effort to facilitate reuse with other AGC engines,
//      but mostly because this replicates the real situation.
//
//  NOTE: Bits on Channel 8 are supposed to be inverted. This implementation
//        doesn't invert them. Uncomment the first statement in processCh8()
//        if used with an implementation that does send inverted bits.
//
//  REFERENCES
//        * http://www.ibiblio.org/apollo/developer.html
//        * Keyboard and Display Program and Operation, E-2129, MIT
//          Intrumentation Laboratory
//

const dskyDebug = false;
const dskyDebugDeep = false;

const dskyFlashInterval = 283;        // Close to 1.25sec/4
var dskyFlash_TimerID;

const dskySweepInterval = 20;         // ms to wait for relays to latch
var dskySweep_TimerID;

var AGC;

var ch8Queue;

// Modes that the DSKY needs to keep track of

var DskyInStandby;       // When DskyInStby is true, only PRO is accepted from keyboard,
                         //    and only DskyOn() is accepted from agc
var FlashCycle;          // Cycles through 0, 1, 2, 3 -- lights off during cycle 3
var FlashVN;             // When set, the Verb & Noun digits flash
var FlashKeyRel;         // When set, the KEY REL alert flashes
var FlashError;          // When set, the OPR ERR alert flashes

// For these 3 variables: 0=no sign (i.e. octal); 1=invalid; 2=negative; 3=positive
// You can also look at this as: bit 1 controls the : part of the sign display and bit 2
// controls the - part of the sign display. If both are off, there is no sign; if both
// are on, the sign is +; if only bit 2 is on, the sign is -. If only bit 1 is on...
// well, I suspect that's invalid, and display no sign.

var R1Sign;
var R2Sign;
var R3Sign;

// The values of the above 3 variables are used as indices into this array:

var signImages = new Array();
var digitImages = new Array();

function defineImages() {  // called from ui.js after page load is complete
    if (dskyDebug) console.log("defineImages()");
    
    signImages[0] = imgDir + 'Digit_blank.png';
    signImages[1] = imgDir + 'Digit_Plus.png';
    signImages[2] = imgDir + 'Digit_Minus.png';
    signImages[3] = imgDir + 'Digit_Plus.png';

    // This array relates AGC output codes to images of the corresponding digits:

    digitImages[025] = imgDir + 'Digit_0.png';
    digitImages[003] = imgDir + 'Digit_1.png';
    digitImages[031] = imgDir + 'Digit_2.png';
    digitImages[033] = imgDir + 'Digit_3.png';
    digitImages[017] = imgDir + 'Digit_4.png';
    digitImages[036] = imgDir + 'Digit_5.png';
    digitImages[034] = imgDir + 'Digit_6.png';
    digitImages[023] = imgDir + 'Digit_7.png';
    digitImages[035] = imgDir + 'Digit_8.png';
    digitImages[037] = imgDir + 'Digit_9.png';
    digitImages[000] = imgDir + 'Digit_blank.png';
}

// This 2-dimensional array maps column/row values to AGC key codes
// These codes are delivered on input channel 13

var keyCodes = new Array();
for (ix=1; ix<8; ix++) {
    keyCodes[ix] = new Array();
}

keyCodes[1][1] = kVERB;    // VERB
keyCodes[1][2] = kNOUN;    // NOUN

keyCodes[2][1] = kPLUS;    // +
keyCodes[2][2] = kMINUS;   // -
keyCodes[2][3] = kZERO;    // 0

keyCodes[3][1] = 7;        // 7
keyCodes[3][2] = 4;        // 4
keyCodes[3][3] = 1;        // 1

keyCodes[4][1] = 8;        // 8
keyCodes[4][2] = 5;        // 5
keyCodes[4][3] = 2;        // 2

keyCodes[5][1] = 9;        // 9
keyCodes[5][2] = 6;        // 6
keyCodes[5][3] = 3;        // 3

keyCodes[6][1] = kCLR;     // CLR
keyCodes[6][2] = kPRO;     // PRO
keyCodes[6][3] = kKEY_REL; // KEY REL

keyCodes[7][1] = kENTR;    // ENTR
keyCodes[7][2] = kRSET;    // RSET

// These DOM element references are pre-loaded (by dskyOn()) 
// to speed up the periodic doFlashUpdate() routine

var elVD1;
var elVD2;
var elND1;
var elND2;
var elAlertKeyRel;
var elAlertOprErr;
var vvnnOnZIndex;

//////////////////////////////////////////////////////////////////////////////////
///////  End of globals and immediate code; start of function definitions  ///////
//////////////////////////////////////////////////////////////////////////////////

function doFlashUpdate() {
    if (DskyInStandby) { return; }
    FlashCycle = (FlashCycle + 1) % 4;
    var newIndex = (FlashCycle < 3) ? vvnnOnZIndex : -1;

    var vnIndex = (FlashVN) ? newIndex : vvnnOnZIndex;
    elVD1.style.zIndex = vnIndex;
    elVD2.style.zIndex = vnIndex;
    elND1.style.zIndex = vnIndex;
    elND2.style.zIndex = vnIndex;

    elAlertKeyRel.style.zIndex = (FlashKeyRel) ? newIndex : -1;
    elAlertOprErr.style.zIndex = (FlashError) ? newIndex : -1;
}

function ChangeImageOnDiv(imgId, imgName) {
    if (dskyDebug) console.log("ChangeImageOnDiv("+imgId+", "+imgName+");");
    var theImageSlot = document.getElementById(imgId);
    theImageSlot.src = imgName;
}

function processCh8(theData) {
    if (dskyDebug) console.log("processCh8("+octal5(theData)+")");
    
    ch8Queue.push(theData);
    if ((dskySweep_TimerID) == 0) {
        dispatchCh8();
    }
}

function dispatchCh8() {
    var theData;
    if (dskyDebug) console.log("dispatchCh8()");
    
    theData = ch8Queue.shift();
    if (theData === undefined) {
        dskySweep_TimerID = 0;
        return;
    }
    // theData ^= MaxUns;      // Bits on Channel 8 are inverted

    if (dskyDebug) {
        var parsed = "";
        for (ix=14; ix>=0; ix--) {
            parsed = parsed + ((1 & (theData >> ix)) ? "1" : "0");
            if ((ix == 11) || (ix == 10) || (ix == 5)) { parsed = parsed + " "; }
        }
        console.log(theData + " => " + parsed);
    }

    var field, signBit, hi5, lo5;

    field = theData;
    lo5 = field & 0x1F;
    field = theData >> 5;
    hi5 = field & 0x1F;
    field = field >> 5;
    signBit = field & 0x01;
    field = field >> 1;

    switch (field) {
        case 1:
            R3Sign = (signBit) ? (R3Sign | 0x02) : (R3Sign & 0xFD);
            ChangeImageOnDiv("R3S", signImages[R3Sign]);
            ChangeImageOnDiv("R3D4", digitImages[hi5]);
            ChangeImageOnDiv("R3D5", digitImages[lo5]);
            break;
        case 2:
            R3Sign = (signBit) ? (R3Sign | 0x01) : (R3Sign & 0xFE);
            ChangeImageOnDiv("R3S", signImages[R3Sign]);
            ChangeImageOnDiv("R3D2", digitImages[hi5]);
            ChangeImageOnDiv("R3D3", digitImages[lo5]);
            break;
        case 3:
            ChangeImageOnDiv("R2D5", digitImages[hi5]);
            ChangeImageOnDiv("R3D1", digitImages[lo5]);
            break;
        case 4:
            R2Sign = (signBit) ? (R2Sign | 0x02) : (R2Sign & 0xFD);
            ChangeImageOnDiv("R2S", signImages[R2Sign]);
            ChangeImageOnDiv("R2D3", digitImages[hi5]);
            ChangeImageOnDiv("R2D4", digitImages[lo5]);
            break;
        case 5:
            R2Sign = (signBit) ? (R2Sign | 0x01) : (R2Sign & 0xFE);
            ChangeImageOnDiv("R2S", signImages[R2Sign]);
            ChangeImageOnDiv("R2D1", digitImages[hi5]);
            ChangeImageOnDiv("R2D2", digitImages[lo5]);
            break;
        case 6:
            R1Sign = (signBit) ? (R1Sign | 0x02) : (R1Sign & 0xFD);
            ChangeImageOnDiv("R1S", signImages[R1Sign]);
            ChangeImageOnDiv("R1D4", digitImages[hi5]);
            ChangeImageOnDiv("R1D5", digitImages[lo5]);
            break;
        case 7:
            R1Sign = (signBit) ? (R1Sign | 0x01) : (R1Sign & 0xFE);
            ChangeImageOnDiv("R1S", signImages[R1Sign]);
            ChangeImageOnDiv("R1D2", digitImages[hi5]);
            ChangeImageOnDiv("R1D3", digitImages[lo5]);
            break;
        case 8:
            ChangeImageOnDiv("R1D1", digitImages[lo5]);
            break;
        case 9:
            ChangeImageOnDiv("ND1", digitImages[hi5]);
            ChangeImageOnDiv("ND2", digitImages[lo5]);
            break;
        case 10:
            ChangeImageOnDiv("VD1", digitImages[hi5]);
            ChangeImageOnDiv("VD2", digitImages[lo5]);
            break;
        case 11:
            ChangeImageOnDiv("MD1", digitImages[hi5]);
            ChangeImageOnDiv("MD2", digitImages[lo5]);
            break;
        case 12:
            if (AGC == "LGC") {
                document.getElementById('vAlertPrioDisp').style.zIndex = 
				    (theData & Bit3) ? 10 : -1;
                document.getElementById('vAlertNoDap').style.zIndex = 
				    (theData & Bit5) ? 10 : -1;
                document.getElementById('vAlertVel').style.zIndex = 
				    (theData & Bit3) ? 10 : -1;
                document.getElementById('vAlertAlt').style.zIndex = 
				    (theData & Bit5) ? 10 : -1;
            }
            document.getElementById('vAlertNoAtt').style.zIndex = 
			    (theData & Bit4) ? 10 : -1;
            document.getElementById('vAlertGimbalLock').style.zIndex = 
			    (theData & Bit6) ? 10 : -1;
            document.getElementById('vAlertTracker').style.zIndex = 
			    (theData & Bit8) ? 10 : -1;
            document.getElementById('vAlertProg').style.zIndex = 
			    (theData & Bit9) ? 10 : -1;
            break;
        default:
            if (dskyDebug) console.log("dskyOutput was passed invalid data!!");
    }
    dskySweep_TimerID = setTimeout(dispatchCh8, dskySweepInterval);
    if (dskyDebug) console.log("dskySweep_TimerID="+dskySweep_TimerID);

}

function processCh9(theData) {
    if (dskyDebug) 
		console.log("processCh9("+octal5(theData)+")");
	
    document.getElementById('vAnnCompActy').style.zIndex = 
	    (theData & Bit2) ? 10 : -1;
    document.getElementById('vAlertUplinkActy').style.zIndex = 
	    (theData & Bit3) ? 10 : -1;
    document.getElementById('vAlertTemp').style.zIndex = 
	    (theData & Bit4) ? 10 : -1;

    FlashKeyRel = (theData & Bit5) ? true : false;
    FlashVN = (theData & Bit6) ? true : false;
    FlashError = (theData & Bit7) ? true : false;
}

function processCh11(theData) {
    if (dskyDebug) 
		console.log("processCh11("+octal5(theData)+")");
	
    if (theData & Bit10) {       // Bit10 = Test Alarm
        document.getElementById('vAlertStby').style.zIndex = 10;
        document.getElementById('vAlertRestart').style.zIndex = 10;
    } else {
        document.getElementById('vAlertStby').style.zIndex = (theData & Bit11) ? 10 : -1;
        document.getElementById('vAlertRestart').style.zIndex = (theData & Bit12) ? 10 : -1;
    }
}

function agcToDsky(theChannel, theData) {
    if (DskyInStandby) return;
    if (dskyDebugDeep) 
		console.log("agcToDsky("+theChannel+", "+octal5(theData)+");");

    if (theChannel == 8) {
        processCh8(theData);
    } else if (theChannel == 9) {
        processCh9(theData);
    } else if (theChannel == 11) {
        processCh11(theData);
    } else {
        console.log("Invalid channel specified");
    }
}

function dskyKeyInput(theColumn, theRow) {
    if (dskyDebug) console.log("dskyKeyInput("+theColumn+", "+theRow+");");

    if ((theColumn == 6) && (theRow == 2)) {  // the PRO key is handled differently
        KEYRUPT(26, Bit14);
    } else {
        if (!DskyInStandby) { KEYRUPT(13, keyCodes[theColumn][theRow]); }
    }
}

function dskyOn(theAGC) {
    if (dskyDebug) console.log("dskyOn("+theAGC+")");
    if (dskyFlash_TimerID) clearInterval(dskyFlash_TimerID);

    AGC = theAGC;
    document.getElementById('IfCMC').style.visibility = 
	    (theAGC == "CMC") ? "visible" : "hidden";
	
    document.getElementById('WhenOn').style.zIndex = 80;
    document.getElementById('WhenOn').style.visibility = "visible";

    elVD1 = document.getElementById("vVD1");
    elVD2 = document.getElementById("vVD2");
    elND1 = document.getElementById("vND1");
    elND2 = document.getElementById("vND2");
    elAlertKeyRel = document.getElementById("vAlertKeyRel");
    elAlertOprErr = document.getElementById("vAlertOprErr");

    R1Sign = 0;
    R2Sign = 0;
    R3Sign = 0;

    FlashVN = false;
    FlashKeyRel = false;
    FlashError = false;
    FlashCycle = 0;
	vvnnOnZIndex = 60;

    dskyFlash_TimerID = setInterval(function() { doFlashUpdate(); }, 
	                                dskyFlashInterval);
    dskySweep_TimerID = 0;
    ch8Queue = [];
    
    document.getElementById('vAlertStby').style.zIndex = -1;
    DskyInStandby = false;
    console.log("DSKY is on");
}

function dskyOff() {
    if (DskyInStandby) return;
    if (dskyDebug) console.log("dskyOff()");
    
    setTimeout(function() {

        clearInterval(dskyFlash_TimerID);
        dskyFlash_TimerID = 0;

        if (dskySweep_TimerID != 0) {
            clearInterval(dskySweep_TimerID);
            dskySweep_TimerID = 0;
        }

        document.getElementById('WhenOn').style.visibility = "hidden";

        DskyInStandby = true;
        console.log("DSKY is now in Standby mode");
    }, 250);
}