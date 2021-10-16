const {Clutter, GObject, Meta, Shell, St} = imports.gi;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;

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

class Extension {
    constructor() {
        this._settings = null;
        this._tiles = [];
        this._window = null;
        this._tile = null;
        this._date = null;
    }

    enable() {
        this._settings = ExtensionUtils.getSettings();
        this.bindKey('show-tiles', () => this.onShowTiles());
    }

    disable() {
        // In case the extension is disabled while tiles are shown
        this.discardTiles();

        this.unbindKey('show-tiles');
        this._settings = null;
    }

    bindKey(key, callback) {
        Main.wm.addKeybinding(key, this._settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT, Shell.ActionMode.NORMAL, callback);
    }

    unbindKey(key) {
        Main.wm.removeKeybinding(key);
    }

    onShowTiles() {
        if (this._tiles.length > 0) {
            this.discardTiles();
            this.unbindKey('hide-tiles');
        } else {
            this.displayTiles();
            this.bindKey('hide-tiles', () => this.onHideTiles());
        }
    }

    onHideTiles() {
        if (this._tiles.length > 0) {
            this.discardTiles();
            this.unbindKey('hide-tiles');
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

    displayTiles() {
        // Find active window
        const activeWindow = this.getActiveWindow();
        if (!activeWindow) {
            log('No active window');
            return;
        }
        this._window = activeWindow;

        // Create tiles
        const workarea = activeWindow.get_work_area_current_monitor();
        const layout = this.loadLayout(this._settings);
        this._tiles = this.createTiles(workarea, layout);

        // Display and bind keys
        this._tiles.forEach(tile => {
            Main.uiGroup.add_actor(tile.actor);
            this.bindKey(tile.id, () => this.onActivateTile(tile));
        });
    }

    discardTiles() {
        // Discard and unbind keys
        this._tiles.forEach(tile => {
            this.unbindKey(tile.id);
            Main.uiGroup.remove_actor(tile.actor);
            tile.actor.destroy();
        });

        // Clear tiles and active window
        this._tiles = [];
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
    return new Extension();
}
