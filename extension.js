const {Clutter, GObject, Meta, Shell, St} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const farey_sequence = Me.imports.farey_sequence;
const Main = imports.ui.main;

const Tile = GObject.registerClass(
    class Tile extends St.BoxLayout {
        _init(area, name) {
            super._init({
                style_class: 'tile',
                x: area.x,
                y: area.y,
                width: area.width,
                height: area.height,
            })

            const label = new St.Label({
                style_class: 'name',
                text: name.toUpperCase(),
                x_expand: true,
                y_align: Clutter.ActorAlign.CENTER,
            });
            this.add_child(label);
        }
    }
);

const getWorkAreaForMonitor = function(monitor) {
    return global.workspace_manager
        .get_active_workspace()
        .get_work_area_for_monitor(monitor);
}

class WindowState {
    constructor() {
	this._windows = {};
	this._cols = 3;
	this._rows = 3;
	this._min_factor = 1 / this._cols;
    }
    
    // gnome window
    _add(window) {
	const area = window.get_frame_rect();
	this._windows[window] = {
		initial: { x: area.x, y: area.y, height: area.height, width: area.width },
		tiled: { x: area.x, y: area.y, height: area.height, width: area.width },
		dimension_cycle: 1,
		grid: {col: Math.floor(this._cols / 2), row: 1},
	}
    }

    // gnome window
    print(_window) {
	let window = this.get(_window);
	log("print(window)");
	log("monitor " + _window.get_monitor());
        farey_sequence.dir("workarea ", getWorkAreaForMonitor(_window.get_monitor()).x);
	farey_sequence.dir("initial ", window.initial);
	farey_sequence.dir("tiled ", window.tiled);
	farey_sequence.dir("dimension_cycle ", window.dimension_cycle);
	farey_sequence.dir("grid ", window.grid);
    }

    get(window_) {
	let window = null;
	window = this._windows[window_];
	if (!window) {
	    this._add(window_);
	    window = this._windows[window_];
	}
	return window;
    }

    // gnome window
    tile(_window, deltax, deltay) {
        let window = this.get(_window);

	// calc new grid position
	const col = window.grid.col + deltax;
	if (0 <= col && col < this._cols) {
	    window.grid.col = col;
	    this._swishx(_window);
	} else {
	    this._cycle_dimension(_window);
	}
	const row = window.grid.row + deltay;
	if (0 <= row && row < this._rows) {
	    window.grid.row = row;
	    this._swishy(_window);
	} else {
	    this._cycle_dimension(_window);
	}

    }
    
    // gnome window
    _swishx(activeWindow) {
	let window = this.get(activeWindow);
        const monitor = activeWindow.get_monitor();
        const workarea = getWorkAreaForMonitor(monitor);
	window.tiled.x = workarea.x + Math.floor(window.grid.col * this._min_factor * workarea.width);
	log("_swish");
	//log(window.grid.col);
	//log(window.tiled.x);
    }

    // gnome window
    _swishy(activeWindow) {
    }

    // gnome window
    _cycle_dimension(activeWindow) {
	let window = this.get(activeWindow);
        const monitor = activeWindow.get_monitor();
        const workarea = getWorkAreaForMonitor(monitor);
	window.dimension_cycle = (window.dimension_cycle + 1) % (this._cols + 1); // cycle [1..max] cols
	const factor = farey_sequence.farey_indexed(this._cols, window.dimension_cycle);

	window.tiled.width = Math.floor(workarea.width * factor);
	window.tiled.height = workarea.height;
	log("%s == %s -> %s",window.grid.col, this._cols, (this._cols - 1));
	if (window.grid.col == (this._cols - 1)) {
	    window.tiled.x = workarea.x + workarea.width - window.tiled.width;
	} else {
	    log("!==");
	    window.tiled.x = workarea.x + Math.floor(window.grid.col * workarea.width * this._min_factor);
	}
	window.tiled.y = workarea.y,

	log("_cycle_dimension");
	//log(window.dimension_cycle);
	//log(factor);
	//log(workarea.x);
	//log(workarea.y);
	//log(workarea.width * factor);
	//log(workarea.height);
    }

    shrink_to_workarea(activeWindow) {
	let window = this.get(activeWindow);
        const monitor = activeWindow.get_monitor();
        const workarea = getWorkAreaForMonitor(monitor);
	window.tiled.x = Math.max(window.tiled.x, workarea.x);
	window.tiled.y = Math.max(window.tiled.y, workarea.y);
	if (workarea.x + workarea.width < window.tiled.x + window.tiled.width) {
	    window.tiled.width = workarea.x + workarea.width - window.tiled.x
	}
	if (workarea.y + workarea.height < window.tiled.y + window.tiled.height) {
	    window.tiled.height = workarea.y + workarea.height - window.tiled.y
	}
	
    }
}

