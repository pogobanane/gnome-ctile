const {GObject, Gtk} = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;

const COLUMN_KEY = 0;
const COLUMN_MODS = 1;

function init() {
}

function buildPrefsWidget() {
    const settings = ExtensionUtils.getSettings();

    const prefs = new Gtk.Grid({
        column_spacing: 12,
        row_spacing: 12,
        visible: true
    });

    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 3; row++) {
            const widget = buildAcceleratorWidget(settings, `tile-${col}-${row}`);
            prefs.attach(widget, col, row, 1, 1);
        }
    }

    return prefs;
}

function buildAcceleratorWidget(settings, id) {
    // Model
    const model = new Gtk.ListStore();
    model.set_column_types([GObject.TYPE_INT, GObject.TYPE_INT]);
    model.set(model.append(), [COLUMN_KEY, COLUMN_MODS], parseAccelerator(settings, id));

    // Renderer
    const renderer = new Gtk.CellRendererAccel({
        accel_mode: Gtk.CellRendererAccelMode.GTK,
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
    const view = new Gtk.TreeView({
        model: model,
        headers_visible: false
    });
    view.append_column(column);
    view.get_selection().connect('changed', function () {
        log(`Selected ${id}`) // TODO: Deselect others
    });

    return view;
}

function parseAccelerator(settings, id) {
    const accelerator = settings.get_strv(id)[0] || '';
    const [ok, key, mods] = Gtk.accelerator_parse(accelerator);
    return [key, mods];
}
