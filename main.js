// Constants for HTML elements & canvas contexts
const infoDiv = document.querySelector("#infoDiv");
const infoMsg = document.querySelector("#infoMsg");

const gameDiv = document.querySelector("#gameDiv");
const pSelInfo = document.querySelector("#selInfo");
const canvSelTile = document.querySelector("#selTile");
const ctxSelTile = canvSelTile.getContext("2d");

const canv = document.querySelector("#game");
const ctx = canv.getContext("2d");

const gameUIDiv = document.querySelector("#gameUI");
const tileSelDiv = document.querySelector("#tileSelDiv");
const canvTileSel = document.querySelector("#canvTileSel");
const ctxTileSel = canvTileSel.getContext("2d");

// Game variables (user-changeable)
var selIndex = 0; // Tile selection index (in tilemap)
var randomMode = false; // Place random tile when RMB pressed?
var paintMode = true; // Keep placing / clearing tiles when mouse button held down?
let helpOpen = false; // Is the help screen open?
let tileChooserOpen = false; // Is the tile chooser screen open?
let imgSaveFormat = "png"; // Format used on canvas capture saving
let selCanvScale = 3;

// Variables only loaded on setup()
let tileSize = 16; // Size of in-game blocks (tiles) in pixels
let xTilesCount = 40; // Amount of maximum tiles on the X-axis of the canvas
let yTilesCount = 28; // Amount of maximum tiles on the Y-axis of the canvas

// Variables not meant for the user(((
let tilemap = null; // Holds whole tilemap PNG for blocks & items
let offsets = []; // Offsets for each tilemap's tiles to crop them when rendering
let lastRandomPlacePos = { x: -1, y: -1 };
let mouseUpAfterPlace = false;
let firstTimer = true;

// Draws a block using tiles from 'tilemap' @ (x, y) with layers "a,b,c", layers on top at end of the string
// eg. 'drawBlock(0, 0, "1")' would draw a "dirt" tile at the location (0, 0) on the canvas.
function drawBlock(x, y, layersStr, context = ctx) {
  let layers = ((layersStr.includes(",")) ? layersStr.split(",") : [layersStr]);

  for (i = 0; i < layers.length; i++) {
    let val = layers[i];
    let off = offsets[val];
    context.drawImage(tilemap, off.x, off.y, tileSize, tileSize, x, y, tileSize, tileSize);
  }
}

// Rendering testing function, W.I.P
function testRender() {
  clearTiles();

  var generator = new Simple1DNoise();
  var smoothness = 14;
  var maxH = 14;
  var minH = 3;

  for(perlinX = 0; perlinX < (canv.width / tileSize) / smoothness; perlinX += 1 / smoothness) {
    var x = parseInt((perlinX * smoothness).toFixed(0));
    var perlinY = generator.getVal(perlinX);
    var y = Math.max(parseInt(perlinY * maxH), minH);
    y = (canv.height / tileSize) - y; // Invert Y for block placing usage

    //console.log("PerlinX: " + x + ", PerlinY: " + perlinY + ", Y: " + y);

    for(tY = y + 1; tY < canv.height / tileSize; tY++) {
      var depth = tY - y;
      var realY = ((canv.height / tileSize) - y);
      //console.log("Y: " + realY);

      if(realY)
      var drawStone = ((depth > 3) ? true : (depth > 2) ? ((rng(0, 3) == 0) ? true : false) : false);
      drawBlock(x * tileSize, tY * tileSize, ((drawStone) ? "3" : "1")); // Draw stone OR dirt
    }

    drawBlock(x * tileSize, y * tileSize, "0"); // Draw grass
  }

  updateSelection();
}

// Clears tiles & replace with sky background color
function clearTiles() {
  ctx.fillStyle = "rgb(0, 107, 196)";
  ctx.fillRect(0, 0, canv.width, canv.height); // Draw sky
}

// Loads "assets.png" file => 'tilemap' object & adds offsets for each tile to 'offsets' depending on 'tileSize' value
function loadAssets() {
  tilemap = new Image();
  tilemap.onload = (e) => {
    infoMsg.innerHTML = "Assets loaded, calculating offsets...";
    calcOffsets(tilemap);
    infoMsg.innerHTML = "Assets ready.";
    
    // Show game canvas, selected tile, hide loading div etc.
    canvTileSel.width = tilemap.width * selCanvScale;
    canvTileSel.height = tilemap.height * selCanvScale;
    ctxTileSel.scale(selCanvScale, selCanvScale);
    ctxTileSel.mozImageSmoothingEnabled = false; // Firefox
    ctxTileSel.imageSmoothingEnabled = false;
    ctxTileSel.drawImage(tilemap, 0, 0);

    infoDiv.style.display = "none";
    gameDiv.style.display = "inherit";
    
    testRender();
    
    infoMsg.style.fontSize = "18pt";
    
    try {
      if(localStorage.getItem("first_timer") == "true") {
        localStorage.setItem("first_timer", false);
        if(!helpOpen) { toggleHelp(); }
      }
    } catch(e) {  }
  }
  tilemap.src = "assets.png";
}

