{ stdenv, lib, fetchFromGitHub, glib, gnome, zip, unzip }:

stdenv.mkDerivation rec {
  pname = "gnome-shell-extension-ctile";
  version = "unstable-2019-09-19";

  src = ./.;
  #fetchFromGitHub {
    #owner = "rliang";
    #repo = "gnome-shell-extension-tilingnome";
    #rev = "f401c20c9721d85e6b3e30d1e822a200db370407";
    #sha256 = "1hq9g9bxqpzqrdj9zm0irld8r6q4w1m4b00jya7wsny8rzb1s0y2";
  #};

  nativeBuildInputs = [ glib zip unzip ];

  buildPhase = ''
    runHook preBuild
    # glib-compile-schemas --strict schemas
    make build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p "$out/share/gnome-shell/extensions/ctile@pogobanane.de"
    unzip -o "ctile@pogobanane.de.zip" -d "$out/share/gnome-shell/extensions/ctile@pogobanane.de/"
    #cp -r "/homeless-shelter/.local/share/gnome-shell/extensions/ctile@lundal.io" "$out/share/gnome-shell/extensions/ctile@lundal.io/"
    runHook postInstall
  '';

  passthru = {
    extensionUuid = "ctile@pogobanane.de";
    extensionPortalSlug = "ctile";
  };

  meta = with lib; {
    description = "Window tiling with <Super>+ArrowKeys on monitors of all sizes for GNOME Shell";
    license = licenses.gpl3;
    maintainers = with maintainers; [ okelmann ];
    homepage = "https://gitlab.com/pogobanane/gnome-ctile";
    platforms = gnome.gnome-shell.meta.platforms;
  };
}
