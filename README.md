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
)
```
The TMAP will be drawn upon initialization.

#### Callbacks

TMAP has two methods accepting callbacks, `onNodeOver` and `onNodeClick`. Both take a (callback) function as an argument. An example of the object supplied to the callback passed to `onNodeOver` is: 
```javascript
{ x: 315.2, y: 584, index: 0 }
```
The `onNodeClick` object contains information about the node color in addition to the on screen coordinates and the index:
```javascript
{ x: 315.2, y: 584, index: 0, color: [ 255, 0, 0 ] }
```
In both cases, `x` and `y` are the vertex's 3D coordinates projected to screen space and `index` is the array index of the vertex.

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

tmap = new TMAP(
    "tmapCanvas",
    vertexCoordinates,
    edgeCoordinates,
    colors
);

tmap.onVertexOver(e => {
    console.log(e)
});

tmap.onVertexClick(e => {
    console.log(e)
})
```
