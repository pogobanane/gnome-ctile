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
        this._settings = ExtensionUtils.getSettings();
        this._tiles = [];
        this._window = null;
        this._workarea = null;
        this._layout = {cols: [], rows: []};
    }

    enable() {
        this.bindKey('show-tiles', () => this.showTiles());
    }

    disable() {
        this.unbindKey('show-tiles');
    }

    bindKey(key, callback) {
        Main.wm.addKeybinding(
            key,
            this._settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            Shell.ActionMode.NORMAL,
            callback
        );
    }

    unbindKey(key) {
        Main.wm.removeKeybinding(key);
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

    showTiles() {
        // Check if tiles are already shown
        if (this._tiles.length > 0) {
            this.hideTiles();
            return;
        }

        // Find active window
        const activeWindow = this.getActiveWindow()
        if (!activeWindow) {
            log('No active window')
            return;
        }

        // Save window
        this._window = activeWindow;
        this._workarea = activeWindow.get_work_area_current_monitor();

        // Load layout
        this._layout = this.loadLayout(this._settings);

        // Create tiles
        this._layout.cols.forEach((col_weight, col) => {
            this._layout.rows.forEach((row_weight, row) => {
                if (col_weight < 1 || row_weight < 1) {
                    return;
                }
                const tile = {key: `tile-${col}-${row}`, col: col, row: row};
                const area = this.calculateArea(this._workarea, this._layout, tile, tile);
                const name = this._settings.get_strv(tile.key)[0] || '';
                this._tiles.push({...tile, actor: new Tile(area, name)});
            });
        });
        this._tiles.forEach(tile => Main.uiGroup.add_actor(tile.actor))

        // Bind keys
        this._tiles.forEach(tile => {
            this.bindKey(tile.key, () => this.onTileActivated(tile));
        });
        this.bindKey('hide-tiles', () => this.hideTiles());
    }

    hideTiles() {
        // Check if tiles are already hidden
        if (this._tiles.length < 1) {
            return;
        }

        // Unbind keys
        this.unbindKey('hide-tiles');
        this._tiles.forEach(tile => {
            this.unbindKey(tile.key);
        })

        // Remove tiles
        this._tiles.forEach(tile => Main.uiGroup.remove_actor(tile.actor))
        this._tiles = [];

        // Discard window
        this._window = null;
        this._workarea = null;
    }

    onTileActivated(tile) {
        let lastTile = this._tile;
        let lastDate = this._date;
        if (lastTile == null || (lastDate != null && lastDate + 1000 < Date.now())) {
            this._tile = tile;
            this._date = Date.now();
            return;
        }
        this._tile = null;
        this._date = null;

        log('Moving active window to area ' + lastTile.key + ',' + tile.key)
        this.moveWindow(this._window, this.calculateArea(this._workarea, this._layout, lastTile, tile));
        this.hideTiles();
    }

    calculateArea(workarea, layout, tile1, tile2) {
        const colStart = Math.floor(workarea.x + workarea.width * this.sumUntil(layout.cols, Math.min(tile1.col, tile2.col)) / this.sumAll(layout.cols));
        const rowStart = Math.floor(workarea.y + workarea.height * this.sumUntil(layout.rows, Math.min(tile1.row, tile2.row)) / this.sumAll(layout.rows));
        const colEnd = Math.floor(workarea.x + workarea.width * this.sumUntil(layout.cols, Math.max(tile1.col, tile2.col) + 1) / this.sumAll(layout.cols));
        const rowEnd = Math.floor(workarea.y + workarea.height * this.sumUntil(layout.rows, Math.max(tile1.row, tile2.row) + 1) / this.sumAll(layout.rows));
        return {x: colStart, y: rowStart, width: colEnd - colStart, height: rowEnd - rowStart}
    }

    moveWindow(window, area) {
        if (!window) {
            log('Window disappeared');
            return;
        }

        log('Moving window: ' + window.get_title());

        if (window.maximized_horizontally || window.maximized_vertically) {
            window.unmaximize(Meta.MaximizeFlags.HORIZONTAL | Meta.MaximizeFlags.VERTICAL);
        }

        //window.move_frame(true, area.x, area.y);
        window.move_resize_frame(true, area.x, area.y, area.width, area.height);
    }

    getActiveWindow() {
        return global.workspace_manager
            .get_active_workspace()
            .list_windows()
            .find(window => window.has_focus());
    }

    sumUntil(list, index) {
        let sum = 0;
        for (let i = 0; i < index; i++) {
            sum += list[i]
        }
        return sum;
    }

    sumAll(list) {
        return list.reduce((a, b) => a + b, 0);
    }
}

function init() {
    return new Extension();
}
