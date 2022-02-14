//
// progTable.js - Program (aka "Major Mode") table
//

// Besides documenting what all the Programs are, this table is an indication
// of how little real work this app really does, yet despite that, how much 
// functionality is accomplished by implementing the Standard Verbs.

var progs = new Array();

function setProgs() {                     // called only by agcInit()
    if (flagIsSet(COMPUTER)) {            // CMC

        for (var ix=0; ix<100; ix++)
            progs[ix] = 0;
            
        progs[0]  = P00;                  // CMC Idling
        progs[1]  = Prelaunch_Init;       // Prelaunch initialization
    //  progs[2]  = Gyrocompassing;       // **not selectable by V37
	//  progs[3]  = 0;                    // Optical Verification of Gyrocompassing
        progs[6]  = Shutdown;             // GNCS power down
	//  progs[7]  = 0;                    // IMU ground test
		
    //  progs[11] = EOI_Monitor;          // **not selectable by V37
        progs[15] = TLI_Monitor;          // TLI Initiate/Cutoff
		
	//	progs[20] = 0;                    // Universal Tracking
	//	progs[21] = 0;                    // Ground Track Determination
	//	progs[22] = 0;                    // Orbital Navigation
	//	progs[23] = 0;                    // Cislunar Midcourse Navigation
	//	progs[24] = 0;                    // Rate Aided Optics Tracking
	//	progs[27] = AGC_Update;           // **selectable only through V71-73
	//	progs[29] = 0;                    // Time-of-Longitude
	
	//  progs[30] = 0;                    // External delta-V
	//	progs[31] = 0;                    // CSM Height Adjustment Maneuver (HAM)
	//	progs[32] = 0;                    // CSM Coelliptic Sequence initiation (CSI)
	//	progs[33] = 0;                    // CSM Constant Delta Height (CDH)
	//	progs[34] = 0;                    // CSM Transfer Phase Initiation (TPI) Targeting
	//	progs[35] = 0;                    // CSM Transfer Phase Midcourse (TPM) Targeting
	//	progs[36] = 0;                    // CSM Plane Change Targeting
	//	progs[37] = 0;                    // Return to Earth (RTE)
		
	//	progs[40] = 0;                    // SPS
	//	progs[41] = 0;                    // RCS
	//	progs[47] = 0;                    // Thrust Monitor
		
	//	progs[51] = 0;                    // IMU Orientation Determination
	//	progs[52] = 0;                    // IMU Realign
	//	progs[53] = 0;                    // Backup IMU Orientation Determination
	//	progs[54] = 0;                    // Backup IMU Realign
		
	//	progs[61] = 0;                    // Entry-Preparation
	//	progs[62] = 0;                    // Entry-CM/SM Separation and Pre-entry Maneuver
	//	progs[63] = 0;                    // Entry-Initialization
	//	progs[64] = 0;                    // Entry-Post 0.05G
	//	progs[65] = 0;                    // Entry Up-control
	//	progs[66] = 0;                    // Entry-Ballistic
	//	progs[67] = 0;                    // Entry-Final Phase
		
	//	progs[72] = 0;                    // LM Coelliptic Sequence Initiation (CSI)
	//	progs[73] = 0;                    // LM Constant Delta-Height (CDH)
	//	progs[74] = 0;                    // LM Transfer Phase Initiation (TPI) Targeting
	//	progs[75] = 0;                    // LM Transfer Phase (Midcourse) Targeting
	//	progs[76] = 0;                    // LM Target Delta-V
	//	progs[77] = 0;                    // CSM Target Delta-V
	//	progs[79] = 0;                    // Rendezvous Final Phase
        
    } else {                              // LGC
    
        for (var ix=0; ix<100; ix++)
            progs[ix] = 0;
            
        progs[0]  = P00;                  // LGC Idling
        progs[6]  = Shutdown;             // GNCS power down
		
	//	progs[12] = 0;                    // Powered ascent guidance
		
	//	progs[20] = 0;                    // Rendezvous navigation
	//	progs[21] = 0;                    // Ground track determination
	//	progs[22] = 0;                    // Lunar surface navigation
	//	progs[25] = 0;                    // Preferred tracking attitude
	//	progs[27] = AGC_Update;           // selectable only through V71-73
	
	//  progs[30] = 0;                    // External Delta-V
	//	progs[32] = 0;                    // Coelliptic Sequence initiation (CSI)
	//	progs[33] = 0;                    // Constant Delta Height (CDH)
	//	progs[34] = 0;                    // Transfer Phase Initiation (TPI)
	//	progs[35] = 0;                    // Transfer Phase Midcourse (TPM)
		
	//	progs[40] = 0;                    // DPS
	//	progs[41] = 0;                    // RCS
	//	progs[42] = 0;                    // APS
	//	progs[47] = 0;                    // Thrust Monitor
		
	//	progs[51] = 0;                    // IMU Orientation Determination
	//	progs[52] = 0;                    // IMU Realign
	//	progs[57] = 0;                    // Lunar Surface Align
		
	//	progs[63] = 0;                    // Braking Phase
	//	progs[64] = 0;                    // Approach Phase
	//	progs[65] = 0;                    // Landing Phase (Auto)
	//	progs[66] = 0;                    // Landing Phase (ROD)
	//	progs[67] = 0;                    // Landing Phase (Manual)
	//	progs[68] = 0;                    // Landing Confirmation
		
	//	progs[70] = 0;                    // DPS Abort
	//	progs[71] = 0;                    // APS Abort
	//	progs[72] = 0;                    // CSM Coelliptic Sequence Initiation (CSI) Targeting
	//	progs[73] = 0;                    // CSM Constant Delta-Height (CDH) Targeting
	//	progs[74] = 0;                    // CSM Transfer Phase Initiation (TPI) Targeting
	//	progs[75] = 0;                    // CSM Transfer Phase Midcourse (TPM) Targeting
	//	progs[76] = 0;                    // State Vector Update (CSM)
	//	progs[77] = 0;                    // State Vector Update (LM)
    }
}