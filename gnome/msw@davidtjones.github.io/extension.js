// Monitor Switch: a Quick Settings tile for msw.
//
// Clicking the tile switches the monitor to TARGET. The arrow opens a list of
// every input (from `msw ls`), with a check next to the current one.

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {QuickMenuToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

// The input the tile switches to when clicked. Any name `msw` accepts.
const TARGET = 'DP-2';

const ICON = 'video-display-symbolic';

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

// GNOME Shell may not have ~/.local/bin on its PATH.
function mswPath() {
    return GLib.find_program_in_path('msw') ??
        GLib.build_filenamev([GLib.get_home_dir(), '.local', 'bin', 'msw']);
}

// Run msw with the given arguments and return its output.
async function msw(args, cancellable) {
    const proc = Gio.Subprocess.new([mswPath(), ...args],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    const [stdout, stderr] = await proc.communicate_utf8_async(null, cancellable);
    if (!proc.get_successful())
        throw new Error(stderr.trim() || `msw ${args.join(' ')} failed`);
    return stdout;
}

// `msw ls` lines look like "* linux (0x0f, DP-1)" or "  unknown (0x13)".
// Unnamed inputs are listed by their raw value, which msw also accepts.
function parseList(text) {
    const inputs = [];
    for (const line of text.split('\n')) {
        const m = line.match(/^([* ]) (\S+) \(0x([0-9a-f]{2})/);
        if (!m)
            continue;
        const [, mark, name, hex] = m;
        inputs.push({
            name: name === 'unknown' ? `0x${hex}` : name,
            current: mark === '*',
        });
    }
    return inputs;
}

function isCancelled(e) {
    return e instanceof GLib.Error &&
        e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED);
}

const MonitorToggle = GObject.registerClass(
class MonitorToggle extends QuickMenuToggle {
    constructor() {
        super({
            title: 'Monitor',
            subtitle: `Switch to ${TARGET}`,
            iconName: ICON,
            toggleMode: false,
        });

        this._cancellable = new Gio.Cancellable();
        this._refreshId = 0;

        this.menu.setHeader(ICON, 'Monitor Input');
        this._inputs = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._inputs);

        this.connect('clicked', () => this._switch(TARGET));
        // Re-read inputs each time the list opens, so it's never stale.
        this.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                this._refresh();
        });
        this.connect('destroy', () => this._cancellable.cancel());
    }

    _setMessage(text) {
        this._inputs.removeAll();
        const item = new PopupMenu.PopupMenuItem(text, {reactive: false});
        this._inputs.addMenuItem(item);
    }

    async _refresh() {
        // Only the latest refresh may fill the menu.
        const id = ++this._refreshId;
        this._setMessage('Loading…');

        let inputs;
        try {
            inputs = parseList(await msw(['ls'], this._cancellable));
        } catch (e) {
            if (isCancelled(e) || id !== this._refreshId)
                return;
            this._setMessage('Couldn’t read inputs');
            logError(e, 'msw');
            return;
        }
        if (id !== this._refreshId)
            return;

        if (inputs.length === 0) {
            this._setMessage('No inputs found');
            return;
        }

        this._inputs.removeAll();
        for (const input of inputs) {
            const item = new PopupMenu.PopupMenuItem(input.name);
            item.setOrnament(input.current
                ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
            item.connect('activate', () => this._switch(input.name));
            this._inputs.addMenuItem(item);
        }
    }

    async _switch(input) {
        Main.panel.closeQuickSettings();
        try {
            await msw([input], this._cancellable);
        } catch (e) {
            if (!isCancelled(e))
                Main.notifyError('Couldn’t switch monitor input', e.message);
        }
    }
});

export default class MonitorSwitchExtension extends Extension {
    enable() {
        // A SystemIndicator with no icons: the tile shows up in Quick
        // Settings, but nothing is added to the top bar.
        this._indicator = new SystemIndicator();
        this._indicator.quickSettingsItems.push(new MonitorToggle());
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
    }

    disable() {
        this._indicator.quickSettingsItems.forEach(item => item.destroy());
        this._indicator.destroy();
        this._indicator = null;
    }
}
