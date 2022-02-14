//
// prolog.js - This stuff is a bunch of pinball/dsky global definitions 
//     that I decided to separate out so it wouldn't clutter up the code.
//
//     And also, documentation...
//

////////////////////////////////////////////////////////////////////////////////
//
// I'm assuming that anyone reading this code doesn't need any background 
// in exactly what a DSKY is, nor an AGC, nor any of the multitude of other
// Apollo-era acronyms; so I'm just jumping in at the deep end...
//
// I've wanted to build a simulator of the DSKY for a long time. I figured I
// knew enough about the basics of how it worked (from my original, vintage
// copy of the "Apollo Operations Handbook, Volume 1") that I could cobble 
// something together that would be a reasonable approximation. My only excuse
// for not doing it was not having a familiarity with any of the appropriate
// graphical toolkits. And so the idea languished...
//
// And then one day I found Ron Burkey's Virtual AGC project, and I was blown
// away! This wasn't just an "approximation" -- this was as close to the real
// thing as any mere mortal could hope to get. The only problem ... it didn't
// run on my Palm, so I couldn't have it with me at all times. :-)
//
// Then my Palm was succeeded by an iPod Touch, and I found Jonathan Stark's
// "Building iPhone Apps with HTML, CSS and JavaScript," and since I knew HTML,
// and CSS, and JavaScript, this seemed like the answer: a development
// environment that didn't require a big investment in time OR money OR
// learning curve!
//
// So naturally, iDSKY was the first thing I wanted to try. And serendipitously,
// Frank O'Brien's "The Apollo Guidance Computer: Architecture and Operation"
// was published at just the same time I started coding. I'd thought that Ron
// Burkey's site would provide me with everything I could possibly want to know
// to simulate the AGC/DSKY, but O'Brien's book really did provide much new (and
// useful) information.
//
// Of course, the really fabulous thing about Ron's Virtual AGC is that any time
// I had a question about how something *really* worked, I'd just fire up 
// Virtual AGC and check it out. It's not at all uncommon for all the
// documentation to be contradictory (or just plain wrong), and Virtual AGC was
// invaluable there. The only time I've found Virtual AGC doesn't work *exactly*
// right is the lights test (Verb 35).
//
// One of the things I tried to do is to structure the code so that the actual
// DSKY functionality was separated out and interfaced to the "AGC" part as much
// along the lines of the actual hardware as possible. The advantage of doing
// this is that if I ever figure out how to do sockets in JavaScript, it 
// shouldn't be too hideous a task to make the DSKY part interface with Ron's
// yaAGC. That would be *really* cool.
//
// Anyway, if you've read this far I guessing you're pretty serious about 
// wanting to know more. So here are my recommendations:
//
// 1. Run, don't walk, to Ron Burkey's site, http://www.ibiblio.org/apollo/
//    If that link doesn't work, just Google "virtual agc". Even if you don't
//    want to run Ron's Virtual AGC (though I can't imagine you wouldn't), it
//    is the mother lode of references. Tons of online documents. Don't even
//    think of leaving home without it.
//
// 2. Buy "The Apollo Guidance Computer: Architecture and Operation", by Frank
//    O'Brien. Springer Praxis, 2010. ISBN 978-1-4419-0876-6. My local library
//    consortium doesn't have a copy, and I expect most local bookstores won't,
//    either. But this is *the* book -- you don't need to look at it before
//    making the plunge. 
//
// 3. Some other books that you may find of interest (but that don't delve
//    nearly as deeply into the guts of the AGC) are:
//
//    * Digital Apollo: Human and Machine in Spaceflight, by David Mindell.
//      MIT Press, 2008. ISBN 978-0262134972.
//    * Journey to the Moon: The History of the Apollo Guidance Computer, 
//      by Eldon Hall. AIAA, 1996. ISBN 978-1563471858. Eldon Hall is the
//      fellow who architected the AGC. He knows whereof he speaks.
//    * Left Brains for the Right Stuff, by Hugh Blair-Smith. SDP Publishing,
//      2015. ISBN 978-0996434539. 
//    * Sunburst and Luminary: An Apollo Memoir, by Don Eyles. Fort Point Press,
//      2018. ISBN 978-0986385902.
//
// That's it. Now, go verb a few nouns.
//
////////////////////////////////////////////////////////////////////////////////