// Calculate offsets for tilemap's tiles using 'tileSize'
// tiles = Whole tilemap.PNG file, 
function calcOffsets(tiles) {
  offsets = [];
  for (y = 0; y < tiles.height; y += tileSize) {
    for (x = 0; x < tiles.width; x += tileSize) {
      offsets.push(new offset(x, y));
    }
  }
}

// Setup canvas, tile related variables etc.
function setup(restart = false) {
  try {
    let tile_size = localStorage.getItem("tile_size");
    let x_tiles_count = localStorage.getItem("x_tiles_count");
    let y_tiles_count = localStorage.getItem("y_tiles_count");
    let random_mode = localStorage.getItem("random_mode");
    let paint_mode = localStorage.getItem("paint_mode");
    let block_last_index = localStorage.getItem("block_last_index");
    let first_timer = localStorage.getItem("first_timer");
  
    // Values are invalid (usually unset / null)
    if (isNaN(parseInt(tile_size)) || isNaN(parseInt(x_tiles_count)) || isNaN(parseInt(y_tiles_count)) || parseBool(random_mode) === null ||
        parseBool(paint_mode) === null || isNaN(parseInt(block_last_index)) || parseBool(first_timer) === null) {
      if (restart) {
        infoDiv.style.background = "none";
        infoMsg.style.fontSize = "12pt";
        infoMsg.style.color = "red";
        let errorMsg = "ERROR: Something went wrong while initializing game variables!\n\nPossible issue causes:\n1. Unsupported browser\n2. Invalid setup() call.\n\nPossible fixes:\n1. Update browser\n2. Clear all data related to this site.";
        console.log("setup(): " + errorMsg);
        infoMsg.innerHTML = errorMsg.split("\n").join("<br>");
        return;
      }
      // WARN: localStorage values converted to strings when set
      localStorage.setItem("tile_size", tileSize);
      localStorage.setItem("x_tiles_count", xTilesCount);
      localStorage.setItem("y_tiles_count", yTilesCount);
      localStorage.setItem("random_mode", randomMode);
      localStorage.setItem("paint_mode", paintMode);
      localStorage.setItem("block_last_index", selIndex);
      localStorage.setItem("first_timer", firstTimer);
  
      setup(true); // Restart
      return;
    }
  
    tileSize = parseInt(tile_size);
    xTilesCount = parseInt(x_tiles_count);
    yTilesCount = parseInt(y_tiles_count);
    updateModes(parseBool(random_mode), parseBool(paint_mode), false);
    selIndex = block_last_index;
  } catch(e) {
    //console.log(e);
  }
  
  canvSelTile.width = canvSelTile.height = tileSize;
  infoDiv.width = tileSize * xTilesCount;
  canv.width = infoDiv.width;
  infoDiv.height = tileSize * yTilesCount;
  canv.height = infoDiv.height;
  
  loadAssets();
}


document.addEventListener('contextmenu', e => e.preventDefault()); // Prevent right-click context menu on whole document
canv.addEventListener("mousedown", updateTile); // Placing & breaking tiles
canv.addEventListener("mousemove", updateTile); // Paint mode for ^^^

// Tile changer for Mouse wheel
document.addEventListener("wheel", e => {
  if(!e.ctrlKey) {
    let dir = ((e.deltaX > 0) ? "x+" : (e.deltaX < 0) ? "x-" : (e.deltaY > 0) ? "y+" : (e.deltaY < 0) ? "y-" : "none");
    changeTile(dir);
  }
});

