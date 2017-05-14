#########
# prelude

MAKEFLAGS += --warn-undefined-variables
SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := build
.DELETE_ON_ERROR:
.SUFFIXES:

#####################
# environment options

CODECOV_FLAGS ?= --disable=gcov
TAP_FLAGS ?= -j8
TSC_FLAGS ?=
TSLINT_FLAGS ?= -t stylish --type-check --project tsconfig.json

##############
# binary paths

node_bin := node_modules/.bin

capnp := capnp
codecov := $(node_bin)/codecov
nodemon := $(node_bin)/nodemon
tsc := $(node_bin)/tsc
tslint := $(node_bin)/tslint
tap := $(node_bin)/tap

#############
# input files

capnp_in := $(shell find src -name '*.capnp' -print)
capnp_in += $(shell find test -name '*.capnp' -print)

src := $(shell find src -name '*.ts' -print)

test := $(shell find test -name '*.ts' -print)
test_data := $(shell find test/data -name '*' -print)
test_spec := $(shell find test -name '*.spec.ts' -print)

tsconfig := tsconfig.json configs/base.json
tsconfig_lib := configs/base.json configs/lib.json
tsconfig_lib_test := configs/base.json configs/lib-test.json

tslint_config := tslint.json test/tslint.json

##############
# output files

capnp_out := $(patsubst %.capnp,%.ts,$(capnp_in))

lib := $(patsubst src/%.ts,lib/%.d.ts,$(src))
lib += $(patsubst src/%.ts,lib/%.js,$(src))
lib += $(patsubst src/%.ts,lib/%.js.map,$(src))

lib_test := $(patsubst test/%.ts,lib-test/%.js,$(test))
lib_test += $(patsubst test/%.ts,lib-test/%.js.map,$(test))
lib_test_spec := $(patsubst test/%.ts,lib-test/%.js,$(test_spec))

################
# build commands

.PHONY: benchmark
benchmark: $(lib_test)
	@echo
	@echo running benchmarks
	@echo ==================
	@echo
	node lib-test/benchmark/index.js
	@echo

.PHONY: build
build: $(lib)

.PHONY: capnp-compile
capnp-compile: $(capnp_out)

.PHONY: ci
ci: lint
ci: coverage
	@echo
	@echo uploading coverage report
	@echo =========================
	@echo
	@echo codecov $(CODECOV_FLAGS)
	@$(codecov) $(CODECOV_FLAGS)
	@echo

.PHONY: clean
clean:
	@echo
	@echo cleaning
	@echo ========
	@echo
	rm -rf .nyc-output .tmp coverage lib lib-test
	@echo

.PHONY: coverage
coverage: TAP_FLAGS += --cov --nyc-arg='-x=lib-test/**/*'
coverage: test
	@echo
	@echo generating coverage report
	@echo ==========================
	@echo
	@echo tap --coverage-report=lcov
	@$(tap) --coverage-report=lcov
	@echo

.PHONY: lint
lint: $(tslint_config)
lint: node_modules
	@echo
	@echo running linter
	@echo ==============
	@echo
	@echo tslint $(TSLINT_FLAGS) -c tslint.json 'src/**/*.ts'
	@$(tslint) $(TSLINT_FLAGS) -c tslint.json src/**/*.ts
	@echo tslint $(TSLINT_FLAGS) -c test/tslint.json 'test/**/*.ts'
	@$(tslint) $(TSLINT_FLAGS) -c test/tslint.json test/**/*.ts

.PHONY: prebuild
prebuild: lint

.PHONY: prepublish
prepublish: build

.PHONY: test
test: node_modules
test: $(lib_test)
	@echo
	@echo starting test run
	@echo =================
	@echo
	@$(tap) $(TAP_FLAGS) $(lib_test_spec)
	@echo

.PHONY: watch
watch: node_modules
	@echo
	@echo starting test watcher
	@echo =====================
	@echo
	@$(nodemon) -e ts -w src -w test -w Makefile -w package.json -x 'npm test'
	@echo	

###############
# build targets

# FIXME: Need to implement the schema compiler.

# $(capnp_out): node_modules
# $(capnp_out): %.ts: %.capnp
# 	@echo
# 	@echo compiling capnp schemas
# 	@echo =======================
# 	@echo
# 	@# capnp compile -o bin/capnpc-ts $< > $@
# 	touch $@

# $(lib): $(capnp_out)
$(lib): $(src)
$(lib): $(tsconfig_lib)
$(lib): node_modules
	@echo
	@echo compiling capnp-ts library
	@echo ==========================
	@echo
	@echo tsc $(TSC_FLAGS) -p configs/lib.json
	@$(tsc) $(TSC_FLAGS) -p configs/lib.json
	@echo

$(lib_test): $(lib)
$(lib_test): $(test)
$(lib_test): $(test_data)
$(lib_test): $(tsconfig_lib_test)
$(lib_test): node_modules
	@echo
	@echo compiling tests
	@echo ===============
	@echo
	@echo tsc $(TSC_FLAGS) -p configs/lib-test.json
	@$(tsc) $(TSC_FLAGS) -p configs/lib-test.json
	@echo

lib: $(lib)
	@touch lib

lib-test: $(lib_test)
	@touch lib-test

node_modules: package.json
	npm install
	@touch node_modules
	@echo
