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
TAP_FLAGS ?= -j8 --no-coverage
TAP_TS := 1
TSC_FLAGS ?= --incremental

##############
# binary paths

capnpc := $(shell which capnpc)
node := $(shell which node)
node_bin := node_modules/.bin
lerna := $(node_bin)/lerna
nodemon := $(node_bin)/nodemon
tsc := $(node_bin)/tsc $(TSC_FLAGS)
tap := $(node_bin)/tap $(TAP_FLAGS)
eslint := $(node_bin)/eslint

######
# vars

capnp_ts := packages/capnp-ts
capnpc_js := packages/capnpc-js
capnpc_ts := packages/capnpc-ts
js_examples := packages/js_examples

capnp_ts_src := $(capnp_ts)/src/


capnp_in := $(shell find packages -name '*.capnp' -print)
capnp_out := $(patsubst %.capnp,%.capnp.ts,$(capnp_in))
tsconfig := $(shell find . -name 'tsconfig*.json' -print)
capnp_ts_test_data := $(shell find $(capnp_ts)/test/data -name '*' -print)
capnp_ts_lib_test: capnp_ts_test_data

common_deps := package-lock.json $(tsconfig) $(capnp_in)

###############
# build targets

%.capnp.ts: build-capnp-ts
%.capnp.ts: build-capnpc-ts
%.capnp.ts: %.capnp
	@echo [capnpc] compiling $<...
	@$(capnpc) -o./$(capnpc_ts)/bin/capnpc-ts.js -I $(capnp_ts)/src/std $<

################
# build commands

.PHONY: benchmark
benchmark: build-capnp-ts
benchmark:
	@echo [tsc] compiling benchmarks...
	@$(tsc) -p configs/capnp-ts/tsconfig-lib-test.json
	@echo [tap] running benchmarks...
	@echo
	@echo =============================
	@$(node) $(capnp_ts)/lib-test/benchmark/index.js
	@echo

.PHONY: build-capnp
build-capnp: $(capnp_out)

.PHONY: build-capnp-ts
build-capnp-ts:
	@echo [tsc] compiling capnp-ts...
	@$(tsc) -p configs/capnp-ts/tsconfig-lib.json

.PHONY: build-capnpc-ts
build-capnpc-ts: build-capnp-ts
	@echo [tsc] compiling capnpc-ts...
	@$(tsc) -p configs/capnpc-ts/tsconfig-lib.json

.PHONY: build-capnpc-js
build-capnpc-js: build-capnpc-ts
	@echo [tsc] compiling capnpc-js...
	@$(tsc) -p configs/capnpc-js/tsconfig-lib.json

.PHONY: build
build: build-capnp-ts
build: build-capnpc-ts
build: build-capnpc-js
build: build-capnp

.PHONY: test-capnp-ts
test-capnp-ts: build-capnp
test-capnp-ts: build-capnp-ts
	@echo [tsc] compiling tests for capnp-ts...
	@$(tsc) -p configs/capnp-ts/tsconfig-lib-test.json

.PHONY: test-capnpc-ts
test-capnpc-ts: build-capnp
test-capnpc-ts: build-capnpc-ts
	@echo [tsc] compiling tests for capnpc-ts...
	@$(tsc) -p configs/capnpc-ts/tsconfig-lib-test.json

.PHONY: test-capnpc-js
test-capnpc-js: build-capnp
test-capnpc-js: build-capnpc-js
	@echo [tsc] compiling tests for capnpc-js...
	@$(tsc) -p configs/capnpc-js/tsconfig-lib-test.json

.PHONY: test
test: test-capnp-ts
test: test-capnpc-ts
test: test-capnpc-js
	@echo [tap] running tests...
	@$(tap) \
		$(shell find $(capnp_ts)/lib-test -name '*.spec.js' -print) \
		$(shell find $(capnpc_ts)/lib-test -name '*.spec.js' -print) \
		$(shell find $(capnpc_js)/lib-test -name '*.spec.js' -print)

.PHONY: coverage
coverage: build
	@echo [tsc] compiling tests for capnp-ts...
	@$(tsc) -p configs/capnp-ts/tsconfig-lib-test.json
	@echo [tsc] compiling tests for capnpc-ts...
	@$(tsc) -p configs/capnpc-ts/tsconfig-lib-test.json
	@echo [tsc] compiling tests for capnpc-js...
	@$(tsc) -p configs/capnpc-js/tsconfig-lib-test.json
	@echo [tap] generating coverage report...
	@$(tap) --coverage $(shell find $(capnp_ts)/lib-test -name '*.spec.js' -print) $(shell find $(capnpc_ts)/lib-test -name '*.spec.js' -print) $(shell find $(capnpc_js)/lib-test -name '*.spec.js' -print)

.PHONY: lint
lint:
	@echo [eslint] running lint checkers...
	@$(eslint) . --ext .js,.ts
