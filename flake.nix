{
  description = "A very basic flake";

  outputs = { self, nixpkgs }: let 
    pkgs = nixpkgs.legacyPackages.x86_64-linux;
  in {

    packages.x86_64-linux.hello = nixpkgs.legacyPackages.x86_64-linux.hello;
    packages.x86_64-linux.ctile = nixpkgs.legacyPackages.x86_64-linux.callPackage ./ctile.nix {};

    defaultPackage.x86_64-linux = self.packages.x86_64-linux.ctile;

    devShells.x86_64-linux.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        gjs # gnome js
        clutter
        zip
        glib
        unzip
      ];
    };

  };
}
