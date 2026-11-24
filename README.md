# msw - monitor switch

Switch a monitor's input source over DDC/CI from the command line.

```
msw setup      # preview each input and name it (e.g. linux, macbook)
msw macbook    # switch to the input you named macbook
msw dp1        # switch to DisplayPort-1
msw ls         # list inputs (* = current)
msw get        # print the current input
msw -d 2 dp1   # target a different monitor
```

Names are case-insensitive and dashes are optional (`DP-1`, `dp1`,
`displayport1`). Standard names always work, even after you add your own. Raw
values work too (`0x11`, `17`).

## Requirements

- Linux: [ddcutil](https://www.ddcutil.com/), with access to `/dev/i2c-*`
- macOS (Apple Silicon only): [m1ddc](https://github.com/waydabber/m1ddc) - `brew install m1ddc`

## Install

```
git clone https://github.com/davidtjones/msw.git ~/proj/msw
cd ~/proj/msw
./install.sh            # or ./install.sh /some/other/bin
```

This symlinks `msw` into `~/.local/bin` and `inputs` into
`~/.config/msw/inputs`. Update with `git pull`.

On macOS, `~/.local/bin` is not on `PATH` by default. Either add it in
`~/.zshrc` (`export PATH="$HOME/.local/bin:$PATH"`) or install somewhere that
is, like `./install.sh /opt/homebrew/bin`.

## Menu bar (macOS)

`swiftbar/msw.10m.sh` is a [SwiftBar](https://swiftbar.app) plugin: a monitor
icon in the menu bar with a one-click "Switch to DP-1" and a submenu for the
other inputs. On monitors with PIP/PBP set up (see below), it also has
submenus for the layout and second input, and a "Swap inputs" item. Edit
`TARGET` at the top to change the main input.

```
brew install --cask swiftbar
./swiftbar/install.sh
```

This symlinks the plugin into SwiftBar's plugin folder (setting that to
`~/.config/swiftbar` if you haven't picked one) and restarts SwiftBar.

## Quick Settings (GNOME)

`gnome/` holds a small GNOME Shell extension (GNOME 45+) that adds a "Monitor"
tile to the Quick Settings panel, next to Wi-Fi and Bluetooth. Clicking the
tile switches to `TARGET` (DP-2 by default). The arrow opens a list of all
inputs, with a check next to the current one. On monitors with PIP/PBP set up
(see below), the list also has submenus for the layout and second input, and
a "Swap inputs" item. Edit `TARGET` at the top of
`gnome/msw@davidtjones.github.io/extension.js` to change the main input.

```
./gnome/install.sh
```

This symlinks the extension into `~/.local/share/gnome-shell/extensions` and
enables it. Log out and back in to load it, and again after any change to the
extension (GNOME on Wayland can't reload extensions in place).

## Naming inputs

Run `msw setup` from any machine plugged into the monitor. For each input the
monitor reports, it:

1. Shows that input for 8 seconds, then switches back (skip with `n`).
2. Asks for a name. Enter keeps the current one.

Setup on macOS lists every standard input, since `m1ddc` can't ask the monitor
which ones it has. Skip the ones you don't use.

Names are saved in `~/.config/msw/inputs` (the repo's `inputs` file, once
installed), one `<hex> <name>` per line. You can also edit this file by hand.
A value can have more than one name, and the first one is shown in `msw ls`.

```
0f linux
13 macbook
```

Setup also handles monitors that use non-standard values. For example, the
Dell AW3423DWF reports its second DisplayPort as `0x13` instead of `0x10`, so
`ddcutil` calls it "Unrecognized value". If setup can't find a port, switch to
it with the monitor's buttons, then run `msw get` from another machine to
read its value.

Set `MSW_PREVIEW_SECS` to change the preview length.

## PIP / PBP

On monitors that support it (Dell, so far), `msw` can show two inputs at once:

```
msw pbp 50 macbook   # side by side, 50/50, with macbook as the second input
msw pbp 75           # 75/25 split, keeping the current second input
msw pip small        # picture-in-picture
msw second hdmi1     # change only the second input
msw swap             # swap the main and second input
msw off              # back to a single input
msw status           # show the input, layout and second input
msw layouts          # list layouts, * = current
```

`msw get second` and `msw get layout` print just one of those, for scripts.

Dell monitors keep the layout in private VCP code `E9` and the second input in
`E8`. Layout values differ by model, so they live in `pxp` (linked to
`~/.config/msw/pxp`), one `<hex> <pip|pbp> <name>` per line:

```
21 pip small
24 pbp 50
```

For PBP, the name is the main input's share of the screen in percent. The
first layout of each kind is what a bare `msw pip` or `msw pbp` uses.

To find the values for a new monitor, pick each layout with the monitor's
buttons and run `msw status`. Layouts not in `pxp` show up as
`unknown (0x2b)`. You can also try a raw value directly, like `msw pbp 0x2b`.
The PIP corner can't be set over DDC on the AW3423DWF, so use the monitor's
menu for that.
