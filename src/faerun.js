let Lore = require('lore-engine')

class Faerun {
    constructor(
        canvasId,
        scatterMeta = [],
        treeMeta = [],
        data = [],
        clearColorHex = "#222222",
        view = "front",
        hasLegend = true,
        antiAliasing = true,
        alphaBlending = false,
        thumbnailWidth = 250,
        legendTitle = "TMAP",
        coords = {
            show: false,
            grid: false,
            ticks: true,
            tickCount: 10,
            tickLength: 2.0,
            color: '#888888',
            box: false,
            offset: 5.0
        }
    ) {
        this.canvasId = canvasId;
        if (Faerun.isElement(this.canvasId)) {
            this.canvas = this.canvasId;
        } else {
            this.canvas = document.getElementById(this.canvasId);
        }
        this.canvasContainer = this.canvas.parentElement;
        this.body = document.getElementsByTagName('body')[0];
        this.selectedItems = [];
        this.selectedIndicators = [];
        this.selectedCurrent = [];
        this.scatterMeta = scatterMeta;
        this.treeMeta = treeMeta;
        this.data = data;
        this.seriesState = {};
        this.el = {};
        this.currentPoint = null;
        this.lore = null;
        this.clearColorHex = clearColorHex;
        this.clearColor = null;
        this.view = view;
        this.antiAliasing = antiAliasing;
        this.alphaBlending = alphaBlending;
        this.thumbnailWidth = thumbnailWidth;
        this.treeHelpers = [];
        this.pointHelpers = [];
        this.octreeHelpers = [];
        this.coordinatesHelper = null;
        this.ohIndexToPhName = [];
        this.ohIndexToPhIndex = [];
        this.phIndexToOhIndex = {};
        this.phIndexMap = {};
        this.ohIndexMap = {};
        this.min = [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE];
        this.max = [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE];
        this.maxRadius = -Number.MAX_VALUE;
        this.coords = coords;
        this.legend = {
            show: hasLegend,
            title: legendTitle
        };
        this.el = Faerun.bindElements();
        this.scatterMeta.forEach(s => {
            this.seriesState[s.name] = 0;
        });
        this.clearColor = Lore.Core.Color.fromHex(this.clearColorHex);
        this.alphaBlending = (this.view === 'free' ? false : true) || this.alphaBlending;
        this.initLore();
        this.initTreeHelpers();
        this.initPointHelpers();
        this.initCoords();
        this.initAxes();
        this.initView();
        this.initEvents();
        this.renderLegend();

        this.onVertexClickCallback = null;
        this.onVertexOverCallback = null;
        this.onVertexOutCallback = null;
        this.watchedVertices = {};
        this.zoomWatcher = null;
    }

    setZoom(zoom) {
        this.lore.controls.setZoom(zoom);
    }

    getZoom() {
        return this.lore.controls.getZoom();
    }

    zoomTo(indices, padding = 0.1, pointHelperIndex = 0) {
        if (indices.length < 2) {
            throw 'zoomTo() requires more than 1 vertex indices.';
        }

        let sum = [0.0, 0.0, 0.0];
        let min = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
        let max = [-Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];

        for (let index of indices) {
            let v = this.pointHelpers[pointHelperIndex].getPosition(index);
            let x = v.getX();
            let y = v.getY();
            let z = v.getZ();

            min[0] = Math.min(min[0], x);
            min[1] = Math.min(min[1], y);
            min[2] = Math.min(min[2], z);

            max[0] = Math.max(max[0], x);
            max[1] = Math.max(max[1], y);
            max[2] = Math.max(max[2], z);
        }

        let center = new Lore.Math.Vector3f(
            (max[0] + min[0]) / 2.0,
            (max[1] + min[1]) / 2.0,
            (max[2] + min[2]) / 2.0
        );

        this.lore.controls.setLookAt(center);
        this.lore.controls.zoomTo(max[0] - min[0], max[1] - min[1], padding);
    }

    zoomToFit(padding = 0, pointHelperIndex = 0) {
        let center = this.pointHelpers[pointHelperIndex].getCenter();
        let dims = this.pointHelpers[pointHelperIndex].getDimensions();

        this.lore.controls.setLookAt(center);
        this.lore.controls.zoomTo(
            dims.max.getX() - dims.min.getX(),
            dims.max.getY() - dims.min.getY(),
            padding
        );
    }

    getCanvasOffset() {
        let rect = this.canvas.getBoundingClientRect();
        return {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
        };
    }

