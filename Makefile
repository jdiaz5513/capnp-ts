#########
# prelude

MAKEFLAGS += --warn-undefined-variables
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := build
.DELETE_ON_ERROR:
.SUFFIXES:

#######################
# environment variables

CAPNP_BIN := capnp
TAP_FLAGS ?= -j8 --no-coverage --ts -Rterse -c
TAP_TS := 1
TSC_FLAGS ?=
STANDARD_FLAGS ?= --dry-run

##############
# binary paths

capnpc := $(shell which capnpc)
node := $(shell which node)
node_bin := node_modules/.bin
tsc := $(node_bin)/tsc $(TSC_FLAGS)
tap := $(node_bin)/tap $(TAP_FLAGS)
eslint := $(node_bin)/eslint
standard := $(node_bin)/standard-version $(STANDARD_FLAGS)
npm := $(shell which npm)

######
# vars

capnp_ts := packages/capnp-ts
capnpc_ts := packages/capnpc-ts
js_examples := packages/js_examples

capnp_deps := $(shell find packages/capnp-ts/src -name '*.ts' -not -name '*.d.ts' -print)
capnp_deps := $(capnp_deps) $(shell find packages/capnpc-ts/src -name '*.ts' -not -name '*.d.ts' -print)

specs_in := $(shell find packages -name '*.spec.ts' -print)
specs_out := $(patsubst %.ts,%.js,$(specs_in))
capnp_in := $(shell find packages -name '*.capnp' -print)
capnp_out := $(patsubst %.capnp,%.capnp.js,$(capnp_in))

################
# build commands

%.capnp.js: $(capnp_deps)
%.capnp.js: %.capnp
	$(capnpc) -o./$(capnpc_ts)/bin/capnpc-ts.js -I $(capnp_ts)/src/std $<	

.PHONY: benchmark
benchmark: build
benchmark:
	$(node) $(capnp_ts)/benchmark/index.js
	@echo

.PHONY: build-prelude
build-prelude:
	$(tsc) -p tsconfig.prelude.json

.PHONY: build-src
build-src: build-prelude
	$(tsc) -p tsconfig.src.json

.PHONY: build-capnp
build-capnp: build-src
build-capnp: $(capnp_out)

.PHONY: build-test
build-test: build-capnp
	$(tsc) -p tsconfig.test.json

.PHONY: build
build: build-test

.PHONY: clean
clean:
	@find packages -name "*.d.ts" -not -path "*/node_modules/*" | xargs -r rm
	@find packages -name "*.js" -not -path "*/bin/*" -not -path "*/node_modules/*" | xargs -r rm
	@find packages -name "*.map" -not -path "*/node_modules/*" | xargs -r rm
	@find packages -name "*.tsbuildinfo" -not -path "*/node_modules/*" | xargs -r rm
	@rm -f $(capnp_out)

.PHONY: test
test: build
	@$(tap) $(specs_out)

.PHONY: coverage
coverage: build
	@$(tap) --coverage $(specs_in)

.PHONY: lint
lint: build
	$(eslint) . --ext .ts

.PHONY: release
release: build
	$(standard)

.PHONY: publish
publish:
	$(npm) publish -w capnp-ts
	$(npm) publish -w capnpc-ts
