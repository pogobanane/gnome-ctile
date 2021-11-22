{
  description = "A very basic flake";

  outputs = { self, nixpkgs }: {

    packages.x86_64-linux.hello = nixpkgs.legacyPackages.x86_64-linux.hello;
    packages.x86_64-linux.ctile = nixpkgs.legacyPackages.x86_64-linux.callPackage ./ctile.nix {};

    defaultPackage.x86_64-linux = self.packages.x86_64-linux.hello;

  };
}