    onVertexClick(callback) {
        this.onVertexClickCallback = callback;
    }

    onVertexOver(callback) {
        this.onVertexOverCallback = callback;
    }

    onVertexOut(callback) {
        this.onVertexOutCallback = callback;
    }

    selectVertex(index, octreeHelperIndex = 0) {
        this.octreeHelpers[octreeHelperIndex].addSelected(index);
    }

    deselectVertex(index, octreeHelperIndex = 0) {
        this.octreeHelpers[octreeHelperIndex].removeSelected(index);
    }

    deselectAllVertices(octreeHelperIndex = 0) {
        this.octreeHelpers[octreeHelperIndex].clearSelected();
        this.selectedItems = []
    }

    setVertexColor(index, color, pointHelperIndex = 0) {
        this.pointHelpers[pointHelperIndex].setColor(
            index,
            new Lore.Core.Color(
                color[0] / 255,
                color[1] / 255,
                color[2] / 255
            )
        );
    }

    getVertexColor(index, pointHelperIndex = 0) {
        return this.pointHelpers[pointHelperIndex].getColor(index);
    }

    watchVertices(name, indices, callback, pointHelperIndex = 0) {
        if (!this.watchedVertices.hasOwnProperty(pointHelperIndex))
            this.watchedVertices[pointHelperIndex] = {};

        this.watchedVertices[pointHelperIndex][name] = {
            indices: indices,
            callback: callback
        };

        // Trigger an update
        this.updateWatchedVertices();
    }

    unwatchVertices(name, pointHelperIndex = 0) {
        if (!this.watchedVertices.hasOwnProperty(pointHelperIndex))
            return

        delete this.watchedVertices[pointHelperIndex][name];
    }

    watchZoom(callback) {
        this.lore.controls.addEventListener('zoomchanged', callback);
    }

    snapshot(callback = null, size = 2) {
        let canvas = this.canvas;
        let zoom = this.lore.controls.getZoom();
        canvas.style.width = (canvas.width * size) + 'px';
        canvas.style.height = (canvas.height * size) + 'px';
        this.lore.controls.setZoom(zoom * size);
        setTimeout(() => {
            let blob = this.lore.canvas.toBlob(blob => {
                let a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.setAttribute('download', 'export.png');
                a.click();

                setTimeout(() => {
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    this.lore.controls.setZoom(zoom);
                    this.updateWatchedVertices();
                    if (callback) {
                        callback();
                    }
                }, 2000);
            });
        }, 2000);
    }

