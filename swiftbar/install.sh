#!/bin/sh
# Install the msw SwiftBar plugin by symlinking it into SwiftBar's plugin
# folder, so a `git pull` is all it takes to update.
#
# Uses SwiftBar's existing plugin folder if one is set, otherwise sets it to
# ~/.config/swiftbar.
#
# Usage: swiftbar/install.sh

set -eu

[ "$(uname -s)" = Darwin ] || { echo "SwiftBar is macOS only" >&2; exit 1; }

here=$(cd "$(dirname "$0")" && pwd)
plugin=msw.10m.sh

if [ ! -d /Applications/SwiftBar.app ] && [ ! -d "$HOME/Applications/SwiftBar.app" ]; then
    echo "warning: SwiftBar not found (brew install --cask swiftbar)"
fi

dir=$(defaults read com.ameba.SwiftBar PluginDirectory 2>/dev/null || true)
if [ -z "$dir" ]; then
    dir=${XDG_CONFIG_HOME:-$HOME/.config}/swiftbar
    defaults write com.ameba.SwiftBar PluginDirectory -string "$dir"
    echo "set SwiftBar plugin folder to $dir"
fi

mkdir -p "$dir"
ln -sf "$here/$plugin" "$dir/$plugin"
echo "linked $dir/$plugin"

# Restart SwiftBar so it picks up the plugin (and folder, if just set).
if pgrep -x SwiftBar >/dev/null; then
    osascript -e 'quit app "SwiftBar"'
    sleep 1
fi
open -a SwiftBar 2>/dev/null || true
