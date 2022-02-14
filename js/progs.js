//
// progs.js - Programs, such as they are, live here
//
//     This is where we stray from the path... Normal verbs execute pretty 
//     much as on the real AGC. The heavy lifting goes on in the programs. 
//     And (hopefully this is obvious) all that can be done here is sort of 
//     "pretend" things. Oh, let's launch a Saturn V! Oh, let's fly to the
//     Moon! Without all the stuff hooked up to a real AGC (not to mention
//     rocket engines), we aren't going to accomplish much without a little
//     imagination. So here goes... 
//

const progsDebug = false;
const progsCalcDebug = false;

if (progsDebug) e[iTRACE] |= itPROGS;
if (progsCalcDebug) e[iTRACE] |= itPROGSc;

var prog_TimerID = 0;

/////////////////////////////
//// cancelProg: cancel a not-yet executed program requested via scheduleProg

function cancelProg() {
    if (e[iTRACE] & itPROGS) 
		console.log("cancelProg()");
	
    if (prog_TimerID !== 0) clearTimeout(prog_TimerID);
	prog_TimerID = 0;
}

/////////////////////////////
//// scheduleProg: request a program to execute after an interval

function scheduleProg(theFunction, theTime) {
    if (e[iTRACE] & itPROGS) 
		console.log(scheduleProg.caller.name+": scheduleProg()");
	
    cancelProg();
    prog_TimerID = setTimeout(theFunction, theTime);
}

/////////////////////////////
//// Program 00: Integration

function P00() {

    eStore(THETAD, eFetch(CDUX)); 
    eStore(THETAD+1, eFetch(CDUY)); 
    eStore(THETAD+2, eFetch(CDUZ)); 
    
    scheduleProg(P00, 100);
}

///////////////////////////////////////////
//// Program 01: Pre-launch initialization
////
//// This isn't very exciting to watch, even on the real thing.
//// Which makes it pretty easy to pretend we're initializing.
//// I do take the liberty of compressing time a bit, otherwise
//// it would be pretty tedious. When PROG 01 is complete it
//// automatically transitions to PROG 02 (Gyrocompassing).

function Prelaunch_Init() {
    if (e[iTRACE] & itPROGS) 
		console.log(Prelaunch_Init.caller.name+": PrelaunchInit()");

    BLANKSUB(R1R2R3);
    var delay = (e[iTRACE] & (itPROGS | itPROGSc)) ? 1000 : 4000;
    scheduleProg(Prelaunch_Init_p2, delay);
}

function Prelaunch_Init_p2() {  
    setAlert(aNO_ATT);
    var delay = (e[iTRACE] & (itPROGS | itPROGSc)) ? 1000 : 4000;
    scheduleProg(Prelaunch_Init_p3, delay);
}
    
function Prelaunch_Init_p3() {  
    resetAlert(aNO_ATT);
    var delay = (e[iTRACE] & (itPROGS | itPROGSc)) ? 1000 : 4000;
    scheduleProg(Prelaunch_Init_p4, delay);
}

function Prelaunch_Init_p4() { 
    if (e[iTRACE] & itPROGS) 
		console.log("PrelaunchInit_p2()");

    DSPMM(2);
    spStore(MMNUMBER, 2, +1);
    Gyrocompassing();
}

////////////////////////////////
//// Program 02: Gyrocompassing
////
//// Now that initialization is complete, the AGC does some pretty cool
//// stuff: It manages to orient itself just sitting there on the pad.
//// The accelerometers use the gravity gradient to determine local
//// vertical; and the precession of the gyros as the earth rotates give
//// the AGC a means of determining the other axes.
////
//// However, since we don't have any IMU hardware, we're just waiting for 
//// the F-1s to ignite, and the hold-down arms to release and generate 
//// the "liftoff" signal.
////
//// While we wait the computer is continuously updating the State Vector.
//// Which isn't very exciting to watch. It's sort of like watching paint
//// dry ... when you're in a different room from the drying paint. Kind
//// of Zen, when you think about it.
////
//// Anyway, we have no F-1s, nor hold-down arms, so the "AGC" is never
//// going to get a signal that liftoff has occurred. But wait, there's a
//// cheat: executing Verb 75 is a backup liftoff indication! (Honest, the
//// CDR really did sit there with V75 keyed in, just waiting to hit ENTR
//// if the computer didn't get the liftoff signal.) Once liftoff is 
//// signalled, we can sit back and watch the Earth Orbit Insertion Monitor
//// (Program 11) do its thing.