    initLore() {
        this.lore = Lore.init(this.canvasId, {
            antialiasing: this.antiAliasing,
            clearColor: this.clearColorHex,
            alphaBlending: this.alphaBlending,
            preserveDrawingBuffer: true
        });
    }
    initTreeHelpers() {
        this.treeMeta.forEach(t => {
            let th = new Lore.Helpers.TreeHelper(this.lore, t.name, 'tree');
            th.setXYZHexS(this.data[t.name].x, this.data[t.name].y, this.data[t.name].z, t.color);
            th.setFog([this.clearColor.components[0], this.clearColor.components[1],
            this.clearColor.components[2], this.clearColor.components[3]],
                t.fog_intensity);
            this.treeHelpers.push(th);
        });
    }
    initPointHelpers() {
        this.scatterMeta.forEach(s => {
            let ph = new Lore.Helpers.PointHelper(
                this.lore, s.name, s.shader, { maxPointSize: s.max_point_size }
            );

            let phIndex = this.pointHelpers.length;

            ph.setXYZRGBS(this.data[s.name].x, this.data[s.name].y, this.data[s.name].z,
                this.data[s.name]['colors'][0].r, this.data[s.name]['colors'][0].g,
                this.data[s.name]['colors'][0].b, this.data[s.name]['s'] ? this.data[s.name]['s'][0] : 1.0);
            ph.setPointScale(s.point_scale);
            ph.setFog([this.clearColor.components[0], this.clearColor.components[1],
            this.clearColor.components[2], this.clearColor.components[3]],
                s.fog_intensity)

            this.phIndexMap[s.name] = phIndex;
            this.pointHelpers.push(ph);
            this.min[0] = Faerun.getMin(this.data[s.name].x, this.min[0]);
            this.min[1] = Faerun.getMin(this.data[s.name].y, this.min[1]);
            this.min[2] = Faerun.getMin(this.data[s.name].z, this.min[2]);
            this.max[0] = Faerun.getMax(this.data[s.name].x, this.max[0]);
            this.max[1] = Faerun.getMax(this.data[s.name].y, this.max[1]);
            this.max[2] = Faerun.getMax(this.data[s.name].z, this.max[2]);
            this.maxRadius = ph.getMaxRadius();

            if (s.interactive) {
                this.octreeHelpers.push(
                    new Lore.Helpers.OctreeHelper(this.lore, 'Octree_' + s.name, 'tree', ph)
                );

                let ohIndex = this.octreeHelpers.length - 1;
                this.ohIndexMap[s.name] = ohIndex;
                this.ohIndexToPhName.push(s.name);
                this.ohIndexToPhIndex.push(this.phIndexMap[s.name]);
                this.phIndexToOhIndex[phIndex] = ohIndex;
            }
        });
    }
    initCoords() {
        if (!this.coords.show) return;
        let min = [0, 0, 0];
        let max = [0, 0, 0];
        for (var i = 0; i < 3; i++) {
            min[i] = this.min[i] - this.coords.offset;
            max[i] = this.max[i] + this.coords.offset;
        }
        this.coordinatesHelper = new Lore.Helpers.CoordinatesHelper(this.lore, 'Coordinates', 'coordinates', {
            position: new Lore.Math.Vector3f(min[0], min[1], min[2]),
            axis: {
                x: {
                    length: max[0] - min[0],
                    color: Lore.Core.Color.fromHex(this.coords.color)
                },
                y: {
                    length: max[1] - min[1],
                    color: Lore.Core.Color.fromHex(this.coords.color)
                },
                z: {
                    length: max[2] - min[2],
                    color: Lore.Core.Color.fromHex(this.coords.color)
                }
            },
            ticks: {
                enabled: this.coords.ticks,
                x: {
                    length: this.coords.tickLength,
                    color: Lore.Core.Color.fromHex(this.coords.color),
                    count: this.coords.tickCount
                },
                y: {
                    length: this.coords.tickLength,
                    color: Lore.Core.Color.fromHex(this.coords.color),
                    count: this.coords.tickCount
                },
                z: {
                    length: this.coords.tickLength,
                    color: Lore.Core.Color.fromHex(this.coords.color),
                    count: this.coords.tickCount
                }
            },
            box: {
                enabled: this.coords.box,
                x: {
                    color: Lore.Core.Color.fromHex(this.coords.color)
                },
                y: {
                    color: Lore.Core.Color.fromHex(this.coords.color)
                },
                z: {
                    color: Lore.Core.Color.fromHex(this.coords.color)
                }
            }
        });
    }
    initAxes() {
        // Wait for DOM to get ready
        setTimeout(() => {
            this.updateTitle(true);
            this.updateXAxis(true);
            this.updateYAxis(true);
        }, 500);
    }
    initView() {
        let center = new Lore.Math.Vector3f(
            (this.max[0] + this.min[0]) / 2.0,
            (this.max[1] + this.min[1]) / 2.0,
            (this.max[2] + this.min[2]) / 2.0
        );
        this.lore.controls.setLookAt(center);
        this.lore.controls.setRadius(this.maxRadius + 100);
        this.lore.controls.setView(0.9, -0.5)
        this.lore.controls.setViewByName(this.view);
    }
    initEvents() {
        this.lore.controls.addEventListener('updated', () => {
            // Update the position / content of the annotations every time
            // the view changes
            this.updateTitle();
            this.updateYAxis();
            this.updateXAxis();
            this.updateSelectedIndicators();
            this.updateWatchedVertices();
        });
        Lore.Helpers.OctreeHelper.joinHoveredChanged(this.octreeHelpers, e => {
            let phName = this.ohIndexToPhName[e.source];
            if (e.e) {
                let fullLabel = "";
                if (this.data[phName].labels)
                    fullLabel = this.data[phName].labels[e.e.index];

                let labelIndex = this.scatterMeta[this.ohIndexToPhIndex[e.source]]
                    .label_index[this.seriesState[phName]];
                let titleIndex = this.scatterMeta[this.ohIndexToPhIndex[e.source]]
                    .title_index[this.seriesState[phName]];
                let rgbColor = this.pointHelpers[e.source].getColor(e.e.index);
                let hexColor = Lore.Core.Color.rgbToHex(rgbColor[0], rgbColor[1], rgbColor[2]);
                this.currentPoint = {
                    index: e.e.index,
                    fullLabel: fullLabel.split('__'),
                    source: phName,
                    label: fullLabel.split('__')[labelIndex],
                    color: hexColor,
                    labelIndex: labelIndex,
                    titleIndex: titleIndex
                }

                let pointSize = this.pointHelpers[e.source].getPointSize() / window.devicePixelRatio;
                let x = e.e.screenPosition[0];
                let y = e.e.screenPosition[1];

                if (this.el.hoverIndicator) {
                    this.el.hoverIndicator.style.width = pointSize + 'px';
                    this.el.hoverIndicator.style.height = pointSize + 'px';
                    this.el.hoverIndicator.style.left = (x - pointSize / 2.0 - 1) + 'px';
                    this.el.hoverIndicator.style.top = (y - pointSize / 2.0 - 1) + 'px';
                    this.el.hoverIndicator.classList.add('show');
                }

                if (this.onVertexOverCallback)
                    this.onVertexOverCallback({
                        x: x, y: y, index: e.e.index,
                        color: [rgbColor[0], rgbColor[1], rgbColor[2]]
                    });
            } else {
                this.currentPoint = null;

                if (this.el.hoverIndicator) {
                    this.el.hoverIndicator.classList.remove('show');
                }

                if (this.onVertexOutCallback)
                    this.onVertexOutCallback();
            }
        });
        Lore.Helpers.OctreeHelper.joinSelectedChanged(this.octreeHelpers, items => {
            this.selectedItems = items;
            this.updateSelected();

            if (this.onVertexClickCallback && items.length > 0) {
                let lastItem = items[items.length - 1].item;

                this.onVertexClickCallback({
                    x: lastItem.screenPosition[0],
                    y: lastItem.screenPosition[1],
                    index: lastItem.index,
                    color: lastItem.color
                });
            }
        });

        Lore.Helpers.OctreeHelper.joinReselected(this.octreeHelpers, item => {
            let selectedIndex = this.getSelectedIndex(item[0].source, item[0].item.e.index)
            this.updateSelected(selectedIndex);

            if (this.onVertexClickCallback) {
                let lastItem = this.selectedItems[selectedIndex].item;

                this.onVertexClickCallback({
                    x: lastItem.screenPosition[0],
                    y: lastItem.screenPosition[1],
                    index: lastItem.index,
                    color: lastItem.color
                });
            }
        });

        document.addEventListener('dblclick', e => {
            if (this.currentPoint) {
                var index = this.currentPoint.index;
                var labels = this.currentPoint.label.split('__');
                var source = this.currentPoint.source;
                eval(this.scatterMeta[this.phIndexMap[source]].ondblclick[this.seriesState[source]]);
            }
        });

        if (this.el.showControls) {
            this.el.showControls.addEventListener('click', e => {
                this.el.moreControls.classList.toggle('hide');
                e.preventDefault();
                return false;
            });
        }

        if (this.el.search) {
            this.el.search.addEventListener('click', e => {
                let searchTerm = prompt('Please enter a search term:', '');
                const results = this.search(searchTerm);
                for (const [name, indices] of Object.entries(results)) {
                    if (!name in this.ohIndexMap) return;
                    indices.forEach(index => {
                        this.octreeHelpers[this.ohIndexMap[name]].addSelected(index);
                    });
                }

                e.preventDefault();
                return false;
            });
        }
        window.addEventListener('keydown', e => {
            if ((e.keyCode == 114) || (e.ctrlKey && e.keyCode == 70)) {
                this.search();
                e.preventDefault();
                return false;
            }
        });
        if (this.el.export) {
            this.el.export.addEventListener('click', e => {
                e.preventDefault();
                this.snapshot();
            });
        }
        if (this.el.download) {
            this.el.download.addEventListener('click', e => {
                e.preventDefault();
                let text = ''
                this.selectedItems.forEach(item => {
                    let phIndex = this.ohIndexToPhIndex[item.source];
                    let meta = this.scatterMeta[phIndex];
                    let phName = this.ohIndexToPhName[item.source];
                    let seriesState = this.seriesState[phName];
                    let fullLabel = this.data[phName].labels[item.item.index].split('__');
                    let labelIndex = meta.label_index[seriesState];
                    let titleIndex = meta.title_index[seriesState];
                    let selectedLabels = meta.selected_labels[seriesState];
                    fullLabel.forEach((l, i) => {
                        text += l + ';'
                    });
                    text = text.slice(0, -1);
                    text += '\n';
                });
                var a = document.createElement('a');
                a.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                a.setAttribute('download', 'faerun_list.csv');
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                return false;
            });
        }
    }
    setSelectedContent(fullLabel, labelIndex, selectedLabels, img) {
        if (this.el.selectedContainer) {
            this.el.selectedContainer.innerHTML = '';
            if (img)
                this.el.selectedContainer.appendChild(img);
            fullLabel.forEach((l, i) => {
                if (i === labelIndex) return;
                if (selectedLabels && selectedLabels[i]) {
                    this.el.selectedContainer.appendChild(
                        Faerun.createElement('div', { classes: 'label', content: selectedLabels[i] })
                    );
                }
                this.el.selectedContainer.appendChild(
                    Faerun.createElement('div', { classes: 'content', content: l })
                );
            });
        }
        // Update the indicator
        this.updateSelectedIndicators();
    }
    renderLegend() {
        if (!this.legend.show) return;

        let legend = document.getElementById('legend');

        if (legend) this.body.removeChild(legend);
        legend = Faerun.createElement('div', { id: 'legend' });
        this.body.appendChild(legend)

        if (this.legend.title && this.legend.title !== '')
            legend.appendChild(Faerun.createElement('h2', { content: '{{legend_title}}' }));

        let container = Faerun.createElement('div', { classes: 'container' });
        legend.appendChild(container);
        this.scatterMeta.forEach(s => {
            let index = this.seriesState[s.name];
            if (s.has_legend) {
                let legendSection = []
                if (!s.is_range[index]) {
                    s.legend[index].forEach(v => {
                        legendSection.push(Faerun.createElement('div', { classes: 'legend-element' }, [
                            Faerun.createColorBox(v[0]),
                            Faerun.createElement('div', { classes: 'legend-label', content: v[1] }),
                        ]))
                    })
                } else {
                    legendSection.push(Faerun.createElement('div', { classes: 'legend-element-range' }, [
                        ...Faerun.createColorScale(s.legend[index]),
                        Faerun.createElement('div', {
                            classes: 'legend-label max',
                            content: s.max_legend_label[index]
                        }),
                        Faerun.createElement('div', {
                            classes: 'legend-label min',
                            content: s.min_legend_label[index]
                        })
                    ]))
                }
                let series = [];
                for (var i = 0; i < s.series_title.length; i++) {
                    series.push(
                        Faerun.createElement('option', {
                            value: i,
                            content: s.series_title[i],
                            selected: i === index
                        })
                    );
                }
                let sectionHeader = Faerun.createElement(
                    'h3', { content: s.legend_title[index] }
                );
                sectionHeader.addEventListener('click', e => {
                    this.toggleLegendSection(s.name);
                });
                let seriesSelector = Faerun.createElement(
                    'select',
                    {
                        id: `select-${s.name}`,
                        classes: 'series-selector',
                        'data-name': s.name,
                        hidden: s.series_title.length < 2,
                    },
                    [...series]
                );
                seriesSelector.addEventListener('change', e => {
                    let value = document.getElementById(`select-${s.name}`).value;
                    this.changeSeries(value, s.name);
                });
                container.appendChild(
                    Faerun.createElement(
                        'div', {
                        id: `legend-${s.name}`,
                        classes: 'legend-section',
                        'data-name': `${s.name}`
                    },
                        [sectionHeader, seriesSelector, ...legendSection]
                    )
                );
            }
        });
    }
    toggleLegendSection(name) {
        let section = document.getElementById('legend-' + name);
        let geometry = this.pointHelpers[this.phIndexMap[name]].geometry;
        let isVisible = geometry.isVisible;
        if (isVisible) {
            geometry.hide();
            section.style.opacity = 0.5;
        } else {
            geometry.show();
            section.style.opacity = 1.0;
        }
    }
    getSelectedIndex(source, index) {
        let selectedIndex = null;
        this.selectedItems.forEach((item, i) => {
            if (item.source == source && item.item.index == index) {
                selectedIndex = i;
                return;
            }
        });
        return selectedIndex;
    }
    updateSelected(current = -1) {
        let n = this.selectedItems.length
        // Hide the container if no items are selected
        if (this.el.selected) {
            if (n === 0) {
                this.el.selected.style.display = 'none';
                return;
            } else {
                this.el.selected.style.display = 'block';
            }
        }
        if (current < 0) current = n - 1;
        if (current >= n) current = 0;

        // Remove all indicators
        this.selectedIndicators.forEach(indicator => {
            indicator.element.parentElement.removeChild(indicator.element);
        });

        this.selectedIndicators.length = 0;

        if (this.selectedItems.length == 0) {
            return;
        }

        this.selectedCurrent = current;
        let item = this.selectedItems[current];
        let phIndex = this.ohIndexToPhIndex[item.source];
        let meta = this.scatterMeta[phIndex];
        let phName = this.ohIndexToPhName[item.source];
        let seriesState = this.seriesState[phName];
        let fullLabel = "";
        if (this.data[phName].labels)
            this.data[phName].labels[item.item.index].split('__');
        let labelIndex = meta.label_index[seriesState];
        let titleIndex = meta.title_index[seriesState];
        let selectedLabels = meta.selected_labels[seriesState];


        // Add the indicator for this object
        let indicatorElement = Faerun.createElement(
            'div',
            { classes: 'selected-indicator' },
            [
                Faerun.createElement('div', { classes: 'crosshair-x' }),
                Faerun.createElement('div', { classes: 'crosshair-y' })
            ]
        );
        this.canvasContainer.appendChild(indicatorElement);
        this.selectedIndicators.push({
            element: indicatorElement,
            index: item.item.index,
            ohIndex: item.source,
            phIndex: phIndex
        });
        this.updateSelectedIndicators();
    }
    updateSelectedIndicators() {
        this.selectedIndicators.forEach(indicator => {
            let pointSize = this.pointHelpers[indicator.phIndex].getPointSize();
            let screenPosition = this.octreeHelpers[indicator.ohIndex]
                .getScreenPosition(indicator.index);

            // Make the crosshairs larger than the point
            pointSize = Faerun.getMax([pointSize / window.devicePixelRatio, 10 / window.devicePixelRatio]);
            pointSize *= 1.25;
            let halfPointSize = pointSize / 2.0;
            indicator.element.style.left = (screenPosition[0] - halfPointSize) + 'px';
            indicator.element.style.top = (screenPosition[1] - halfPointSize) + 'px';
            indicator.element.style.width = pointSize + 'px';
            indicator.element.style.height = pointSize + 'px';
        });
    }

