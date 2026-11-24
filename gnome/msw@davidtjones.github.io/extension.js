// Monitor Switch: a Quick Settings tile for msw.
//
// Clicking the tile switches the monitor to TARGET. The arrow opens a menu
// with every input (from `msw ls`), plus PIP/PBP controls on monitors that
// support them: the layout, the second input, and a swap button.

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

// Parse a label like "linux (0x0f, DP-1)" or "pbp 50 (0x24)".
function parseLabel(text) {
    const m = text.match(/^(.+?) \(0x([0-9a-f]{2})/);
    return m ? {name: m[1], hex: m[2]} : null;
}

// Parse `msw ls` or `msw layouts`: one label per line, "*" marks the current.
function parseList(text) {
    const entries = [];
    for (const line of text.split('\n')) {
        const m = line.match(/^([* ]) (.*)$/);
        const entry = m && parseLabel(m[2]);
        if (entry)
            entries.push({...entry, current: m[1] === '*'});
    }
    return entries;
}

// Unnamed inputs are shown and selected by their raw value, which msw accepts.
function inputName(entry) {
    return entry.name === 'unknown' ? `0x${entry.hex}` : entry.name;
}

// "pbp 50" -> "PBP 50", "pip small" -> "PIP small", "off" -> "Off"
function layoutTitle(name) {
    const [kind, ...rest] = name.split(' ');
    if (rest.length === 0)
        return kind.charAt(0).toUpperCase() + kind.slice(1);
    return [kind.toUpperCase(), ...rest].join(' ');
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
        this._content = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._content);

        this.connect('clicked', () => this._run([TARGET]));
        // Re-read everything each time the menu opens, so it's never stale.
        this.menu.connect('open-state-changed', (_menu, open) => {
            if (open)
                this._refresh();
        });
        this.connect('destroy', () => this._cancellable.cancel());
    }

    _setMessage(text) {
        this._content.removeAll();
        this._content.addMenuItem(new PopupMenu.PopupMenuItem(text, {reactive: false}));
    }

    _addItem(menu, text, args, checked) {
        const item = new PopupMenu.PopupMenuItem(text);
        item.setOrnament(checked ? PopupMenu.Ornament.CHECK : PopupMenu.Ornament.NONE);
        item.connect('activate', () => this._run(args));
        menu.addMenuItem(item);
    }

    async _refresh() {
        // Only the latest refresh may fill the menu.
        const id = ++this._refreshId;
        this._setMessage('Loading…');

        // Run one at a time: they all talk to the monitor over the same bus.
        let inputs, layouts = [], second = null;
        try {
            inputs = parseList(await msw(['ls'], this._cancellable));
            // PIP/PBP is optional: monitors without it just don't get those items.
            try {
                layouts = parseList(await msw(['layouts'], this._cancellable));
                second = parseLabel((await msw(['get', 'second'], this._cancellable)).trim());
            } catch (e) {
                if (isCancelled(e))
                    throw e;
                layouts = [];
            }
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

        this._content.removeAll();
        for (const input of inputs)
            this._addItem(this._content, inputName(input), [inputName(input)], input.current);

        // Without a pxp config, only "off" is listed: no PIP/PBP controls.
        if (layouts.length <= 1)
            return;

        this._content.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const layout = layouts.find(l => l.current);
        const layoutMenu = new PopupMenu.PopupSubMenuMenuItem(
            `Layout: ${layout ? layoutTitle(layout.name) : 'unknown'}`);
        for (const l of layouts) {
            if (l.name === 'unknown')
                continue;
            this._addItem(layoutMenu.menu, layoutTitle(l.name), l.name.split(' '), l.current);
        }
        this._content.addMenuItem(layoutMenu);

        const main = inputs.find(i => i.current);
        const secondName = second ? inputName(second) : 'unknown';
        const secondMenu = new PopupMenu.PopupSubMenuMenuItem(`Second input: ${secondName}`);
        for (const input of inputs) {
            if (input === main)
                continue;
            this._addItem(secondMenu.menu, inputName(input),
                ['second', inputName(input)], input.hex === second?.hex);
        }
        this._content.addMenuItem(secondMenu);

        if (layout && layout.name !== 'off') {
            const swap = new PopupMenu.PopupMenuItem('Swap inputs');
            swap.connect('activate', () => this._run(['swap']));
            this._content.addMenuItem(swap);
        }
    }

    async _run(args) {
        Main.panel.closeQuickSettings();
        try {
            await msw(args, this._cancellable);
        } catch (e) {
            if (!isCancelled(e))
                Main.notifyError('Monitor Switch', e.message);
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
