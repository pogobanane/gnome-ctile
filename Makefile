.PHONY: build clean wayland

zip = tactile@lundal.io.zip
schema = schemas/gschemas.compiled

build: $(zip)

clean:
	rm -f $(zip) $(schema)

$(zip): *.json *.js *.css schemas/*.xml $(schema)
	zip - $^ > $@

$(schema): schemas/*.xml
	glib-compile-schemas --strict schemas

wayland:
	dbus-run-session -- gnome-shell --nested --wayland