function Gyrocompassing() {
    if (e[iTRACE] & itPROGS) 
		console.log(Gyrocompassing.caller.name+": Gyrocompassing()");

    eStore(AZIMANGL, 014634); // Set launch azimuth ?? Why did I do this? AZIMANGL is DP
    Gyrocompassing_p2();
}

function Gyrocompassing_p2() {
    if (e[iTRACE] & itPROGS) 
		console.log("Gyrocompassing_p2()");

    // Liftoff discrete is on input channel 30 bit 5

    if (Channel[030] & Bit5) {
        DSPMM(11);
        eStore(MMNUMBER, 11);
		setFlag(NODOP01);         // Once P11 is started, disallow subsequent P01
        EOI_Monitor();
    } else {
        scheduleProg(Gyrocompassing_p2, 100);
    }
}

//////////////////////////////
//// Program 06: AGC Shutdown
////
//// Actually, this does provide some functionality beyond illustrating how the AGC
//// is started and stopped: you can flip the flag that indicates whether "this"
//// AGC is the CMC or the LGC, then turn the AGC off and back on, and it assumes the
//// role indicated by the flag.

function Shutdown() {
    if (e[iTRACE] & itPROGS) 
		console.log(Shutdown.caller.name+": Shutdown()");

    NVSUB(50, 25, 0);
    showOctal(1, 062);
    BLANKSUB(R2R3);
    setAlert(aVN_FLASH);
}

///////////////////////////////////////////////
//// Program 11: Earth-Orbit-Insertion Monitor
////
//// OK, some action finally! Liftoff has occurred and we get
//// to watch the AGC monitor the following:
////
//// Register 1: Inertial velocity (in feet per second)
//// Register 2: Vertical velocity (fps)
//// Register 3: Altitude above the pad (in 1/10ths of nautical miles)
////
//// This display is updated every 2 seconds.
////
//// By the by, you may be wondering why inertial velocity doesn't start out at 0.
//// Consider that the Earth is (1) rotating, and (2) orbiting the sun. That gives
//// everything on the surface of the Earth considerable "inertial velocity".

function EOI_Monitor() {
    if (e[iTRACE] & itPROGS) 
		console.log(EOI_Monitor.caller.name+": EOI_Monitor()");

    var d = new Date();
    var ms = 0;
    ms = d.getMilliseconds() / 10;
    ms += 100 * d.getSeconds();
    ms += 6000 * d.getMinutes();
    ms += 360000 * d.getHours();
    
	T2Epoch = d;
    dpStore(TEPHEM, ms, 1);
    dpStore(TIME2, 0, 1);
	
    EOI_Monitor_intg();
}


