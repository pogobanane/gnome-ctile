# ctile

Window tiling with <Super>+ArrowKeys on monitors of all sizes for GNOME Shell.
Tile windows using <Super> + Arrow Keys. Repeated commands refine the tiling and <Super>+Enter moves to another monitor.

State: Usable as in "does not crash". The algorithm and settings need refinement though.

## Developers

Resources:

- [gnome js architecture](https://gjs.guide/extensions/overview/architecture.html#mutter): Mutter is responsible for [window APIs](https://gjs-docs.gnome.org/meta3~3.30.2/)
- [Gtk Window docs](https://docs.gtk.org/gtk4/method.Window.get_focus.html) which allow guesses how the js API might look like

Development with `nix` package manager:

- build into `./result` with `nix build .#ctile`
- symlink `ln -s $(pwd)/result/share/gnome-shell/extensions/ctile@pogobanane.de ~/.local/share/gnome-shell/extensions/`
- only once: Enable extension via cmdline `gnome-extensions enable ctile@pogobanane.de`
- Start nested gnome session for testing: `dbus-run-session -- gnome-shell --nested --wayland`
- Test on main session: 
  - log out and in (to load new extension version)
  - output at: `journalctl -f -o cat /usr/bin/gnome-shell`

## TODO

- hook mouse move/resize to reset WindowState


# Tactile

Ctile was forked from [lundal/tactile](https://gitlab.com/lundal/tactile) but adapts the tiling to act as [pogobanane/xfce-ctile](https://gitlab.com/pogobanane/xfce-ctile).

A window tiling extension for GNOME Shell.

> Tile windows on a custom grid using your keyboard. Type Super-T to show the grid,
> then type two tiles (or the same tile twice) to move the active window.
>
> The grid can be up to 4x3 (corresponding to one hand on the keyboard)
> and each row/column can be weighted to take up more or less space.

https://extensions.gnome.org/extension/4548/tactile/

## Examples

![Animation of a window being moved to various positions with Tactile](examples/tactile.gif)

![Picture of a windows tiled with Tactile](examples/tactile.png)

## License

Tactile is distributed under the terms of the GNU General Public License v3.0 or later.
See the [license](LICENSE) file for details.
