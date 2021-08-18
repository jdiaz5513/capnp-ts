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
TSC_FLAGS ?= --incremental
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
capnpc_js := packages/capnpc-js
capnpc_ts := packages/capnpc-ts
js_examples := packages/js_examples

specs_in := $(shell find packages -name '*.spec.ts' -print)
specs_out := $(patsubst %.ts,%.js,$(specs_in))
capnp_in := $(shell find packages -name '*.capnp' -print)
capnp_out := $(patsubst %.capnp,%.capnp.ts,$(capnp_in))

###############
# build targets

%.capnp.ts: build
%.capnp.ts: %.capnp
	@echo [capnpc] compiling $<...
	$(capnpc) -o./$(capnpc_ts)/bin/capnpc-ts.js -I $(capnp_ts)/src/std $<

################
# build commands

.PHONY: benchmark
benchmark: build
benchmark:
	@echo [tap] running benchmarks...
	@echo
	@echo =============================
	$(node) $(capnp_ts)/benchmark/index.js
	@echo

.PHONY: build
build: $(capnp_out)
	@echo [tsc] compiling...
	$(tsc) -p packages/capnp-ts/tsconfig.json
	$(tsc) -p packages/capnp-ts-test/tsconfig.json
	$(tsc) -p packages/capnpc-ts/tsconfig.json
	$(tsc) -p packages/capnpc-js/tsconfig.json

.PHONY: clean
clean:
	find packages -name "*.d.ts" | xargs -r rm
	find packages -name "*.js" -not -path "*/bin/*" | xargs -r rm
	find packages -name "*.map" | xargs -r rm
	find packages -name "*.tsbuildinfo" | xargs -r rm

.PHONY: test
test: build
	@echo [tap] running tests...
	@$(tap) $(specs_out)

.PHONY: coverage
coverage: build
	@echo [tap] generating coverage report...
	@$(tap) --coverage $(specs_in)

.PHONY: lint
lint: build
	@echo [eslint] running lint checkers...
	$(eslint) . --ext .ts

.PHONY: release
release: build
	$(standard)

.PHONY: publish
publish:
	$(npm) publish -w capnp-ts
	$(npm) publish -w capnpc-js
	$(npm) publish -w capnpc-ts
