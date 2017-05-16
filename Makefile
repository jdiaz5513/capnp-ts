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

##########
# packages

capnp_ts := packages/capnp-ts

#############
# input files

capnp_in := $(shell find packages -name '*.capnp' -print)

node_modules := node_modules
node_modules += $(capnp_ts)/node_modules

src := $(shell find $(capnp_ts)/src -name '*.ts' -print)

test := $(shell find $(capnp_ts)/test -name '*.ts' -print)

test_data := $(shell find $(capnp_ts)/test/data -name '*' -print)

test_spec := $(shell find $(capnp_ts)/test -name '*.spec.ts' -print)

tsconfig := $(shell find . -name 'tsconfig*.json' -print)

tslint_config := $(shell find . -name 'tslint*.json' -print)

##############
# output files

capnp_out := $(patsubst %.capnp,%.ts,$(capnp_in))

lib := $(patsubst %.ts,%.d.ts,$(src))
lib += $(patsubst %.ts,%.js,$(src))
lib += $(patsubst %.ts,%.js.map,$(src))
lib := $(subst /src/,/lib/,$(lib))

lib_test := $(patsubst %.ts,%.js,$(test))
lib_test += $(patsubst %.ts,%.js.map,$(test))
lib_test := $(subst /test/,/lib-test/,$(lib_test))

lib_test_spec := $(patsubst %.ts,%.js,$(test_spec))
lib_test_spec := $(subst /test/,/lib-test/,$(lib_test_spec))

################
# build commands

.PHONY: benchmark
benchmark: $(lib_test)
	@echo
	@echo running benchmarks
	@echo ==================
	@echo
	node $(capnp_ts)/lib-test/benchmark/index.js
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
	rm -rf .nyc_output .tmp $(capnp_ts)/coverage $(capnp_ts)/lib $(capnp_ts)/lib-test
	@echo

.PHONY: coverage
coverage: TAP_FLAGS += --cov --nyc-arg='-x=$(capnp_ts)/lib-test/**/*'
coverage: test
	@echo
	@echo generating coverage report
	@echo ==========================
	@echo
	@echo tap --coverage-report=lcov
	@$(tap) --coverage-report=lcov
	@echo

.PHONY: debug
debug:
	@echo $(lib)

.PHONY: lint
lint: $(tslint_config)
lint: node_modules
	@echo
	@echo running linter
	@echo ==============
	@echo
	@echo tslint $(TSLINT_FLAGS) -c tslint.json '$(capnp_ts)/src/**/*.ts'
	@$(tslint) $(TSLINT_FLAGS) -c tslint.json $(capnp_ts)/src/**/*.ts
	@echo tslint $(TSLINT_FLAGS) -c $(capnp_ts)/test/tslint.json '$(capnp_ts)/test/**/*.ts'
	@$(tslint) $(TSLINT_FLAGS) -c $(capnp_ts)/test/tslint.json $(capnp_ts)/test/**/*.ts

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
	@$(nodemon) -e ts -e capnp -w packages -w Makefile -x 'npm test'
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

$(capnp_ts)/lib: $(lib)
	@touch lib

$(capnp_ts)/lib-test: $(lib_test)
	@touch lib-test

$(capnp_ts)/node_modules: $(capnp_ts)/package.json
	cd $(capnp_ts) && npm install
	@touch $(capnp_ts)/node_modules
	@echo

# $(lib): $(capnp_out)
$(lib): $(src)
$(lib): $(tsconfig)
$(lib): $(node_modules)
	@echo
	@echo compiling capnp-ts library
	@echo ==========================
	@echo
	@echo tsc $(TSC_FLAGS) -p configs/capnp-ts/tsconfig-lib.json
	@$(tsc) $(TSC_FLAGS) -p configs/capnp-ts/tsconfig-lib.json
	@echo

$(lib_test): $(lib)
$(lib_test): $(test)
$(lib_test): $(test_data)
$(lib_test): $(tsconfig)
$(lib_test): node_modules
	@echo
	@echo compiling tests
	@echo ===============
	@echo
	@echo tsc $(TSC_FLAGS) -p configs/capnp-ts/tsconfig-lib-test.json
	@$(tsc) $(TSC_FLAGS) -p configs/capnp-ts/tsconfig-lib-test.json
	@echo

node_modules: package.json
	npm install
	@touch node_modules
	@echo