function EOI_Monitor_intg() {
    if (e[iTRACE] & itPROGS) console.log("EOI_Monitor_intg()");

    setAlert(aCOMP_ACTY);
    compActy = true;
    setTimeout(function () { resetCompActy(); }, 100);
    var vmagi, hdot, alti, Ts;

    Ts = dp2CofE(TIME2) / 100;
    
    if ((Ts > 0) && (Ts < 2))
        setFlag(INTFLAG);

	if (Ts < tb3[e[MISSION]-baseFlight]) {  // S-IC boost
	
        // Inertial Velocity: 

        vmagi  = vmagi_tb1[e[MISSION]-baseFlight][0];
        vmagi += vmagi_tb1[e[MISSION]-baseFlight][1] * Ts;
        vmagi += vmagi_tb1[e[MISSION]-baseFlight][2] * Math.pow(Ts, 2);
        vmagi += vmagi_tb1[e[MISSION]-baseFlight][3] * Math.pow(Ts, 3);
        vmagi += vmagi_tb1[e[MISSION]-baseFlight][4] * Math.pow(Ts, 4);

        // Rate of change of altitude:

        hdot  = hdot_tb1[e[MISSION]-baseFlight][0];
        hdot += hdot_tb1[e[MISSION]-baseFlight][1] * Ts;
        hdot += hdot_tb1[e[MISSION]-baseFlight][2] * Math.pow(Ts, 2);
        hdot += hdot_tb1[e[MISSION]-baseFlight][3] * Math.pow(Ts, 3);
        hdot += hdot_tb1[e[MISSION]-baseFlight][4] * Math.pow(Ts, 4);
        hdot += hdot_tb1[e[MISSION]-baseFlight][5] * Math.pow(Ts, 5);
		if (hdot < 0) hdot = 0
    
        // Altitude:

        alti  = alti_tb1[e[MISSION]-baseFlight][0];
        alti += alti_tb1[e[MISSION]-baseFlight][1] * Ts;
        alti += alti_tb1[e[MISSION]-baseFlight][2] * Math.pow(Ts, 2);
        alti += alti_tb1[e[MISSION]-baseFlight][3] * Math.pow(Ts, 3);
        alti += alti_tb1[e[MISSION]-baseFlight][4] * Math.pow(Ts, 4);
        if (alti < 0) alti = 0;
    
        if (e[iTRACE] & itPROGSc) 
			console.log("CALC  Ts="+Ts+
		                " vmagi="+vmagi+
						"  hdot="+hdot+
						"  alti="+alti);
						
		scheduleProg(EOI_Monitor_intg, 2000);
		
	} else if (Ts < tb4[e[MISSION]-baseFlight]) {  // S-II boost
	
        // Inertial Velocity: 

        vmagi  = vmagi_tb3[e[MISSION]-baseFlight][0];
        vmagi += vmagi_tb3[e[MISSION]-baseFlight][1] * Ts;
        vmagi += vmagi_tb3[e[MISSION]-baseFlight][2] * Math.pow(Ts, 2);
        vmagi += vmagi_tb3[e[MISSION]-baseFlight][3] * Math.pow(Ts, 3);
        vmagi += vmagi_tb3[e[MISSION]-baseFlight][4] * Math.pow(Ts, 4);

        // Rate of change of altitude:

        hdot  = hdot_tb3[e[MISSION]-baseFlight][0];
        hdot += hdot_tb3[e[MISSION]-baseFlight][1] * Ts;
        hdot += hdot_tb3[e[MISSION]-baseFlight][2] * Math.pow(Ts, 2);
        hdot += hdot_tb3[e[MISSION]-baseFlight][3] * Math.pow(Ts, 3);
        hdot += hdot_tb3[e[MISSION]-baseFlight][4] * Math.pow(Ts, 4);
        hdot += hdot_tb3[e[MISSION]-baseFlight][5] * Math.pow(Ts, 5);
    
        // Altitude:

        alti  = alti_tb3[e[MISSION]-baseFlight][0];
        alti += alti_tb3[e[MISSION]-baseFlight][1] * Ts;
        alti += alti_tb3[e[MISSION]-baseFlight][2] * Math.pow(Ts, 2);
        alti += alti_tb3[e[MISSION]-baseFlight][3] * Math.pow(Ts, 3);
        alti += alti_tb3[e[MISSION]-baseFlight][4] * Math.pow(Ts, 4);
    
        if (e[iTRACE] & itPROGSc) 
			console.log("CALC  Ts="+Ts+
		                " vmagi="+vmagi+
						"  hdot="+hdot+
						"  alti="+alti);
						
		scheduleProg(EOI_Monitor_intg, 2000);
		
	} else if (Ts < tb5[e[MISSION]-baseFlight]) {  // S-IVB boost
	
        // Inertial Velocity: 

        vmagi  = vmagi_tb4[e[MISSION]-baseFlight][0];
        vmagi += vmagi_tb4[e[MISSION]-baseFlight][1] * Ts;
        vmagi += vmagi_tb4[e[MISSION]-baseFlight][2] * Math.pow(Ts, 2);
        vmagi += vmagi_tb4[e[MISSION]-baseFlight][3] * Math.pow(Ts, 3);
        vmagi += vmagi_tb4[e[MISSION]-baseFlight][4] * Math.pow(Ts, 4);

        // Rate of change of altitude:

        hdot  = hdot_tb4[e[MISSION]-baseFlight][0];
        hdot += hdot_tb4[e[MISSION]-baseFlight][1] * Ts;
        hdot += hdot_tb4[e[MISSION]-baseFlight][2] * Math.pow(Ts, 2);
        hdot += hdot_tb4[e[MISSION]-baseFlight][3] * Math.pow(Ts, 3);
        hdot += hdot_tb4[e[MISSION]-baseFlight][4] * Math.pow(Ts, 4);
        hdot += hdot_tb4[e[MISSION]-baseFlight][5] * Math.pow(Ts, 5);
    
        // Altitude:

        alti  = alti_tb4[e[MISSION]-baseFlight][0];
        alti += alti_tb4[e[MISSION]-baseFlight][1] * Ts;
        alti += alti_tb4[e[MISSION]-baseFlight][2] * Math.pow(Ts, 2);
        alti += alti_tb4[e[MISSION]-baseFlight][3] * Math.pow(Ts, 3);
        alti += alti_tb4[e[MISSION]-baseFlight][4] * Math.pow(Ts, 4);
    
        if (e[iTRACE] & itPROGSc) 
			console.log("CALC  Ts="+Ts+
		                " vmagi="+vmagi+
						"  hdot="+hdot+
						"  alti="+alti);
						
		scheduleProg(EOI_Monitor_intg, 2000);
		
    } else {                        // EOI complete
        clearFlag(INTFLAG);
        
        dpStore(HAPOX, 
		        ((eoi_Apogee[e[MISSION] - baseFlight] / 1e4) * ncGetSfIn(44, 1)), 
				+1);
        dpStore(HPERX, 
		        ((eoi_Perigee[e[MISSION] - baseFlight] / 1e4) * ncGetSfIn(44, 2)),
				+1);
        dpStore(TFF, 
		        (((87 * 60) + 50) * 100), 
				+1);

        e[DSPLOCK] = 1;
        NVSUB(16, 44, orbitalParms);

        DSPMM(-1);
        spStore(MMNUMBER, 0, -1);
        return;
    }

    // ===== Store and display calculated values ===== //

    vmagi = (vmagi / 1e5) * ncGetSfIn(62, 1) * pow_2_3;
    dpStore(VMAGI, vmagi, vmagi);

    hdot  = (hdot / 1e5)  * ncGetSfIn(62, 2) * pow_2_3;
    dpStore(HDOT, Math.abs(hdot), Math.sign(hdot));   // H-DOT can be negative

    alti  = (alti / 1e4)  * ncGetSfIn(62, 3);
    dpStore(ALTI, alti, alti);

    if (e[MONSAVE] == 0)
        NVSUB(6, 62, doNothing);
	else
		setAlert(aKEY_REL);
}