    updateWatchedVertices() {
        for (let pointHelperIndex in this.watchedVertices) {
            let pointSize = this.pointHelpers[pointHelperIndex].getPointSize();
            let ohIndex = this.phIndexToOhIndex[pointHelperIndex];

            for (let name in this.watchedVertices[pointHelperIndex]) {
                let watcher = this.watchedVertices[pointHelperIndex][name];

                let callbackData = [];

                for (let j = 0; j < watcher.indices.length; j++) {
                    let vertex = watcher.indices[j];
                    let screenPosition = this.octreeHelpers[ohIndex]
                        .getScreenPosition(vertex);

                    callbackData.push({
                        x: screenPosition[0],
                        y: screenPosition[1],
                        index: vertex,
                        color: this.getVertexColor(vertex, pointHelperIndex)
                    });
                }

                if (watcher.callback) {
                    watcher.callback(callbackData);
                }
            }
        }
    }

    updateTitle(first = false) {
        if (this.el.title === undefined) return;
        let bb = this.el.title.getBoundingClientRect();
        let scenePosition = new Lore.Math.Vector3f(
            (this.min[0] + this.min[0]) / 2.0, this.min[1],
            (this.min[2] + this.min[2]) / 2.0
        );
        let screenPosition = this.lore.controls.camera.sceneToScreen(scenePosition, this.lore);

        this.el.title.style.left = (screenPosition[0] - (bb.width / 2.0)) + 'px';
        this.el.title.style.top = (screenPosition[1] - bb.height) + 'px';
        if (first) this.el.title.classList.add('show');
    }
    updateXAxis(first = false) {
        if (this.el.xAxis === undefined) return;

        let bb = this.el.xAxis.getBoundingClientRect();
        let scenePosition = new Lore.Math.Vector3f(
            (this.min[0] + this.min[0]) / 2.0, this.min[1],
            (this.min[2] + this.min[2]) / 2.0
        );
        let screenPosition = this.lore.controls.camera.sceneToScreen(scenePosition, this.lore);

        this.el.xAxis.style.left = (screenPosition[0] - (bb.width / 2.0)) + 'px';
        this.el.xAxis.style.top = (screenPosition[1]) + 'px';
        if (first) this.el.xAxis.classList.add('show');
    }
    updateYAxis(first = false) {
        if (this.el.yAxis === undefined) return;

        let bb = this.el.yAxis.getBoundingClientRect();
        let scenePosition = new Lore.Math.Vector3f(
            this.min[0], (this.min[1] + this.min[1]) / 2.0,
            (this.min[2] + this.min[2]) / 2.0
        );

        let screenPosition = this.lore.controls.camera.sceneToScreen(scenePosition, this.lore);

        this.el.yAxis.style.left = (screenPosition[0] - bb.height) + 'px';
        this.el.yAxis.style.top = (screenPosition[1] - bb.width / 2.0) + 'px';
        if (first) this.el.yAxis.classList.add('show');
    }
    changeSeries(value, name) {
        value = parseInt(value);
        this.seriesState[name] = value;
        this.renderLegend();
        this.pointHelpers[this.phIndexMap[name]].setRGBFromArrays(
            this.data[name]['colors'][value].r,
            this.data[name]['colors'][value].g,
            this.data[name]['colors'][value].b
        );
        if (this.data[name]['s']) {
            if (this.data[name]['s'][value]) {
                this.pointHelpers[this.phIndexMap[name]].setSize(
                    this.data[name]['s'][value]
                );
            } else {
                this.pointHelpers[this.phIndexMap[name]].setSize(1.0);
            }
        }
    }
    search(term) {
        let results = {}
        let re = new RegExp(term, 'i');
        Object.keys(this.data).forEach(name => {
            if (!('labels' in this.data[name])) return;
            results[name] = []
            this.data[name]['labels'].forEach((label, i) => {
                if (re.test(label))
                    results[name].push(i)
            });
        });
        return results;
    }

