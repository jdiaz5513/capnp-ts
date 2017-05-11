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

TAP_FLAGS += -j8
TSC_FLAGS +=

##############
# binary paths

node_bin := node_modules/.bin

capnp := capnp
codecov := $(node_bin)/codecov
nodemon := $(node_bin)/nodemon
tap := $(node_bin)/tap
tsc := $(node_bin)/tsc
tslint := $(node_bin)/tslint

#############
# input files

capnp_in := $(shell find src -name *.capnp -print)
capnp_in += $(shell find test -name *.capnp -print)

src := $(shell find src -name *.ts -print)

test := $(shell find test -name *.ts -print)
test_spec := $(shell find test -name *.spec.ts -print)

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

.PHONY: build
build: $(lib)

.PHONY: capnp-compile
capnp-compile: $(capnp_out)

.PHONY: ci
ci: TAP_FLAGS += --cov
ci: lint
ci: test
	@echo
	@echo uploading coverage report
	@echo =========================
	@echo
	$(tap) --coverage-report=lcov
	$(codecov) --disable=gcov

.PHONY: clean
clean:
	@echo
	@echo cleaning
	@echo ========
	@echo
	rm -rf .nyc-output coverage lib lib-test

.PHONY: lint
lint: node_modules
	@echo
	@echo running linter
	@echo ==============
	@echo
	$(tslint) src test

.PHONY: prebuild
prebuild: lint

.PHONY: prepublish
prepublish: build

.PHONY: test
test: lint
test: node_modules
test: $(lib_test)
	@echo
	@echo starting test run
	@echo =================
	@echo
	@$(tap) $(TAP_FLAGS) $(lib_test_spec)

.PHONY: watch
watch: node_modules
	@echo
	@echo starting test watcher
	@echo =====================
	@echo
	$(nodemon) -e ts --watch src --watch test --watch Makefile --watch package.json --exec 'npm test'

###############
# build targets

# FIXME: Need to implement the schema compiler.

$(capnp_out): node_modules
$(capnp_out): %.ts: %.capnp
	@echo
	@echo compiling capnp schemas
	@echo =======================
	@echo
	@# $(capnp) compile -o bin/capnpc-ts $< > $@
	touch $@

# $(lib): $(capnp_out)
$(lib): $(src)
$(lib): node_modules
	@echo
	@echo compiling capnp-ts library
	@echo ==========================
	@echo	
	$(tsc) $(TSC_FLAGS)

$(lib_test): $(lib)
$(lib_test): $(test)
$(lib_test): node_modules
	@echo
	@echo compiling tests
	@echo ===============
	@echo
	$(tsc) $(TSC_FLAGS) --outDir lib-test --rootDir test --sourceMap test/index.ts

node_modules: package.json
	npm install
	@touch node_modules