///////////////////////////////////////////////
//// Program 15: TLI Initiation/Cutoff
////
//// The TLI maneuver is controlled by the LVDC, but we
//// do get an opportunity to update its parameters. Once
//// ignition occurs, we monitor the burn:
////
//// Register 1: Time to cutoff
//// Register 2: Remaining velocity to be gained
//// Register 3: Current velocity
////
//// This display is updated once per second (I think).

function TLI_Monitor() { 
    if (e[iTRACE] & itPROGS) 
		console.log(TLI_Monitor.caller.name+": TLI_Monitor()");
    
    /*
    When TB-6 begins, all subsequent events to restart the engine such as tank 
    repressurisation, engine chilldown, ullage, etc., follow on, leading to the 
    engine start command 9 minutes, 30 seconds later, and ignition 8 seconds 
    after that.

    Apollo 16 TLI PAD:
    
    TB6: 002:23:57
    Delta-Vc: 10373.0  -- velocity-gain
    VI: 35589          -- target vmagi (i.e. VCO)
	*/
    
    // Initialize all the parameters for TLI:
    
    // Current inertial velocity
    
    var vmagi = (25596.86325 / 1e5) * (ncGetSfIn(62, 1)) * pow_2_3;
    dpStore(VMAGI, vmagi, vmagi);
    
    // Time of ignition
    
    var TB6 = ((2 * 60 * 60) + (23 * 60) + 57) * 100;
    var tig = TB6 + (((9 * 60) + 38) * 100);
    dpStore(TIG, tig, +1);
    
    // Desired inertial velocity
    
    var vco = (35589.0 / 1e5) * (ncGetSfIn(14, 1)) * pow_2_3; 
    dpStore(VCO, vco, vco);
    
    pPWOI = TLI_Monitor_p2;     // PRO takes us to the next step
    
    // Display TIG

    if (NVSUB(6, 33, TLI_Monitor)) {
        setAlert(aVN_FLASH);
    }
}

