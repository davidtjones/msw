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
other inputs. Edit `TARGET` at the top to change the main input.

```
brew install --cask swiftbar
./swiftbar/install.sh
```

This symlinks the plugin into SwiftBar's plugin folder (setting that to
`~/.config/swiftbar` if you haven't picked one) and restarts SwiftBar.

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
