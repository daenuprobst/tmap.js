Faerun = require('./faerun.js');

class TMAP {
    constructor(
        canvasId, 
        vertexCoordinates, 
        edgeCoordinates, 
        colors,
        labels = null,
        backgroundColor = "#222222",
        treeColor = "#4a69bd",
        maxPointSize = 20,
        pointScale = 5,
        hasLegend = false,
    ) {
        this.originalVertexColors = {};

        this.canvasId = canvasId;
        
        this.scatterMeta = [{
            "categorical": [true],
            "fog_intensity": 0.0,
            "has_legend": hasLegend,
            "interactive": true,
            "is_range": [false],
            "label_index": [0],
            "mapping": {
                "c": "c",
                "cs": "cs",
                "knn": "knn",
                "labels": "labels",
                "s": "s",
                "x": "x",
                "y": "y",
                "z": "z"
            },
            "max_c": [1.0],
            "max_legend_label": ["1.00"],
            "max_point_size": maxPointSize,
            "min_c": [0.0],
            "min_legend_label": ["0.00"],
            "name": "DATA",
            "ondblclick": [null],
            "point_scale": pointScale,
            "selected_labels": [null],
            "series_title": [null],
            "shader": "smoothCircle",
            "title_index": [1]
        }];

        this.treeMeta = [{
            "color": treeColor,
            "fog_intensity": 0.0,
            "mapping": {
                "c": "c",
                "from": "from",
                "to": "to",
                "x": "x",
                "y": "y",
                "z": "z"
            },
            "name": "DATA_tree",
            "point_helper": "DATA"
        }];

        
        const data = {
            DATA: {
                x: vertexCoordinates.x,
                y: vertexCoordinates.y,
                z: vertexCoordinates.z,
                labels: labels,
                colors: [
                    {
                        r: colors.r,
                        g: colors.g,
                        b: colors.b
                    }
                ]
            },
            DATA_tree: {
                x: edgeCoordinates.x,
                y: edgeCoordinates.y,
                z: edgeCoordinates.z
            }
        }

        this.faerun = new Faerun(
            canvasId, this.scatterMeta, this.treeMeta, 
            data, backgroundColor, hasLegend
        );
    }

    setZoom(zoom) {
        this.faerun.setZoom(zoom);
    }

    zoomTo(indices) {
        this.faerun.zoomTo(indices);
    }

    resetZoom() {
        this.faerun.setZoom(1.0);
    }

    snapshot(size = 2.0) {
        this.faerun.snapshot(size);
    }

    setVertexColor(index, color, backup = true) {
        if (backup && !this.originalVertexColors.hasOwnProperty(index)) {
            this.originalVertexColors[index] = this.faerun.getVertexColor(index);
        }

        this.faerun.setVertexColor(index, color);
    }

    resetVertexColors() {
        for (let key in this.originalVertexColors) {
            this.setVertexColor(
                key,
                this.originalVertexColors[key],
                false
            );
        }

        this.originalVertexColors = {};
    }

    selectVertex(index) {
        this.faerun.selectVertex(index);
    }

    deselectVertex(index) {
        this.faerun.deselectVertex(index);
    }

    deselectAllVertices() {
        this.faerun.deselectAllVertices();
    }

    onVertexClick(callback) {
        this.faerun.onVertexClick(callback);
    }

    onVertexOver(callback) {
        this.faerun.onVertexOver(callback);
    }

    onVertexOut(callback) {
        this.faerun.onVertexOut(callback);
    }

    addWatcher(name, indices, callback) {
        this.faerun.watchVertices(name, indices, callback);
    }

    removeWatcher(name) {
        this.faerun.unwatchVertices(name);
    }
}

module.exports = TMAP