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
    mkdir -p "$out/share/gnome-shell/extensions/ctile@lundal.io"
    unzip -o "ctile@lundal.io.zip" -d "$out/share/gnome-shell/extensions/ctile@lundal.io/"
    #cp -r "/homeless-shelter/.local/share/gnome-shell/extensions/ctile@lundal.io" "$out/share/gnome-shell/extensions/ctile@lundal.io/"
    runHook postInstall
  '';

  passthru = {
    extensionUuid = "ctile@lundal.io";
    extensionPortalSlug = "ctile";
  };

  meta = with lib; {
    description = "Tiling window management for GNOME Shell";
    license = licenses.gpl2;
    maintainers = with maintainers; [ benley ];
    homepage = "https://github.com/rliang/gnome-shell-extension-tilingnome";
    platforms = gnome.gnome-shell.meta.platforms;
  };
}
