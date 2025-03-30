/*
** By Michel Lundell
** Sön 30 Mar 2025 11:03:55 CEST
*/

var myPort = null;
var myReader = null;
var myReadableStreamClosed = null;
var isConnected = false;
var commandVerification = "OK";
var commandCallback = function(v) {};;
var commandErrorCallback = function(v) {};;


// Add eventhandlers
window.addEventListener('DOMContentLoaded', function() {
    checkBrowser();
    setButtonDisabled('startNotifications',false);
    setButtonDisabled('blink',true);
    setButtonDisabled('stopNotifications',true);
});

// Setup a callback when user clicks on "Connect"
document.querySelector('#startNotifications').addEventListener('click', function(event) {
    event.stopPropagation();
        event.preventDefault();
    onStartButtonClick();
});

// Setup a callback when user clicks on "Disconnect"
document.querySelector('#stopNotifications').addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
    onStopButtonClick();
});

document.querySelector('#blink').addEventListener('click', function(event) {
    event.stopPropagation();
        event.preventDefault();
    writeToDevice("BLINK!","OK", function(v) {}, function(v) {});
});


function displayValue(v)
{
    document.getElementById('ppmUI').textContent = v + " PPM";
}

// Check that browser is compatible, e.g Chrome
function checkBrowser()
{
    var isChromium = window.chrome;
    var winNav = window.navigator;
    var vendorName = winNav.vendor;
    var isOpera = typeof window.opr !== "undefined";
    var isIEedge = winNav.userAgent.indexOf("Edge") > -1;
    var isIOSChrome = winNav.userAgent.match("CriOS");

    if (isIOSChrome) {
           alert("Chrome on iOS is not supported");
    } else if(
        isChromium !== null &&
        typeof isChromium !== "undefined" &&
        vendorName === "Google Inc." &&
        isOpera === false &&
        isIEedge === false
    ) {
           isChrome=true;
    } else { 
           isChrome=false;
        alert("You need to use Chrome browser");
    }
    if (/Chrome\/(\d+\.\d+.\d+.\d+)/.test(navigator.userAgent)){
        if (48 > parseInt(RegExp.$1)) {
            alert('Warning! Keep in mind this sample has been tested with Chrome ' + 48 + '.');
        }
    }
}

async function writeToDevice(command,success,cb_success,cb_error)
{
        const textEncoder = new TextEncoderStream();
        const writableStreamClosed = textEncoder.readable.pipeTo(myPort.writable);
        const writer = textEncoder.writable.getWriter();
        await writer.write(command);
        await writer.close();
        await writer.releaseLock();
        commandVerification = success;
        commandCallback = cb_success;
        commandErrorCallback = cb_error;
}

// Enable/disable button
function setButtonDisabled(id,state)
{
    document.getElementById(id).disabled = state;
}

class LineBreakTransformer {
  constructor() {
    this.container = '';
  }
  transform(chunk, controller) {
        this.container += chunk;
        const lines = this.container.split('\r\n');
        this.container = lines.pop();
        lines.forEach(line => controller.enqueue(line));
  }
  flush(controller) {
        controller.enqueue(this.container);
  }
}

function status(text)
{
    document.getElementById("status").innerHTML = text;
}

// Called when user clicks on "Connect"
async function onStartButtonClick() 
{
    setButtonDisabled('startNotifications',true);
    setButtonDisabled('stopNotifications',false);
    setButtonDisabled('blink',false);
    // $("#status").text("connecting to device ...");
    status("connecting to device ...");
    myPort = await navigator.serial.requestPort();
    try {
        await myPort.open({ baudRate: 9600 });
    } catch (excep) {
        status(excep);
        setButtonDisabled('startNotifications',false);
        setButtonDisabled('stopNotifications',true);
        return;
    }
    const textDecoder = new TextDecoderStream();
    myReadableStreamClosed = myPort.readable.pipeTo(textDecoder.writable);
    myReader = textDecoder.readable.pipeThrough(new TransformStream(new LineBreakTransformer())).getReader();
    isConnected = true;
    status("Connected to device ...");
    while (isConnected) {
        const { value, done } = await myReader.read();
        if (done) {
            myReader.releaseLock();
            break;
        }
        var varr0 = value.split("\n");
        var varr = varr0[0].split(",");
        if( varr.length != 2 ) continue;
        /* Check if device is ready */
        if( varr[0] != 1 ) {
            status("Wait, sensor not ready ..."); 
            varr[1] = 0;
        } else {
            status("Ready to measure, exhale the last volume of the lung into the device now");
        }
        var ppm = parseInt(varr[1]);
        displayValue(ppm);
        }
    setButtonDisabled('startNotifications',false);
    setButtonDisabled('stopNotifications',true);
    displayValue(0);
}

async function onStopButtonClick() {
    isConnected = false;
    myReader.cancel();
    myReadableStreamClosed.catch(() => { myPort.close(); });
    setButtonDisabled('startNotifications',false);
    setButtonDisabled('stopNotifications',true);
    setButtonDisabled('blink',true);
    status("Disconnected");
}

