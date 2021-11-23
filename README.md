# tmap.js
A javascript API to easily display TMAPs


## Dev notes
```bash
npm install
```

Assuming you don't have browserify and uglifyjs installed yet, run
```bash
npm install -g browserify uglify-js
```

To test the module in a browser:
```bash
browserify index.js --standalone TMAP -o dist/tmap.js
```

Minify using uglify-js:
```bash
uglifyjs dist/tmap.js -o dist/tmap.min.js
```

### API
The signature of the TMAP constructor is:
```javascript
let tmap = TMAP(
    canvasId, // ID of target canvas (without "#")
    vertexCoordinates, // An object: { x: [...], y: [...], z: [...] }
    edgeCoordinates, // An object: { x: [...], y: [...], z: [...] }
    colors,// An object: { r: [...], g: [...], b: [...] }
    labels = null, // An array of labels: [ "A", "B", ... ]
    backgroundColor = "#222222", // The clear color of the canvas
    treeColor = "#4a69bd", // The color of the tree lines
    maxPointSize = 20, // The maximum size of points when zooming in
    pointScale = 5 // The base-size of the points
    hasLegend = false // Whether or not to render the built-in legend
)
```
The TMAP will be drawn upon initialization.

#### Callbacks

TMAP has three methods accepting callbacks, `onVertexOver`, `onVertexClick`, and `onVertexOut`. All three take a (callback) function as an argument. An example of the object supplied to the callback passed to `onVertexOver` is: 
```javascript
{ x: 315.2, y: 584, index: 0, color: [ 255, 0, 0 ] }
```
The `onVertexClick` object contains the same information:
```javascript
{ x: 315.2, y: 584, index: 0, color: [ 255, 0, 0 ] }
```
In both cases, `x` and `y` are the vertex's 3D coordinates projected to screen space and `index` is the array index of the vertex, and `color` is an rgb array (0-255).

In addition, there is the `onVertexOut` callback, which does not supply an object to the callback function and is called when the mouse exits any hovered vertex.

### Methods

Aside from the methods accepting callback functions, the methods of the `TMAP` class are:
```javascript
setZoom(zoom)
```
where `zoom` can be any float / double value. The default zoom is `1.0` and values below zoom out while values above zoom in.
```javascript
resetZoom()
```
Analogous to `setZoom(1.0)`.
```javascript
snapshot(size = 2.0)
```
This methods takes a screenshot of the canvas and begins the download process in the browser. It takes an argument (`size`) which scales the canvas before the it's buffer is copied to a png to enable higher-resolution screenshots. The default value is `2.0`. Higher values may crash browser tabs.
```javascript
selectVertex(index)
```
Select the vertex with index `index`.
<!--```javascript
deselectVertex(index)
```
Deselect the vertex with index `index`.
```javascript
deselectAllVertices()
```
Deselects all currently selected vertices. -->
```javascript
setVertexColor(index, color)
```
Sets the vertex with index `index` to `color` where `color` is an array of rgb colours (`0`-`255`).
```javascript
resetVertexColors()
```
Resets all color values to their originals.
```javascript
addWatcher(name, indices, callback)
```
Callback receives an array of screen positions, indices and colours (e.g. `[{ x: 315.2, y: 584, index: 0, color: [ 255, 0, 0 ] }, ...]`) when the position of the vertices changes. `name` is an arbitrary name for this watcher and `indices` is an array containing the indices of the vertices to be watched.
```javascript
removeWatcher(name)
```
Remove the watcher with name `name`.

### Example
See an example below (can also be found in `dist`)
```javascript

const vertexCoordinates = {
    x: [0, 100],
    y: [0, 100],
    z: [0, 100]
};

const edgeCoordinates = {
    x: [0, 100],
    y: [0, 100],
    z: [0, 100]
};

const colors = {
    r: [255, 0],
    g: [0, 255],
    b: [0, 255]
};

const labels = [
    "A1", "B2"
];

tmap = new TMAP(
    "tmapCanvas",
    vertexCoordinates,
    edgeCoordinates,
    colors,
    null
);

tmap.onVertexOver(e => {
    console.log(e);
});

tmap.onVertexOut(() => {
    console.log("No vertex hovered.");
});

tmap.onVertexClick(e => {
    console.log(e);
});
```