class Extension {
    constructor() {
        this._settings = null;
        this._tiles = [];
        this._window = null;
        this._monitor = null;
        this._tile = null;
        this._date = null;

	// tiling state
	this._dimension_cycle = 1;
	this._smartx = 1;
	this._smarty = 1;
	this._windowState = new WindowState();
    }

    enable() {
        this._settings = ExtensionUtils.getSettings();
        this.bindKey('ctile-left', () => this.tile_direction(-1, 0));
        this.bindKey('ctile-right', () => this.tile_direction(1, 0));
	      this.bindKey('ctile-up', () => this.tile_direction(0, 1));
        this.bindKey('ctile-down', () => this.tile_direction(0, -1));
        this.bindKey('ctile-switch-monitor', () => this.cycle_monitors());
    }

    disable() {
        // In case the extension is disabled while tiles are shown
        this.onHideTiles();

        this.unbindKey('ctile-left');
        this.unbindKey('ctile-right');
        this.unbindKey('ctile-up');
        this.unbindKey('ctile-down');
        this.unbindKey('ctile-switch-monitor');
        this._settings = null;
    }

    bindKey(key, callback) {
        Main.wm.addKeybinding(key, this._settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT, Shell.ActionMode.NORMAL, callback);
    }

    unbindKey(key) {
        Main.wm.removeKeybinding(key);
    }

    cycle_monitors() {
	let activeWindow = this.getActiveWindow();
        if (!activeWindow) {
            log('No active window');
            return;
        }
	log("cycle_monitors");
        const monitor = activeWindow.get_monitor();
	const count = this.getNumMonitors();
	const next_monitor = (monitor + 1) % count;
	activeWindow.move_to_monitor(next_monitor);
    }

    tile_direction(deltax, deltay) {
	let activeWindow = this.getActiveWindow();
        if (!activeWindow) {
            log('No active window');
            return;
        }
	this._windowState.tile(activeWindow, deltax, deltay);
	this._windowState.print(activeWindow);
	this._windowState.shrink_to_workarea(activeWindow);
	let window = this._windowState.get(activeWindow);
	this.moveWindow(activeWindow, window.tiled);
    }

    doSmth() {
	let activeWindow = this.getActiveWindow();
        if (!activeWindow) {
            log('No active window');
            return;
        }
	log("window width: " + activeWindow.get_frame_rect().width);
	let state = this._windowState.get(activeWindow);
	log("initial width: " + state.initial.width);

        const monitor = activeWindow.get_monitor();
        const workarea = this.getWorkAreaForMonitor(monitor);
	const cols = 3;
	this._counter = (this._counter + 1) % (cols + 1); // cycle [1..max] cols
	const factor = farey_sequence.farey_indexed(cols, this._counter);
	let area = { 
	    x: workarea.x, 
	    y: workarea.y, 
	    width: Math.floor(workarea.width * factor), 
	    height: workarea.height
	};
	log(factor);
	log(workarea.x);
	log(workarea.y);
	log(workarea.width * factor);
	log(workarea.height);
	this.moveWindow(activeWindow, area);
    }

    onShowTiles() {
	log("onShowTiles()");
	//this.doSmth();
	this.tile_direction(-1, 0);
	return;
        if (this._tiles.length > 0) {
            this.discardTiles();
        } else {
            this.displayTiles(null);
        }
    }

    onHideTiles() {
        if (this._tiles.length > 0) {
            this.discardTiles();
        }
    }

    onActivateTile(tile) {
        const lastTile = this._tile;
        const lastDate = this._date;

        // Assume this is the first tile if more than one second of inactivity
        if (lastDate == null || lastDate + 1000 < Date.now()) {
            this._tile = tile;
            this._date = Date.now();
            return;
        }
        // Once two tiles are activated, move the window
        this.moveWindow(this._window, this.combineAreas(lastTile.area, tile.area));
        this.discardTiles();

        this._tile = null;
        this._date = null;
    }

    onNextMonitor() {
        if (this._monitor != null) {
            const nextMonitor = (this._monitor + 1) % this.getNumMonitors();
            this.discardTiles();
            this.displayTiles(nextMonitor);
        }
    }

    onPrevMonitor() {
        if (this._monitor != null) {
            const prevMonitor = (this._monitor - 1 + this.getNumMonitors()) % this.getNumMonitors();
            this.discardTiles();
            this.displayTiles(prevMonitor);
        }
    }

