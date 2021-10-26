const {Gio, GObject, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const COLUMN_KEY = 0;
const COLUMN_MODS = 1;

const KEYBOARD_SHORTCUTS = [
    {id: 'show-tiles', desc: 'Show tiles'},
    {id: 'hide-tiles', desc: 'Hide tiles'},
];

function init() {
}

function buildPrefsWidget() {
    const settings = ExtensionUtils.getSettings();
    const allTreeViews = [];

    const grid = new Gtk.Grid({
        margin_start: 12,
        margin_end: 12,
        margin_top: 12,
        margin_bottom: 12,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    const tileConfigLabel = new Gtk.Label({
        label: '<b>Tile configuration</b>',
        use_markup: true,
        visible: true
    });
    grid.attach(tileConfigLabel, 0, 0, 1, 1);

    const tileConfigWidget = buildTileConfigWidget(settings, allTreeViews);
    grid.attach(tileConfigWidget, 0, 1, 1, 1);

    const keyboardShortcutsLabel = new Gtk.Label({
        label: '<b>Keyboard shortcuts</b>',
        use_markup: true,
        visible: true
    });
    grid.attach(keyboardShortcutsLabel, 0, 2, 1, 1);

    const keyboardShortcutsWidget = buildKeyboardShortcutsWidget(settings, allTreeViews);
    grid.attach(keyboardShortcutsWidget, 0, 3, 1, 1);

    return grid;
}

function buildTileConfigWidget(settings, allTreeViews) {
    const grid = new Gtk.Grid({
        halign: Gtk.Align.CENTER,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    // Col weights
    for (let col = 0; col < 4; col++) {
        const widget = buildNumberWidget(settings, `col-${col}`)
        grid.attach(widget, col + 1, 0, 1, 1);
    }

    // Row weights
    for (let row = 0; row < 3; row++) {
        const widget = buildNumberWidget(settings, `row-${row}`)
        grid.attach(widget, 0, row + 1, 1, 1);
    }

    // Tile hotkeys
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 3; row++) {
            const widget = buildAcceleratorWidget(settings, `tile-${col}-${row}`, 124, 34, allTreeViews);
            grid.attach(widget, col + 1, row + 1, 1, 1);
        }
    }

    return grid;
}

function buildKeyboardShortcutsWidget(settings, allTreeViews) {
    const grid = new Gtk.Grid({
        halign: Gtk.Align.CENTER,
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    KEYBOARD_SHORTCUTS.forEach((shortcut, index) => {
        const label = new Gtk.Label({
            halign: Gtk.Align.END,
            label: shortcut.desc,
            visible: true
        });
        grid.attach(label, 0, index, 1, 1);

        const accelerator = buildAcceleratorWidget(settings, shortcut.id, 124, 26, allTreeViews);
        grid.attach(accelerator, 1, index, 1, 1);
    });

    return grid;
}

function buildNumberWidget(settings, id) {
    const spin = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 1000,
            step_increment: 1
        }),
        visible: true
    });
    settings.bind(id, spin, 'value', Gio.SettingsBindFlags.DEFAULT);
    return spin;
}

// The only widget for capturing accelerators is CellRendererAccel
// It must be embedded in a TreeView, which adds a lot of complexity
function buildAcceleratorWidget(settings, id, width, height, allTreeViews) {
    // Model
    const model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_INT, GObject.TYPE_INT]);
    model.set(model.append(), [COLUMN_KEY, COLUMN_MODS], parseAccelerator(settings, id));

    // Renderer
    const renderer = new Gtk.CellRendererAccel({
        accel_mode: Gtk.CellRendererAccelMode.GTK,
        width: width,
        height: height,
        editable: true
    });
    renderer.connect('accel-edited', function (renderer, path, key, mods) {
        const [ok, iter] = model.get_iter_from_string(path);
        if (!ok) {
            return;
        }
        model.set(iter, [COLUMN_KEY, COLUMN_MODS], [key, mods]);
        settings.set_strv(id, [Gtk.accelerator_name(key, mods)]);
    });
    renderer.connect('accel-cleared', function (renderer, path) {
        const [ok, iter] = model.get_iter_from_string(path);
        if (!ok) {
            return;
        }
        model.set(iter, [COLUMN_KEY, COLUMN_MODS], [0, 0]);
        settings.set_strv(id, []);
    });

    // Column
    const column = new Gtk.TreeViewColumn();
    column.pack_start(renderer, true);
    column.add_attribute(renderer, 'accel-key', COLUMN_KEY);
    column.add_attribute(renderer, 'accel-mods', COLUMN_MODS);

    // TreeView
    const treeView = new Gtk.TreeView({
        model: model,
        headers_visible: false,
        visible: true
    });
    treeView.append_column(column);

    // TreeViews keep their selection when they loose focus
    // This prevents more than one from being selected
    treeView.get_selection().connect('changed', function (selection) {
        if (selection.count_selected_rows() > 0) {
            allTreeViews
                .filter(it => it !== treeView)
                .forEach(it => it.get_selection().unselect_all());
        }
    });
    allTreeViews.push(treeView);

    return treeView;
}

function parseAccelerator(settings, id) {
    const accelerator = settings.get_strv(id)[0] || '';
    const [ok, key, mods] = Gtk.accelerator_parse(accelerator);
    // Gtk3 compatibility
    if (typeof ok == "number") {
        return [ok, key];
    }
    return [key, mods];
}