function TLI_Monitor_p2() {
    if (e[iTRACE] & itPROGS) 
		console.log(TLI_Monitor_p2.caller.name+": TLI_Monitor_p2()");
    
    // Display target inertial velocity
    
    BLANKALL();
    if (NVSUB(6, 14, TLI_Monitor_p2)) {
        pPWOI = TLI_Monitor_p3;     // PRO takes us to the next step
        setAlert(aVN_FLASH);
    }
}

function TLI_Monitor_p3() {
    if (e[iTRACE] & itPROGS) 
		console.log(TLI_Monitor_p3.caller.name+": TLI_Monitor_p3()");

    var vco = (dp2CofE(VCO) / pow_2_28) * (ncGetSfOut(14, 1) / pow_2_28) * 1e5;
    var vmagi = (dp2CofE(VMAGI) / pow_2_28) * (ncGetSfOut(14, 1) / pow_2_28) * 1e5;
    var vgtli = vco - vmagi;

    var vgtli = (vgtli / 1e5) * (ncGetSfIn(95, 2)) * pow_2_3;
    dpStore(VGTLI, vgtli, vgtli);

    resetAlert(aVN_FLASH);
    pPWOI = doNothing;
    e[TCO] = 0;
    TLI_Monitor_intg();                       // begin TLI integration
}