    static createColorBox(value) {
        return Faerun.createElement(
            'div',
            {
                classes: 'color-box',
                style: `background-color: rgba(${value[0] * 255}, ${value[1] * 255}, ${value[2] * 255}, ${value[3]});
                  border-color: rgba(${value[0] * 255}, ${value[1] * 255}, ${value[2] * 255}, ${value[3]})`
            }
        );
    }
    static createColorScale(values) {
        let scale = [];
        values.forEach(value => {
            scale.push(
                Faerun.createElement(
                    'div',
                    {
                        classes: 'color-stripe',
                        style: `background-color: rgba(${value[0][0] * 255}, ${value[0][1] * 255}, ${value[0][2] * 255}, ${value[0][3]});
                      border-color: rgba(${value[0][0] * 255}, ${value[0][1] * 255}, ${value[0][2] * 255}, ${value[0][3]})`,
                        alt: value[1]
                    }
                ),
            )
        });
        return scale;
    }

    static isElement(obj) {
        return obj instanceof Element;
    }

    static createElement(tag, values = {}, children = []) {
        let element = document.createElement(tag);
        for (const key of Object.keys(values)) {
            if (key === 'classes')
                element.classList.add(...values[key].split(' '));
            else if (key === 'content')
                element.innerHTML = values[key];
            else if (key === 'hidden') {
                if (values[key])
                    element.setAttribute('hidden', true);
            }
            else if (key === 'selected') {
                if (values[key])
                    element.setAttribute('selected', true);
            }
            else
                element.setAttribute(key, values[key]);
        }
        if (children) {
            if (Array.isArray(children)) {
                children.forEach(child => {
                    element.appendChild(child);
                })
            } else {
                element.appendChild(children);
            }
        }
        return element;
    }
    static bindElements() {
        let result = {};
        document.querySelectorAll('[data-tmap]').forEach(e => {
            result[e.getAttribute('data-tmap')] = e;
        });
        return result;
    }
    static getMin(arr, other = Number.MAX_VALUE) {
        let m = Number.MAX_VALUE;
        for (var i = 0; i < arr.length; i++)
            if (arr[i] < m) m = arr[i];

        if (m < other) return m;
        return other;
    }
    static getMax(arr, other = -Number.MAX_VALUE) {
        let m = -Number.MAX_VALUE;
        for (var i = 0; i < arr.length; i++)
            if (arr[i] > m) m = arr[i];

        if (m > other) return m;
        return other;
    }

    static hexToRgb(hexValue) {
        return Lore.Core.Color.fromHex(hexValue);
    }
}

module.exports = Faerun