    displayTiles(monitor) {
        // Find active window
        const activeWindow = this.getActiveWindow();
        if (!activeWindow) {
            log('No active window');
            return;
        }

        this._window = activeWindow;
        this._monitor = monitor != null ? monitor : activeWindow.get_monitor();

        // Create tiles
        const workarea = this.getWorkAreaForMonitor(this._monitor);
        const layout = this.loadLayout(this._settings);
        this._tiles = this.createTiles(workarea, layout);

        // Display and bind keys
        this._tiles.forEach(tile => {
            Main.uiGroup.add_actor(tile.actor);
            this.bindKey(tile.id, () => this.onActivateTile(tile));
        });

        // Bind keys
        this.bindKey('hide-tiles', () => this.onHideTiles());
        this.bindKey('next-monitor', () => this.onNextMonitor());
        this.bindKey('prev-monitor', () => this.onPrevMonitor());
    }

    discardTiles() {
        // Unbind keys
        this.unbindKey('prev-monitor');
        this.unbindKey('next-monitor');
        this.unbindKey('hide-tiles');

        // Discard and unbind keys
        this._tiles.forEach(tile => {
            this.unbindKey(tile.id);
            Main.uiGroup.remove_actor(tile.actor);
            tile.actor.destroy();
        });

        // Clear tiles and active window
        this._tiles = [];
        this._monitor = null;
        this._window = null;
    }

    loadLayout(settings) {
        const cols = [], rows = [];

        for (let col = 0; col < 4; col++) {
            cols.push(settings.get_int(`col-${col}`));
        }
        for (let row = 0; row < 3; row++) {
            rows.push(settings.get_int(`row-${row}`));
        }

        return {cols: cols, rows: rows};
    }

    createTiles(workarea, layout) {
        const tiles = [];

        layout.cols.forEach((col_weight, col) => {
            layout.rows.forEach((row_weight, row) => {
                if (col_weight < 1 || row_weight < 1) {
                    return;
                }
                const id = `tile-${col}-${row}`;
                const name = this._settings.get_strv(id)[0] || '';
                const area = this.calculateArea(workarea, layout, col, row);
                const tile = {id: id, area: area, actor: new Tile(area, name)};
                tiles.push(tile);
            });
        });

        return tiles;
    }

    calculateArea(workarea, layout, col, row) {
        const colStart = Math.floor(workarea.x + workarea.width * this.sumUntil(layout.cols, col) / this.sumAll(layout.cols));
        const rowStart = Math.floor(workarea.y + workarea.height * this.sumUntil(layout.rows, row) / this.sumAll(layout.rows));
        const colEnd = Math.floor(workarea.x + workarea.width * this.sumUntil(layout.cols, col + 1) / this.sumAll(layout.cols));
        const rowEnd = Math.floor(workarea.y + workarea.height * this.sumUntil(layout.rows, row + 1) / this.sumAll(layout.rows));
        return {x: colStart, y: rowStart, width: colEnd - colStart, height: rowEnd - rowStart};
    }

    combineAreas(area1, area2) {
        const colStart = Math.min(area1.x, area2.x);
        const rowStart = Math.min(area1.y, area2.y);
        const colEnd = Math.max(area1.x + area1.width, area2.x + area2.width);
        const rowEnd = Math.max(area1.y + area1.height, area2.y + area2.height);
        return {x: colStart, y: rowStart, width: colEnd - colStart, height: rowEnd - rowStart};
    }

    moveWindow(window, area) {
        if (!window) {
            return;
        }
        if (window.maximized_horizontally || window.maximized_vertically) {
            window.unmaximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
        }
        window.move_resize_frame(true, area.x, area.y, area.width, area.height);
        // In some cases move_resize_frame() will resize but not move the window, so we need to move it again.
        // This usually happens when the window's minimum size is larger than the selected area.
        window.move_frame(true, area.x, area.y);
    }

    getNumMonitors() {
        return global.workspace_manager
            .get_active_workspace()
            .get_display()
            .get_n_monitors();
    }

    getWorkAreaForMonitor(monitor) {
        return global.workspace_manager
            .get_active_workspace()
            .get_work_area_for_monitor(monitor);
    }

    getActiveWindow() {
        return global.workspace_manager
            .get_active_workspace()
            .list_windows()
            .find(window => window.has_focus());
    }

    sumUntil(list, index) {
        return list.reduce((prev, curr, i) => i < index ? prev + curr : prev, 0);
    }

    sumAll(list) {
        return list.reduce((prev, curr) => prev + curr, 0);
    }
}

function init() {
    log("FOOBAR");
    log(farey_sequence.farey_indexed(3, 2));
    return new Extension();
}