function TLI_Monitor_intg() {
    if (e[iTRACE] & itPROGS) console.log("TLI_Monitor_intg()");

    setAlert(aCOMP_ACTY);
    compActy = true;
    setTimeout(function () {
    
        var Tc = dp2CofE(TIME2);              // Current time (in ms)
        var Ti = dp2CofE(TIG);                // Time of ignition (in ms)
        var DTi = (Tc - Ti);                  // Time from ignition (in ms)
        var Tg = (DTi < 0) ? 0 : DTi / 100;   // Time of integration (in sec)

        var ttogo = Math.round(DTi / 100);    // Default value prior to start of integ
        
        if (e[iTRACE] & itPROGS) 
			console.log("Tc="+Tc+
		                "  Ti="+Ti+
						"  DTi="+DTi+
						"  Tg="+Tg+
						"  ttogo="+ttogo);

        if (Tg > 0) {
            if (flagIsClear(INTFLAG)) {
                dpStore(DVTOTAL, 0, 1);
                setFlag(INTFLAG);
                var myTg = 0;
                var myVco = (dp2CofE(VCO) / pow_2_28) * 
				            (ncGetSfOut(14, 1) / pow_2_28) * 1e5;
                var myVmagi = 0;
                do {
                    myTg++;
                    myVmagi  =  25596.86325;
                    myVmagi +=  20.03723707 * myTg;
                    myVmagi +=  3.568964761E-2 * Math.pow(myTg, 2);
                    myVmagi += -7.677199708E-5 * Math.pow(myTg, 3);
                    myVmagi +=  1.570901824E-7 * Math.pow(myTg, 4);
                } while (myVmagi < myVco);
                dpStore(TCO, dpMagnOfE(TIG) + (myTg * 100), 1);
                if (e[iTRACE] & itPROGSc) console.log("Time to burn="+myTg);
            }

            // Inertial Velocity
            
            var vmagi  = 25596.86325;
            vmagi +=  20.03723707 * Tg;
            vmagi +=  3.568964761E-2 * Math.pow(Tg, 2);
            vmagi += -7.677199708E-5 * Math.pow(Tg, 3);
            vmagi +=  1.570901824E-7 * Math.pow(Tg, 4);
            
            // Delta-V in the last interval
            
            var vgdisp = vmagi - ((dp2CofE(VMAGI) / pow_2_28) * 
			                     (ncGetSfOut(62, 1) / pow_2_28) * 1e5);
            
            // Total delta V so far
            
            var dvtotal = vgdisp + ((dp2CofE(DVTOTAL) / pow_2_28) * 
			                        (ncGetSfOut(40, 3) / pow_2_28) * 1e5);
			

            // Remaining delta V to be gained 
            
            var vco = (dp2CofE(VCO) / pow_2_28) * 
			          (ncGetSfOut(14, 1) / pow_2_28) * 1e5;
            var vgtli = vco - vmagi;

            // Altitude
            
            var alti  = 96.98167868;
            alti +=  2.448329127E-3 * Tg;
            alti += -8.490550788E-5 * Math.pow(Tg, 2);
            alti +=  1.455756852E-6 * Math.pow(Tg, 3);
            alti +=  1.843902503E-9 * Math.pow(Tg, 4); 

            // Show calculation results
            
            if (e[iTRACE] & itPROGSc) {
                console.log("TLI integration at Tg " + Tg);
                console.log("     vmagi = " + vmagi);
                console.log("    vgdisp = " + vgdisp);
                console.log("   dvtotal = " + dvtotal);
                console.log("     vgtli = " + vgtli);
                console.log("      alti = " + alti);
            }

            // Time remaining until TCO

            if (Tg < 10) {
                ttogo = Tg;                          // Until 10 secs, = time into burn
            } else { 
                ttogo = (Tc - dpMagnOfE(TCO)) / 100; // After 10 secs, = time to go
            }

            // If VCO has been reached, stop the monitor
          
            if (vmagi >= vco) {
                ttogo = 0;               // Set the residuals to zero
                vgtli = 0;               //   to make it look like a perfect 
                vmagi = vco;             //   TLI burn.
                clearFlag(INTFLAG);
            }
                
            // ===== Store calculated values ===== //

            vgtli = (vgtli / 1e5) * ncGetSfIn(95, 2) * pow_2_3;
            dpStore(VGTLI, vgtli, vgtli);
        
            vmagi = (vmagi / 1e5) * ncGetSfIn(62, 1) * pow_2_3;
            dpStore(VMAGI, vmagi, vmagi);
        
            alti = (alti / 1e4) * ncGetSfIn(62, 3);
            dpStore(ALTI, alti, alti);
            
            vgdisp = (vgdisp / 1e5) * ncGetSfIn(40, 2);
            dpStore(VGDISP, vgdisp, vgdisp);
            
            dvtotal = (dvtotal / 1e5) * ncGetSfIn(40, 3);
            dpStore(DVTOTAL, dvtotal, dvtotal);
        }

        dpStore(TTOGO, ttogo * 100, ttogo);
        if (e[iTRACE] & itPROGS) console.log("ttogo="+ttogo);

        // Now do display stuff

        DTi /= 100;                           // Convert Tr from ms to seconds

        if ((DTi >= -578) && (DTi < -568))    //  at (TB6) turn on UPLINK ACTY
            setAlert(aUPLINK_ACTY);
            
        if ((DTi >= -568) && (DTi < -566))    //  at (TB6 + 0:10) turn off UPLINK ACTY
            resetAlert(aUPLINK_ACTY);

        if ((DTi >= -106) && (DTi < -100)) {  //  at (TIG - 1:45) blank DSKY display
            e[NVTEMP] = 3;
            BLANKALL();
        } else {                              //  at (TIG - 1:40) restore DSKY display
        
            /*
            06  95

            -MM SS   e[TTOGO]  Until TIG+10, TTOGO; after TCO, 00 00
            +XXXXX   e[VGTLI]  Remaining delta-V - calculated by (VC/O - VMAGI)
            +XXXXX   e[VNOW]   V - polynomial
            */

            NVSUB(6, 95, 0);
        }
            
        if (dpMagnOfE(VGTLI) > 0) scheduleProg(TLI_Monitor_intg, 1000);
        setTimeout(function () { resetCompActy(); }, 50);
     }, 10);   
}