// Handle keyDown events (also Arrow key tile changer)
document.addEventListener("keydown", e => {
  //console.log("'" + e.keyCode + "' pressed");
  if (e.keyCode == 67) { // C - Clear game canvas
    console.log("> C pressed! Clearing game canvas...");
    clearTiles();
  } else if(e.keyCode == 27 && helpOpen) { // Close help screen with ESC
    toggleHelp();
  } else if(e.keyCode == 27 && tileChooserOpen) { // Close tile selection screen with ESC
    toggleTileSelector();
  } else if (e.keyCode == 69) { // E - Toggle tile selection screen
    console.log("> E pressed! Toggling tile selector...");
    toggleTileSelector();
  } else if (e.keyCode == 71) { // G - Generate new terrain
    console.log("> G pressed! Generating new terrain...");
    testRender();
  } else if (e.keyCode == 72) { // H - Game help
    console.log("> H pressed! " + ((helpOpen) ? "Hiding" : "Showing") + " help...");
    toggleHelp();
  } else if (e.keyCode == 76 || e.keyCode == 79) { // L or O - Load .PNG save
    console.log("> L pressed! Opening load dialog...");

    document.querySelector("#worldUpload").value = "";
    document.querySelector("#lblWorldUpload").click();

  } else if (e.keyCode == 80) { // P - Toggle paint mode
    updateModes(randomMode, !paintMode);
    console.log("> P pressed! Paint mode enabled: " + paintMode);
  } else if (e.keyCode == 82) { // R - Toggle random mode
    updateModes(!randomMode, paintMode);
    console.log("> R pressed! Random mode enabled: " + randomMode);
  } else if (e.keyCode == 83) { // S - Save game canvas as an Image
    console.log("> S pressed! Saving canvas image as a " + imgSaveFormat.toUpperCase() + "...");
    
    let dateTime = new Date().toISOString().replace("T", "--").split(":").join("-").split(".")[0];
    let saveLnk = document.querySelector("#saveLnk")

    saveLnk.setAttribute("download", "mineclone2d-" + dateTime + ".png");
    saveLnk.setAttribute("href", canv.toDataURL("image/" + imgSaveFormat).replace("image/" + imgSaveFormat, "image/octet-stream"));
    saveLnk.click();
  } else {
    // Tile changer for Arrow keys
    let dir = ((e.keyCode == 37 || e.keyCode == 40) ? "y-" : (e.keyCode == 38 || e.keyCode == 39) ? "y+" : "")
    if (dir != "") { changeTile(dir); }
  }
});

// Tile changer for Mouse 4 / Mouse 5 (also prevent going forward / back)
document.addEventListener("mouseup", e => {
  //console.log(e.button);
  if (e.button == 2) {
    mouseUpAfterPlace = true;
  } else if (e.button == 3) { // Mouse 4 (back) pressed
    e.preventDefault();
    changeTile("y-");
  } else if (e.button == 4) { // Mouse 5 (forward) pressed
    e.preventDefault();
    changeTile("y+");
  }

});

// Update tile under mouse pointer (e = MouseEvent)
function updateTile(e) {
  if (e.type == "mousemove" && !paintMode) {
    return;
  }

  let absPos = getClickPos(e.x, e.y);
  let tmpPos = {
    x: Math.floor(absPos.x / tileSize),
    y: Math.floor(absPos.y / tileSize)
  }
  let pos = {
    x: tmpPos.x * tileSize,
    y: tmpPos.y * tileSize
  }

  if (e.buttons == 1) { // Left click (clear tile)
    ctx.fillStyle = "rgb(0, 107, 196)";
    ctx.fillRect(pos.x, pos.y, tileSize, tileSize);
  } else if (e.buttons == 2) { // Right click (place tile)
    let shouldPlace = (lastRandomPlacePos.x !== pos.x || lastRandomPlacePos.y !== pos.y);
    if(randomMode && !shouldPlace && !mouseUpAfterPlace) { return; }
    if (e.type == "mousedown" && randomMode) { mouseUpAfterPlace = false; }

    drawBlock(pos.x, pos.y, selIndex.toString());
    if (randomMode) {
      shouldPlace = false;
      lastRandomPlacePos = pos;
      selIndex = rng(0, offsets.length - 1);
      updateSelection();
    }
  }

  //if(e.buttons == 1 || e.buttons == 2) { console.log("> " + ((e.buttons == 2) ? "Placed" : "Cleared") + " tile" + ((e.buttons == 2) ? " w/ ID " + selIndex : "") + " @ (" + tmpPos.x + ", " + tmpPos.y + ")"); }
}

// Change the tile 
function changeTile(dir = "y+") {
  if (dir == "y+") { // ->, +
    if (selIndex < offsets.length - 1) {
      selIndex++;
    } else {
      selIndex = 0;
    }
  } else if (dir == "y-") { // <-, -
    if (selIndex > 0) {
      selIndex--;
    } else {
      selIndex = offsets.length - 1;
    }
  }
  updateSelection();
}

// Draws selected tile image & index above game canvas
function updateSelection() {
  pSelInfo.innerHTML = "Selected tile: " + selIndex;
  try { localStorage.setItem("block_last_index", selIndex); } catch(e) {  }
  ctxSelTile.clearRect(0, 0, tileSize, tileSize);
  drawBlock(0, 0, selIndex.toString(), ctxSelTile);
}

// Updates 'randomEnabled' and 'paintEnabled' in memory, changes UI styles and also saves to localStorage if specified
function updateModes(randomEnabled, paintEnabled, save = true) {
  randomMode = randomEnabled; paintMode = paintEnabled;

  document.querySelector("#pRandomMode").style.color = ((randomMode) ? "lime" : "red");
  document.querySelector("#pPaintMode").style.color = ((paintMode) ? "lime" : "red");

  if(save) {
    try {
      localStorage.setItem("random_mode", randomMode);
      localStorage.setItem("paint_mode", paintMode);
    } catch(e) {  }
  }
}

