#!/bin/sh
# Install msw by symlinking it (and the inputs config) from this repo,
# so a `git pull` is all it takes to update.
#
# Usage: ./install.sh [bin-dir]    (default: ~/.local/bin)

set -eu

repo=$(cd "$(dirname "$0")" && pwd)
bin_dir=${1:-$HOME/.local/bin}
config_dir=${XDG_CONFIG_HOME:-$HOME/.config}/msw

mkdir -p "$bin_dir" "$config_dir"

ln -sf "$repo/msw" "$bin_dir/msw"
echo "linked $bin_dir/msw"

# Don't clobber a hand-edited config file.
if [ -e "$config_dir/inputs" ] && [ ! -L "$config_dir/inputs" ]; then
    echo "kept existing $config_dir/inputs (not a symlink; compare with $repo/inputs)"
else
    ln -sf "$repo/inputs" "$config_dir/inputs"
    echo "linked $config_dir/inputs"
fi

case ":$PATH:" in
    *":$bin_dir:"*) ;;
    *) echo "warning: $bin_dir is not on your PATH" ;;
esac

case $(uname -s) in
    Linux) tool=ddcutil ;;
    Darwin) tool=m1ddc ;;
    *) tool= ;;
esac
if [ -n "$tool" ] && ! command -v "$tool" >/dev/null; then
    echo "warning: $tool is not installed"
fi