//                          A Note on the Use of Octal
//                           ------------------------
// It may seem peculiar to see octal notation in a Javascript program, but the
// designers and programmers who worked on the AGC used octal notation. All of 
// the documentation uses octal notation, and all of the binary data (which in
// some cases is included verbatim in this code) is given in octal. It would be
// impractical, really, to try to avoid using octal. Javascript supports octal
// notation, so we might as well use it. Any number that begins with a zero is
// in octal.

//                        A Note on Symbols and Comments
//                         ----------------------------
// You will see that some symbols and comments are rendered in ALL CAPITAL LETTERS.
// This is an indication that the symbol or comment is taken directly from the
// original AGC source code.

// Values related to word size and data representation

const MaxUns  = 077777;         // The maximum value for an unsigned 15-bit integer
const ModUns  = MaxUns + 1;     // The modulo value to use on unsigned words
const MaxMagn = 037777;         // The maximum magnitude of a signed 15-bit integer
const ModMagn = MaxMagn + 1;    // The modulo value to use on signed words
const spSign  = 040000;

const dpMaxMagn = 01777777777;
const dpModMagn = dpMaxMagn + 1;
const dpSign    = 04000000000;

const MaskR3  = 000007;
const MaskR5  = 000037;
const MaskR7  = 000177;
const MaskR11 = 003777;
const MaskR14 = 037777;
const MaskR15 = 077777;
const MaskR16 = 0177777;
const MaskR28 = 01777777777;
const MaskR29 = 03777777777;
const MaskR30 = 07777777777;

const pow_2_28  = Math.pow(2,28);  // Used extensively in I/O scaling
const pow_2_15  = Math.pow(2,15);
const pow_2_14  = Math.pow(2,14);
const pow_2_11  = Math.pow(2,11);
const pow_2_7   = Math.pow(2,7);
const pow_2_3   = Math.pow(2,3);

// Give names to bits
//
// Words in the AGC are 15 bits(*) in size, the LSB is designated bit 1, and the
// MSB is designated bit 15. One's complement is used almost exclusively to
// represent signed numbers, with bit 15 being the sign. (The exception being
// the CDUs, which use two's complement.)
//
// (*) That's actually a little white lie. But this simulation isn't deep
//     enough to make the truth hurt.

const Bit1  = 1;
const Bit2  = 1 << 1;
const Bit3  = 1 << 2;
const Bit4  = 1 << 3;
const Bit5  = 1 << 4;
const Bit6  = 1 << 5;
const Bit7  = 1 << 6;
const Bit8  = 1 << 7;
const Bit9  = 1 << 8;
const Bit10 = 1 << 9;
const Bit11 = 1 << 10;
const Bit12 = 1 << 11;
const Bit13 = 1 << 12;
const Bit14 = 1 << 13;
const Bit15 = 1 << 14;

// Define symbols for use with BLANKSUB()
const R1     = 1;
const R2     = 2;
const R1R2   = 3;
const R3     = 4;
const R1R3   = 5;
const R2R3   = 6;
const R1R2R3 = 7;

// Define symbolic names for input keycodes

const kZERO    = 16;
const kVERB    = 17;
const kRSET    = 18;
const kKEY_REL = 25;
const kPLUS    = 26;
const kMINUS   = 27;
const kENTR    = 28;
const kPRO     = 29;
const kCLR     = 30;
const kNOUN    = 31;

//  Define names for alerts and annuciators -- these are set to constants
//  that will be used as indices into the following two arrays, which allows
//  us to reference the alerts and annunciators symbolically, even though
//  they occupy different channels.

const aVEL         = 1;
const aNO_ATT      = 2;
const aALT         = 3;
const aGIMBAL_LOCK = 4;
const aTRACKER     = 5;
const aPROG        = 6;
const aCOMP_ACTY   = 7;
const aUPLINK_ACTY = 8;
const aTEMP        = 9;
const aKEY_REL     = 10;
const aVN_FLASH    = 11;
const aOPR_ERR     = 12;
const aTEST_LIGHTS = 13;
const aSTBY        = 14;
const aRESTART     = 15;