///////////////////////////////////////////////
//// Program 27: AGC Update
////
//// Originally implemented for ground uplinks, but also eventually used 
//// for entering Erasable Memory Programs (EMPs)
////
//// V70 - liftoff time increment
////
////                    V70E
////    21 01 F  00304  XXXXXE 
////    21 01 F  00305  XXXXXE
////    21 02 F  00330  V33E -or- PRO  needed to actually carry out the update
////
//// V71 - contiguous block update
////
////                    V71E
////    21 01 F  00304  NNE            NN=2+count of locs to be updated
////    21 01 F  00305  AAAAE          AAAA=address of beginning of block
////    21 01 F  00306  XXXXXE         data entry 1
////             ..
////    21 01 F  003MM  XXXXXE         data entry NN-2; MM = NN+3
////    21 02 F  00330  V33E -or- PRO  needed to actually carry out the update
////
//// V72 - scatter update
////
////                    V72E
////    21 01 F  00304  NNE            NN=1+(2*count of locs to be updated) 
////    21 01 F  00305  AAAAE          AAAA = where to store following word
////    21 01 F  00306  XXXXXE         XXXXX = data to be stored at AAAA
////             ..
////    21 01 F  003YY  AAAAE
////    21 01 F  003ZZ  XXXXXE
////    21 02 F  00330  V33E -or- PRO  needed to actually carry out the update
////
//// V73 - octal clock increment
////
////             V73E
////    21 01 F  00304  XXXXXE
////    21 01 F  00304  XXXXXE
////    21 02 F  00330  V33E -or- PRO  needed to actually carry out the update

// Note: KEY REL doesn't flash when the 21 01 prompt is displayed; it does start
// flashing as soon as any data entry is begun. This behavior repeats for each entry.

function AGC_Update() {
    if (e[iTRACE] & itPROGS) 
		console.log(AGC_Update.caller.name+": AGC_Update()");

	// Update not allowed if DSKY currently in use
	
	e[UPVERBSV] = e[VERBREG] - 70;
	if (e[DSPLOCK]) {
		setAlert(aOPR_ERR);
		return;
    }

	// For CM update allowed only during fresh start, P00 or P02
	// For LM update allowed only during P00
	
	var update_allowed = false;
	if (e[COMPUTER] == 0)   // LGC
		if (e[MODREG] == 0) update_allowed = true;
	else                    // CMC
		if ((e[MODREG] == 077777) || 
		    (e[MODREG] == 0) || 
			(e[MODREG] == 2)) update_allowed = true;
	if (update_allowed == false) {
		setAlert(aOPR_ERR);
		return;
    }
		
	e[DSPLOCK] = 1;
	e[UPOLDMOD] = e[MODREG];   // save interrupted Program
	e[UPVERB] = e[UPVERBSV];
	e[UPCOUNT] = 0;
	e[DNLSTCOD] = 1;
	
	e[MODREG] = 27;
    DSPMM(27);
    spStore(MMNUMBER, 27, +1);
		
	if ((e[UPVERB] == 0) || (e[UPVERB] == 3)) {
		e[COMPNUMB] = 2;
	} else {
		e[COMPNUMB] = 0;
	}
	P27Prompt(1, UPBUFF+e[UPCOUNT]);
}
	