// Get relative click position on the element
function getClickPos(absX, absY, el = canv) {
  let elPos = getElPos(el);
  return {
    x: Math.max(absX - elPos.x, 0),
    y: Math.max(absY - elPos.y, 0)
  }
}

// Get HTML element's absolute position in the document
// eg. 'el = document.querySelector("#myDiv")'
function getElPos(el) {
  for (var lx = 0, ly = 0; el != null; lx += el.offsetLeft, ly += el.offsetTop, el = el.offsetParent);
  return {
    x: lx,
    y: ly
  };
}

// Generate random number between {min}-{max}
// example 1. rng(1, 5) = 1
// example 2. rng(4, 8) = 8
function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function offset(x, y) {
  this.x = x;
  this.y = y;
}

function parseBool(value) {
  return value == "true" ? true : value == "false" ? false : null;
}

// Toggles help screen visibility
function toggleHelp() {
  helpOpen = !helpOpen;
  let msg = "H E L P - Controls<br><br>H = Toggle this screen<br>C = Clear game canvas tiles<br>E = Toggle tile selection<br>G = Generate new terrain<br>O or L = Load saved game canvas PNG<br>P = Toggle painting mode<br>R = Toggle random mode<br>S = Save game canvas PNG<br>Switch Tile = Arrow keys & scroll wheel";
  if(infoMsg.innerHTML !== msg) { infoMsg.innerHTML = msg; }
    
  infoDiv.style.display = ((helpOpen) ? "inherit" : "none");
  gameDiv.style.display = ((helpOpen) ? "none" : "inherit");
}

// Toggles tile selection screen on 'E' press or clicking on the active tile image
function toggleTileSelector() {
  tileChooserOpen = !tileChooserOpen;
  tileSelDiv.style.display = ((tileChooserOpen) ? "inherit" : "none");
  gameUIDiv.style.display = ((tileChooserOpen) ? "none" : "inherit");
}

// Tile selection on 'canvTileSel'
canvTileSel.addEventListener("mouseup", e => {
  if(e.button == 0) {
    //console.log(e);

    let absPos = getClickPos(e.x, e.y, canvTileSel);
    let pos = { 
      x: Math.floor((absPos.x / selCanvScale) / tileSize) * tileSize,
      y: Math.floor((absPos.y / selCanvScale) / tileSize) * tileSize
    }

    let index = (pos.y / tileSize) * (tilemap.width / tileSize) + (pos.x / tileSize);

    selIndex = index;
    updateSelection();
    toggleTileSelector();
  }
});

// Loading logic for a saved game canvas PNG
document.querySelector("#worldUpload").addEventListener("change", readData, true);
function readData() {
    var file = document.querySelector("#worldUpload").files[0];
    var reader = new FileReader();
    reader.onloadend = function() { // Data read!
      var image = new Image();
      image.onload = function() { // Image object created!
        // TODO Check image w & h etc.
        clearTiles();
        ctx.drawImage(image, 0, 0); // Draw loaded world image
      };
      image.src = reader.result;
      //console.log("Save file loaded!");
    }
    if(file && file.name.toLowerCase().endsWith(".png")) { reader.readAsDataURL(file); }
}



var Simple1DNoise = function() {
    var MAX_VERTICES = 256;
    var MAX_VERTICES_MASK = MAX_VERTICES -1;
    var amplitude = 1;
    var scale = 1;

    var r = [];

    for ( var i = 0; i < MAX_VERTICES; ++i ) {
        r.push(Math.random());
    }

    var getVal = function( x ){
        var scaledX = x * scale;
        var xFloor = Math.floor(scaledX);
        var t = scaledX - xFloor;
        var tRemapSmoothstep = t * t * ( 3 - 2 * t );

        /// Modulo using &
        var xMin = xFloor & MAX_VERTICES_MASK;
        var xMax = ( xMin + 1 ) & MAX_VERTICES_MASK;

        var y = lerp( r[ xMin ], r[ xMax ], tRemapSmoothstep );

        return y * amplitude;
    };

    /**
    * Linear interpolation function.
    * @param a The lower integer value
    * @param b The upper integer value
    * @param t The value between the two
    * @returns {number}
    */
    var lerp = function(a, b, t ) {
        return a * ( 1 - t ) + b * t;
    };

    // return the API
    return {
        getVal: getVal,
        setAmplitude: function(newAmplitude) {
            amplitude = newAmplitude;
        },
        setScale: function(newScale) {
            scale = newScale;
        }
    };
};
