# msw - monitor switch

Switch a monitor's input source over DDC/CI from the command line.

```
msw dp1        # switch to DisplayPort-1
msw hdmi1      # switch to HDMI-1
msw ls         # list inputs (* = current)
msw get        # print the current input
msw -d 2 dp1   # target a different monitor
```

Names are case-insensitive and dashes are optional (`DP-1`, `dp1`,
`displayport1`). Raw values work too (`0x11`, `17`).

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

## Non-standard input values

Some monitors don't use the standard values for their inputs. Name them in
`inputs`, one `<hex> <name>` per line. These win over the built-in names.

```
13 DP-2
```

To find a port's value, switch to it with the monitor's buttons, then run
`msw get` from a machine on another input.
