
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

tmap.addWatcher("test", [0, 1], e => {
    console.log(e);
});