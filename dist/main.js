// const vertexCoordinates = {
//     x: [0, 100, 600, 700],
//     y: [0, 100, 600, 700],
//     z: [0, 0, 0, 0]
// };

// const edgeCoordinates = {
//     x: [0, 100, 100, 600, 600, 700],
//     y: [0, 100, 100, 600, 600, 700],
//     z: [0, 0, 0, 0, 0, 0]
// };

// const colors = {
//     r: [255, 0, 255, 0],
//     g: [0, 255, 255, 0],
//     b: [0, 255, 255, 255]
// };


vertexCoordinates = { x: [], y: [], z: [] }
edgeCoordinates = { x: [], y: [], z: [] }
colors = { r: [], g: [], b: [] }

for (i = 0; i < 2000; i++) {
    angle = 0.1 * i;
    x = (1 + angle) * Math.cos(angle);
    y = (1 + angle) * Math.sin(angle);

    vertexCoordinates.x.push(x);
    vertexCoordinates.y.push(y);
    vertexCoordinates.z.push(0);

    colors.r.push(255);
    colors.g.push(255);
    colors.b.push(255);
}

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

tmap.setVertexColor(719, [255, 0, 0])
tmap.setVertexColor(656, [255, 0, 0])
tmap.setVertexColor(1964, [255, 0, 0])

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

tmap.watchZoom(zoom => {
    console.log("Zoom changed.", zoom);
})