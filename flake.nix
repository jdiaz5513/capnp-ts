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
        inherit src nodejs npmDeps npmConfigHook;

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

      # Each dependency is fetched from its package-lock.json integrity hash directly.
      npmConfigHook = pkgs.importNpmLock.npmConfigHook;

      npmDeps = pkgs.importNpmLock {npmRoot = ./.;};

      pkgs = import nixpkgs {inherit system;};

      preConfigure = ''
        export HOME="$TMPDIR"
        substituteInPlace package.json \
          --replace-fail '"prepare": "husky"' '"prepare": "true"'
      '';

      publish = pkgs.writeShellApplication {
        name = "publish";
        runtimeInputs = [nodejs pkgs.git pkgs.gnumake];
        text = ''
          set -euo pipefail
          if [ -n "$(git status --porcelain)" ]; then
            echo "Working tree is dirty; commit or stash first." >&2
            exit 1
          fi
          version="$(node -p "require('./packages/capnp-ts/package.json').version")"
          if [ "$(git rev-parse -q --verify "refs/tags/v$version^{commit}" || true)" != "$(git rev-parse HEAD)" ]; then
            echo "HEAD is not the v$version release commit; run release first." >&2
            exit 1
          fi
          make build
          # Interactive npm auth (oauth); whoami fails fast with a login hint if needed.
          npm whoami || {
            echo "Not logged in to npm; run 'npm login' first." >&2
            exit 1
          }
          npm publish -w capnp-ts --access public
          npm publish -w capnpc-ts --access public
          echo "Published capnp-ts@$version and capnpc-ts@$version."
        '';
      };

      release = pkgs.writeShellApplication {
        name = "release";
        runtimeInputs = [nodejs pkgs.git];
        text = ''
          set -euo pipefail
          if [ "$#" -eq 0 ]; then
            echo "usage: release <version|patch|minor|major>" >&2
            exit 1
          fi
          if [ -n "$(git status --porcelain)" ]; then
            echo "Working tree is dirty; commit or stash first." >&2
            exit 1
          fi

          prev="$(git describe --tags --abbrev=0)"
          repo="https://github.com/jdiaz5513/capnp-ts"

          # Bump the root, both published packages, and js-examples in lockstep,
          # then point every internal capnp-ts dependency at the new version.
          version="$(npm version "$1" --no-git-tag-version)"
          version="''${version#v}"
          npm version "$version" --no-git-tag-version \
            -w capnp-ts -w capnpc-ts -w capnp-ts-js-examples >/dev/null
          npm pkg set "dependencies.capnp-ts=^$version" \
            -w capnpc-ts -w capnp-ts-test -w capnp-ts-js-examples
          npm install --package-lock-only >/dev/null

          # Draft a changelog section from conventional commits since the last tag.
          {
            head -n 4 CHANGELOG.md
            echo "## [$version]($repo/compare/$prev...v$version) ($(date +%Y-%m-%d))"
            echo ""
            breaking="$(git log "$prev..HEAD" --format='%b' | sed -n 's/^BREAKING CHANGES*: */* /p')"
            if [ -n "$breaking" ]; then
              echo "### ⚠ BREAKING CHANGES"
              echo ""
              echo "$breaking"
              echo ""
            fi
            section() {
              local title="$1" type="$2" out
              out="$(git log "$prev..HEAD" --format='%H%x09%s' | awk -F'\t' -v t="$type" -v repo="$repo" '
                $2 ~ "^" t "(\\(|!|:)" {
                  sub("^[^:]*: *", "", $2)
                  printf "* %s ([%s](%s/commit/%s))\n", $2, substr($1, 1, 7), repo, $1
                }')"
              if [ -n "$out" ]; then
                echo "### $title"
                echo ""
                echo "$out"
                echo ""
              fi
            }
            section "Features" feat
            section "Bug Fixes" fix
            tail -n +5 CHANGELOG.md
          } > CHANGELOG.md.new
          mv CHANGELOG.md.new CHANGELOG.md

          git add CHANGELOG.md package.json package-lock.json packages/*/package.json
          git commit -m "chore(release): $version"
          git tag "v$version"
          echo "Released $version. Review CHANGELOG.md (amend if needed), push with tags, then run publish."
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
          meta.description = "Publish capnp-ts and capnpc-ts to npm (requires a clean tree on the release tag)";
          program = "${publish}/bin/publish";
          type = "app";
        };
        release = {
          meta.description = "Bump all package versions, draft the changelog, commit and tag";
          program = "${release}/bin/release";
          type = "app";
        };
      };

      checks.tests = pkgs.buildNpmPackage {
        inherit src nodejs npmDeps npmConfigHook;

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
