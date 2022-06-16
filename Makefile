.PHONY: build clean test-wayland follow-log

zip = ctile@pogobanane.de.zip
schema = schemas/gschemas.compiled

build: $(zip)

install: $(zip)
	unzip -o $(zip) -d ~/.local/share/gnome-shell/extensions/ctile@pogobanane.de/

clean:
	rm -f $(zip) $(schema)

$(zip): *.json *.js *.css $(schema)
	zip - $^ > $@

$(schema): schemas/*.xml
	glib-compile-schemas --strict schemas

test-wayland:
	dbus-run-session -- gnome-shell --nested --wayland

follow-log:
	journalctl -f /usr/bin/gnome-shell
