{
  description = "capnp-ts - strongly-typed Cap'n Proto for TypeScript";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      inherit (pkgs) lib;

      capnpc-ts = pkgs.buildNpmPackage {
        inherit src nodejs npmDepsHash;

        buildPhase = ''
          runHook preBuild
          make build-prelude build-src
          runHook postBuild
        '';
        # Custom install: build the standard $out/lib/node_modules layout
        # with capnpc-ts at the root and its runtime deps vendored inside.
        # The default npmPack hook doesn't deal well with workspace packages.
        installPhase = ''
          runHook preInstall
          mkdir -p "$out/lib/node_modules/capnpc-ts/node_modules" "$out/bin"

          cp -r packages/capnpc-ts/* "$out/lib/node_modules/capnpc-ts/"
          cp -r packages/capnp-ts "$out/lib/node_modules/capnpc-ts/node_modules/capnp-ts"

          # Strip workspace symlinks before copying the rest of node_modules
          # so we don't end up with dangling links in the store.
          rm -f node_modules/capnpc-ts node_modules/capnp-ts node_modules/capnp-ts-test node_modules/capnp-ts-js-examples
          rm -rf node_modules/.bin

          cp -r node_modules/. "$out/lib/node_modules/capnpc-ts/node_modules/"
          ln -s "$out/lib/node_modules/capnpc-ts/bin/capnpc-ts.js" "$out/bin/capnpc-ts"
          runHook postInstall
        '';
        nativeBuildInputs = [pkgs.gnumake];
        npmBuildScript = null;
        pname = "capnpc-ts";
        preConfigure = preConfigure;
        version = (lib.importJSON ./packages/capnpc-ts/package.json).version;
      };

      devDependencies = with pkgs; [
        capnproto
        gnumake
        nodejs
      ];

      nodejs = pkgs.nodejs_24;

      # To recompute when package-lock.json changes:
      #   nix run nixpkgs#prefetch-npm-deps -- package-lock.json
      npmDepsHash = "sha256-NO3eQtBxras1/buZQafHCXyGvDw3KxhKQP9QAre4v+g=";

      pkgs = import nixpkgs {inherit system;};

      preConfigure = ''
        export HOME="$TMPDIR"
        substituteInPlace package.json \
          --replace-fail '"prepare": "husky"' '"prepare": "true"'
      '';

      publish = pkgs.writeShellApplication {
        name = "publish";
        runtimeInputs = [nodejs pkgs.gnumake];
        text = ''
          set -euo pipefail
          if [ -z "''${NPM_TOKEN:-}" ]; then
            echo "NPM_TOKEN is not set. Ask NPM nicely for one." >&2
            exit 1
          fi
          make build
          SCRATCH="$(mktemp -d)"
          trap 'rm -rf "$SCRATCH"' EXIT
          export HOME="$SCRATCH"
          NPMRC="$HOME/.npmrc"
          printf '//registry.npmjs.org/:_authToken=%s\n' "$NPM_TOKEN" > "$NPMRC"
          npm whoami
          npm publish -w capnp-ts --access public
          npm publish -w capnpc-ts --access public
          echo "Libraries published to NPM."
        '';
      };

      release = pkgs.writeShellApplication {
        name = "release";
        runtimeInputs = [nodejs pkgs.git];
        text = ''
          set -euo pipefail
          if [ "$#" -eq 0 ]; then
            echo "usage: release <version>" >&2
            echo "  e.g. release 0.8.0  or  release patch" >&2
            exit 1
          fi
          version="$1"
          npm version "$version" --workspaces-update
          git add -A
          git commit -m "chore(release): v$version" || {
            echo "Nothing to commit; did the version actually change?" >&2
            exit 1
          }
          git tag "v$version"
          echo "Tagged. Push and run publish."
        '';
      };

      src = pkgs.lib.cleanSourceWith {
        src = ./.;
        filter = path: type: let
          base = baseNameOf path;
          relPath = lib.removePrefix (toString ./. + "/") path;
          isDirenv = lib.hasPrefix ".direnv" relPath;
          isNodeModules = lib.hasPrefix "node_modules" relPath;
          isCoverage = lib.hasPrefix "coverage" relPath;
          isTap = lib.hasPrefix ".tap" relPath;
          isResult = base == "result" || lib.hasPrefix "result-" base;
          isFlakeLock = base == "flake.lock";
        in
          !(isNodeModules || isCoverage || isDirenv || isTap || isResult || isFlakeLock);
      };
    in {
      apps = {
        capnpc-ts = {
          meta.description = "Cap'n Proto schema compiler for TypeScript";
          program = "${capnpc-ts}/bin/capnpc-ts";
          type = "app";
        };
        default = self.apps.${system}.capnpc-ts;
        publish = {
          meta.description = "Publish script to prepare the capnp-ts repository for release";
          program = "${publish}/bin/publish";
          type = "app";
        };
        release = {
          meta.description = "Script to automate releasing new versions of capnp-ts to NPM";
          program = "${release}/bin/release";
          type = "app";
        };
      };

      checks.tests = pkgs.buildNpmPackage {
        inherit src nodejs npmDepsHash;

        buildPhase = ''
          runHook preBuild
          make build
          runHook postBuild
        '';
        checkPhase = ''
          runHook preCheck
          make test
          runHook postCheck
        '';
        doCheck = true;
        installPhase = ''
          runHook preInstall
          mkdir -p "$out"
          touch "$out/tests-passed"
          runHook postInstall
        '';
        nativeBuildInputs = [pkgs.capnproto pkgs.gnumake];
        npmBuildScript = null;
        pname = "capnp-ts-tests";
        preConfigure = preConfigure;
        version = (lib.importJSON ./packages/capnpc-ts/package.json).version;
      };

      devShells.default = pkgs.mkShell {
        nativeBuildInputs = devDependencies;
        shellHook = ''
          echo ""
          echo "  capnp-ts devshell"
          echo "  node:    $(${nodejs}/bin/node --version)"
          echo "  npm:     $(${nodejs}/bin/npm --version)"
          echo "  capnp:   $(${pkgs.capnproto}/bin/capnp --version)"
          echo ""
          echo "  make build | test | lint"
          echo "  nix run .#capnpc-ts    # run the compiler plugin"
          echo "  nix run .#publish"
          echo "  nix run .#release <ver>"
          echo ""
        '';
      };

      packages = {
        inherit capnpc-ts;
        default = capnpc-ts;
      };
    });
}