function P27ENTR() {  // ENTER key processor
    if (e[iTRACE] & itPROGS) 
		console.log(P27ENTR.caller.name+": P27ENTR()");

	var okToStore = true;
	var lastEntry = false;
	
	if (e[DECBRNCH] !== 0) okToStore = false;         // Decimal input not allowed
	if (e[DSPCOUNT] == dtR1D1) okToStore = false;     // At least one digit required

	switch (e[UPVERB]) {
		case 0:                                       // Liftoff time update
		case 3:                                       // AGC clock update
			if (e[UPCOUNT] != 0) lastEntry = true;    // Only two words needed
			break;
		case 2:                                       // Scatter update
			if ((e[UPCOUNT] == 0) &&                  // Number of components
			    (!(e[XREG] & 1))) okToStore = false;  //   must be odd
		case 1:                                       // Contiguous update (and scatter)
			if (e[UPCOUNT] == 0) {                    // If this is the comp count...
				if (e[XREG] < 3) okToStore = false;   //   it cannot be <3,
				if (e[XREG] > (UPTEMP-UPBUFF)) okToStore = false; // or >the buffer size
				if (okToStore) e[COMPNUMB] = e[XREG]; // If all good, save the count
			}
	}
	
    if (okToStore) {
		e[UPBUFF+e[UPCOUNT]] = e[XREG];               // Save netry into the buffer
		e[UPCOUNT]++;
		if (e[UPCOUNT] >= e[COMPNUMB]) lastEntry = true;
	}
				
	resetAlert(aKEY_REL);
	if (!lastEntry)
		P27Prompt(1, UPBUFF+e[UPCOUNT]);
	else
		P27Prompt(2, UPTEMP);
}

function P27V32() {  // Recycle -- does absolutely nothing AFAIK
    if (e[iTRACE] & itPROGS) 
		console.log(P27V32.caller.name+": P27V32()");
}

function P27V33() {  // Proceed without input (pretty sure this is same as PRO key)
    if (e[iTRACE] & itPROGS) 
		console.log(P27V33.caller.name+": P27V33()");

    if (e[UPCOUNT] < e[COMPNUMB]) {
        P27Prompt(1, UPBUFF+e[UPCOUNT]);
	} else {
		switch (e[UPVERB]) {
			case 0:  // liftoff time increment
			    e[TEPHEM] += e[UPBUFF];
				e[TEPHEM] += e[UPBUFF+1];
				break;
			case 1:  // block update
				e[COMPNUMB] -= 2;             // COMPNUMB = count of words
			    for (e[UPCOUNT]=0; e[UPCOUNT] < e[COMPNUMB]; e[UPCOUNT]++)
					e[e[UPBUFF + 1] + e[UPCOUNT]] = e[UPBUFF + 2 + e[UPCOUNT]];
				break;
			case 2:  // scatter update
			    e[COMPNUMB] -= 1;             // COMPNUMB = count of pairs*2
				for (e[UPCOUNT]=0; e[UPCOUNT] < e[COMPNUMB]; e[UPCOUNT]+=2)
					e[e[UPBUFF + 1 + e[UPCOUNT]]] = e[UPBUFF + 2 + e[UPCOUNT]];
				break;
			case 3:  // timer update
			    e[TIME2] += e[UPBUFF];
				e[TIME1] += e[UPBUFF+1];
				T2Update();
		}
		P27V34();
	}
}

function P27V34() {  // Terminate
    if (e[iTRACE] & itPROGS) 
		console.log(P27V34.caller.name+": P27V34()");

	pRECYCLE = doNothing;
	pPWOI = doNothing;
	pTERM = doNothing;
	pENTR = doNothing;
	e[DSPLOCK] = 0;
	e[DNLSTCOD] = 0;
	e[CADRSTOR] = 0;
	resetAlert(aUPLINK_ACTY);
	BLANKALL();
	e[MODREG] = e[UPOLDMOD]; 
	DSPMM(e[MODREG]);
}

function P27Prompt(theNoun, theCadr) {	
    if (e[iTRACE] & itPROGS) 
		console.log(P27Prompt.caller.name+": P27Prompt()");

    pENTR = P27ENTR;
	pRECYCLE = P27V32;
	pPWOI = P27V33;
	pTERM = P27V34;
	
	DSPVV(21);
	e[VERBREG] = 21;
    DSPNN(theNoun);
	e[NOUNREG] = theNoun;
	e[NOUNCADR] = theCadr;
	e[CADRSTOR] = 1;
	//NVSUB(21, theNoun, 0);
	setAlert(aVN_FLASH);
	resetAlert(aKEY_REL);
	clearRegister(1);
	showOctal(3, theCadr);
	e[DECBRNCH] = 0; 
	e[DSPCOUNT] = dtR1D1; 
    e[REQRET] = RLoadComplete;
}
