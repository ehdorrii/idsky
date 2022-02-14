//
// verbTable.js - This is a table that holds pointers to the Verb routines
//

var verbs = [];

verbs[0]  = 0;                 // illegal
verbs[1]  = displayOctal1;     // Display octal component 1 (R1)
verbs[2]  = displayOctal2;     // Display octal component 2 (R1)
verbs[3]  = displayOctal3;     // Display octal component 3 (R1)
verbs[4]  = displayOctal12;    // Display octal components 1 & 2 (R1, R2)
verbs[5]  = displayOctal123;   // Display octal components 1 & 2 & 3 (R1, R2, R3)
verbs[6]  = displayDecimal;    // Display decimal (R1)
verbs[7]  = displayDpDecimal;  // Display double-precision decimal (R1, R2)
verbs[8]  = 0;                 // spare
verbs[9]  = 0;                 // spare

verbs[10] = 0;                 // spare
verbs[11] = monitorOctal1;     // Monitor octal component 1
verbs[12] = monitorOctal2;     // Monitor octal component 2
verbs[13] = monitorOctal3;     // Monitor octal component 3
verbs[14] = monitorOctal12;    // Monitor octal components 1 & 2
verbs[15] = monitorOctal123;   // Monitor octal components 1 & 2 & 3
verbs[16] = monitorDecimal;    // Monitor decimal
verbs[17] = monitorDpDecimal;  // Monitor double-precision decimal
verbs[18] = 0;                 // spare
verbs[19] = 0;                 // spare

verbs[20] = 0;                 // spare
verbs[21] = load1Comp;         // Load component 1 (R1)
verbs[22] = load1Comp;         // Load component 2 (R2)
verbs[23] = load1Comp;         // Load component 3 (R3)
verbs[24] = load23Comp;        // Load components 1 & 2
verbs[25] = load23Comp;        // Load components 1 & 2 & 3
verbs[26] = 0;                 // spare
verbs[27] = displayFixed;      // Fixed memory display
verbs[28] = 0;                 // reserved
verbs[29] = 0;                 // reserved

verbs[30] = 0;                 // Request executive
verbs[31] = 0;                 // Request waitlist
verbs[32] = recycle;           // Resequence
verbs[33] = proceedWOI;        // Proceed without data
verbs[34] = terminateLoad      // Terminate current test or load
verbs[35] = beginLightTest;    // Test lights
verbs[36] = freshStart;        // Fresh start
verbs[37] = changeProgram;     // Change major mode
verbs[38] = 0;                 // spare
verbs[39] = 0;                 // spare

verbs[40] = 0;                 // Zero CDUs
verbs[41] = 0;                 // Coarse align CDUs
verbs[42] = 0;                 // Fine align IMU
verbs[43] = 0;                 // Load IMU attitude error meters
verbs[44] = 0;                 // Set surface flag
verbs[45] = 0;                 // Reset surface flag
verbs[46] = 0;                 // Establish G&C control
verbs[47] = 0;                 // Move LM state vector into CM state vector
verbs[48] = 0;                 // Request DAP data load (R03)
verbs[49] = 0;                 // Request crew defined maneuver (R62)

verbs[50] = doNothing;         // Please perform
verbs[51] = 0;                 // Please mark
verbs[52] = 0;                 // Mark on offset landing site
verbs[53] = 0;                 // Please perform alternate LOS mark
verbs[54] = 0;                 // Request rendezvous backup sighting mark routine (R23)
verbs[55] = adjustTime;        // Increment AGC time (decimal)
verbs[56] = 0;                 // Terminate tracking (P20)
verbs[57] = 0;                 // Display update state of FULTKFLG
verbs[58] = 0;                 // Enable auto maneuver in P20
verbs[59] = 0;                 // Please calibrate

verbs[60] = 0;                 // Set astronaut total attitude (R17) to present attitude
verbs[61] = 0;                 // Display DAP attitude error
verbs[62] = 0;                 // Display total attitude error WRT N22
verbs[63] = 0;                 // Display total astronaut attitude error WRT N17
verbs[64] = 0;                 // Request S-Band antenna routine
verbs[65] = 0;                 // Optical verification of prelaunch alignment
verbs[66] = 0;                 // Vehicles attached, move this SV to other
verbs[67] = 0;                 // Display W matrix
verbs[68] = 0;                 // 
verbs[69] = agcInit;           // Cause restart

verbs[70] = agcUpdate;         // Update liftoff time
verbs[71] = agcUpdate;         // Universal update - block address
verbs[72] = agcUpdate;         // Universal update - single address
verbs[73] = agcUpdate;         // Update AGC time (octal)
verbs[74] = dumpMemory;        // Initialize erasable dump via downlink
verbs[75] = doLiftoff;         // Backup liftoff
verbs[76] = doClock;           // iDSKY: Set MET to current TOD & display
verbs[77] = functionTest;      // iDSKY: Display routines self test
verbs[78] = 0;                 // Update prelaunch azimuth
verbs[79] = selectFlight;      // iDSKY: select flight launch profile

verbs[80] = 0;                 // Update LM state vector
verbs[81] = 0;                 // Update CSM state vector
verbs[82] = orbitalParms       // Request orbital parameters display (R30)
verbs[83] = 0;                 // Request rendezvous parameter display (R31)
verbs[84] = 0;                 // 
verbs[85] = 0;                 // Request rendezvous parameter display no. 2 (R34)
verbs[86] = 0;                 // Reject rendezvous backup sighting mark
verbs[87] = 0;                 // Set VHF range flag
verbs[88] = 0;                 // Reset VHF range flag
verbs[89] = 0;                 // Request rendezvous final attitude

verbs[90] = 0;                 // Request rendezvous out of plane display (R36)
verbs[91] = banksum;           // Display bank sum
verbs[92] = 0;                 // Operate IMU performance test (P07)
verbs[93] = 0;                 // Enable W matrix initialization
verbs[94] = 0;                 // Perform cislunar attitude maneuver (P23)
verbs[95] = 0;                 // 
verbs[96] = terminate;         // Terminate integration and go to P00
verbs[97] = 0;                 // Perform engine fail procedure
verbs[98] = 0;                 // 
verbs[99] = 0;                 // Please enable engine