var ChannelForAlert = [];
ChannelForAlert[aVEL]         = 8;
ChannelForAlert[aNO_ATT]      = 8;
ChannelForAlert[aALT]         = 8;
ChannelForAlert[aGIMBAL_LOCK] = 8;
ChannelForAlert[aTRACKER]     = 8;
ChannelForAlert[aPROG]        = 8;
ChannelForAlert[aCOMP_ACTY]   = 9;
ChannelForAlert[aUPLINK_ACTY] = 9;
ChannelForAlert[aTEMP]        = 9;
ChannelForAlert[aKEY_REL]     = 9;
ChannelForAlert[aVN_FLASH]    = 9;
ChannelForAlert[aOPR_ERR]     = 9;
ChannelForAlert[aTEST_LIGHTS] = 11;
ChannelForAlert[aSTBY]        = 11;
ChannelForAlert[aRESTART]     = 11;

var BitForAlert = [];
BitForAlert[aVEL]         = Bit3;
BitForAlert[aNO_ATT]      = Bit4;
BitForAlert[aALT]         = Bit5;
BitForAlert[aGIMBAL_LOCK] = Bit6;
BitForAlert[aTRACKER]     = Bit8;
BitForAlert[aPROG]        = Bit9;
BitForAlert[aCOMP_ACTY]   = Bit2;
BitForAlert[aUPLINK_ACTY] = Bit3;
BitForAlert[aTEMP]        = Bit4;
BitForAlert[aKEY_REL]     = Bit5;
BitForAlert[aVN_FLASH]    = Bit6;
BitForAlert[aOPR_ERR]     = Bit7;
BitForAlert[aTEST_LIGHTS] = Bit10;
BitForAlert[aSTBY]        = Bit11;
BitForAlert[aRESTART]     = Bit12;

// These are the codes that are sent to the DSKY to represent the
// digits 0 through 9 plus blank.

var RelayCodes = [];
RelayCodes[0] = 21;    // 0
RelayCodes[1] = 3;     // 1
RelayCodes[2] = 25;    // 2
RelayCodes[3] = 27;    // 3
RelayCodes[4] = 15;    // 4
RelayCodes[5] = 30;    // 5
RelayCodes[6] = 28;    // 6
RelayCodes[7] = 19;    // 7
RelayCodes[8] = 29;    // 8
RelayCodes[9] = 31;    // 9
RelayCodes[10] = 0;    // blank

//
//     Relayword Format for OUT0 (Channel 8)
//     -------------------------------------
//   Bits 15-12   Bit 11   Bits 10-6   Bits 5-1
//    1 0 1 1                 MD1        MD2
//    1 0 1 0                 VD1        VD2
//    1 0 0 1                 ND1        ND2
//    1 0 0 0                            R1D1
//    0 1 1 1      +R1S       R1D2       R1D3
//    0 1 1 0      -R1S       R1D4       R1D5
//    0 1 0 1      +R2S       R2D1       R2D2
//    0 1 0 0      -R2S       R2D3       R2D4
//    0 0 1 1                 R2D5       R3D1
//    0 0 1 0      +R3S       R3D2       R3D3
//    0 0 0 1      -R3S       R3D4       R3D5
//
//    1 1 0 0   B9:PROG  B8:TRACKER  B6:GIMBAL-LOCK  B5:ALT  B4:NO_ATT  B3:VEL

// In addition to certain conditions within the AGC, errors detected within iDSKY
// will cause the "PROG" alert to be illuminated. As with AGC errors, V05N09E can
// be used to view the cause of the error. 
//
// ALMCADR (e[01363]) will contain the failure code:
//      02001 = NaN was detected 
//      02002 = An out-of-range parameter was passed
//      02003 = Variable was undefined
//      02004 = An erasable memory location contained an invalid value
//
//      A 0300x failure code means the self-check routine found something
//      out-of-range in erasable storage:
//
//      03001 = A NaN (something that is Not-a-Number)
//      03002 = A negative number
//      03003 = A number greater than MaxUns
//      03004 = A number with a fractional part
//
// ALMCADR+2 (e[01365]) may contain additional diagnostic information specific to the
// error and function. See the source code for the appropriate function.