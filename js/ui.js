//
// ui.js -- page navigation and device-specific stuff
//

var uiDebug = false;
var doKeyClick = false;
var imgDir = 'png/dsky/';
var isMobileSafari = false;
var isRightButtonShown = false;

var currentDiv = '';
const initialScroll = 0;

var currentHelp = 'helpIndex.html';
var scrollHelp = initialScroll;

var currentList = 'listIndex.html';
var scrollList = initialScroll;

/************************************************************************************
* device sensor access                                                              *
************************************************************************************/

var ax = 0;             // Acceleration (from device accelerometer)
var ay = 0;             // Data is expressed as m/s^2
var az = 0;

var ralpha = 0;         // Rotation (from device gyroscope)
var rbeta  = 0;         // Data is expressed in degrees
var rgamma = 0;         // Range: alpha: 0..360  beta: -90..+90  gamma: -180..+180


if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", function(eid) {
        ralpha = eid.alpha;
        rbeta = eid.beta + 90;
        rgamma = eid.gamma + 180;
    });
}

if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', function(eid) {
        ax = eid.acceleration.x;
        ay = eid.acceleration.y;
        az = eid.acceleration.z;
    });
}

/************************************************************************************
* Prepare resized images, fix up menu bar buttons                                   *
************************************************************************************/

$(document).ready(function(){ 
    $('#theDsky').load('dsky.html', function() {
        if (isTouchDevice()) {
            e[DEVCAPFL] |= TOUCHEV;
			
            $('area').each(function () {
                $(this).bind("touchstart", $(this).attr('onmousedown'));
                $(this).removeAttr('onmousedown');
            });
			
            $('#PRO').each(function () {
                $(this).bind("touchend", $(this).attr('onmouseup'));
                $(this).removeAttr('onmouseup');
            });
        }

        if (window.DeviceOrientationEvent) e[DEVCAPFL] |= ORIENTEV;
        if (window.DeviceMotionEvent) e[DEVCAPFL] |= MOTIONEV;
		
        defineImages();     // in dsky.js
		defineSounds();
        agcInit();          // in agc.js
        padLoad();          // in padLoad.js

        mtDefineImages();   // in timer.js
        mtDefineSounds();   // in timer.js
        mtInit();           // in timer.js
    });
	
    $('#theHelps').load('helpIndex.html #content', function() {
        convertLinks();
    });
	
    $('#theLists').load('listIndex.html #content', function() {
        convertLinks();
    });
    showDiv('theDsky');
    
    // See http://stackoverflow.com/questions/12363742 for why this is here:
    addEventListener("touchstart", function(){}, false);
});


function convertLinks() {
    if (uiDebug) console.log('convertLinks()');

    $('#theHelps a').click(function(e){
        var url = e.target.href;
        if (!url.match(/ibiblio/)) {
            if (e.cancelable) e.preventDefault();
            showPage(e.target.href);
        }
    });
    
    $('#theLists a').click(function(e){
        var url = e.target.href;
        if (e.cancelable) e.preventDefault();
        showPage(e.target.href);
    });
}

function updateButtons(thePage) {
    if (uiDebug) console.log('updateButtons('+thePage+')');

    $('.backButton').remove();
    $('.leftButton').remove();
    $('.rightButton').remove();
    isRightButtonShown = false;
    
    if (thePage === 'dsky.html') {
        $('#theHeader').append('<div class="leftButton" id="hbl">Help</div>');
        $('#theHeader .leftButton').click(function(e){
            showDiv('theHelps');
        });
        
        $('#theHeader').append('<div class="rightButton" id="hbr">Lists</div>');
        isRightButtonShown = true;
        $('#theHeader .rightButton').click(function(e){
            showDiv('theLists');
        });
    } else if (thePage === 'helpIndex.html') {
        $('#theHeader').append('<div class="backButton" id="hbl">DSKY</div>');
        $('#theHeader .backButton').click(function(){
            showDiv('theDsky');
        });
    } else if (thePage === 'listIndex.html') {
        $('#theHeader').append('<div class="backButton" id="hbl">DSKY</div>');
        $('#theHeader .backButton').click(function(){
            showDiv('theDsky');
        });
    } else if (thePage.search(/(help|demo).*html/) !== -1) {
        $('#theHeader').append('<div class="backButton" id="hbl">DSKY</div>');
        $('#theHeader .backButton').click(function(){
            showDiv('theDsky');
        });
        
        $('#theHeader').append('<div class="rightButton" id="hbr">Index</div>');
        isRightButtonShown = true;
        $('#theHeader .rightButton').click(function(){
            showPage("helpIndex.html");
        });
    } else if (thePage.search(/list.*html/) !== -1) {
        $('#theHeader').append('<div class="backButton" id="hbl">DSKY</div>');
        $('#theHeader .backButton').click(function(){
            showDiv('theDsky');
        });
        
        $('#theHeader').append('<div class="rightButton" id="hbr">Index</div>');
        isRightButtonShown = true;
        $('#theHeader .rightButton').click(function(){
            showPage("listIndex.html");
        });
    } else {
        if (uiDebug) console.log('No condition match in UpdateButtons()!');
    }
}

function showDiv(theDiv) {
    if (uiDebug) console.log('showDiv('+theDiv+')');

    if (isMobileSafari) {
        if (currentDiv === 'theHelps') scrollHelp = window.pageYOffset;
        if (currentDiv === 'theLists') scrollList = window.pageYOffset;
    } else {
        if (currentDiv === 'theHelps') scrollHelp = $(document).scrollTop();
        if (currentDiv === 'theLists') scrollList = $(document).scrollTop();
    }

    if (uiDebug) console.log('scrollHelp='+scrollHelp+' scrollList='+scrollList);

    $('#theDsky').hide();
    $('#theHelps').hide();
    $('#theLists').hide();
    
    $('#'+theDiv).show();

    if (theDiv === 'theDsky') {
        window.scrollTo(0, initialScroll);
        updateButtons('dsky.html');
    } else if (theDiv === 'theHelps') {
        window.scrollTo(0, scrollHelp);
        updateButtons(currentHelp);
    } else if (theDiv === 'theLists') {
        window.scrollTo(0, scrollList);
        updateButtons(currentList);
    }
    
    currentDiv = theDiv;
}

function showPage(thePage) {
    if (uiDebug) console.log('showPage('+thePage+')');
    
    if (thePage === 'dsky.html') {
        showDiv('theDsky');
    } else if (thePage.search(/(help|demo).*html/) !== -1) {
        if (thePage !== currentHelp) {
            currentHelp = thePage;
            scrollHelp = 0;
            $('#theHelps').load(thePage+' #content', function() {
                convertLinks();
                showDiv('theHelps');
            });
        }
    } else {
        if (thePage !== currentList) {
            currentList = thePage;
            scrollList = 0;
            $('#theLists').load(thePage+' #content', function() {
                convertLinks();
                showDiv('theLists');
            });
        }
    }
}

function keyPress(e, col, row) {
    if (uiDebug) {
        console.log("keyPress(e, "+col+", "+row+")");
        DSPMM((col * 10) + row);
        updateDisplay();
    }

    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (doKeyClick) {
        keyClick.currentTime = 0;
        keyClick.play();
    }
	setTimeout(function () { dskyKeyInput(col, row); }, 2);
}

function isTouchDevice() {
  return !!('ontouchstart' in window);
}

// Sound effect for UI widgets

var keyClick;

function defineSounds() {
	keyClick = new Audio('wav/key1.wav');
}
