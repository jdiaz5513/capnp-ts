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
PACKAGES ?= capnp-ts capnpc-ts
TAP_FLAGS ?= -j8
TSC_FLAGS ?=
TSLINT_FLAGS ?= -t stylish --type-check --project tsconfig.json

###########
# templates

define package_template

# The package template is broken up into sub-templates because each step
# references vars defined in one of the previous steps.
#
# One would think that at this point a sane person would have given up on the
# Makefile and switched to gulp. I am not sane. -jdiaz5513

$(eval $(call package_template_1,$(subst -,_,$(1))))
$(eval $(call package_template_2,$(subst -,_,$(1))))
$(eval $(call package_template_3,$(subst -,_,$(1))))
$(eval $(call package_template_4,$(subst -,_,$(1))))
$(eval $(call package_template_5,$(subst -,_,$(1))))

endef

define package_template_1

$(1)_name := $(subst _,-,$(1))
$(1) := packages/$(subst _,-,$(1))

endef

define package_template_2

# source files

$(1)_src := $(shell find $($(1))/src -name '*.ts' -print)

# test files

$(1)_test := $(shell find $($(1))/test -name '*.ts' -print)

# test specs

$(1)_test_spec := $(shell find $($(1))/test -name '*.spec.ts' -print)

endef

define package_template_3

# library output

$(1)_lib := $(patsubst %.ts,%.d.ts,$($(1)_src))
$(1)_lib += $(patsubst %.ts,%.js,$($(1)_src))
$(1)_lib += $(patsubst %.ts,%.js.map,$($(1)_src))

# test output

$(1)_lib_test := $(patsubst %.ts,%.js,$($(1)_test))
$(1)_lib_test += $(patsubst %.ts,%.js.map,$($(1)_test))

# compiled test specs

$(1)_lib_test_spec := $(patsubst %.ts,%.js,$($(1)_test_spec))

endef

define package_template_4

# transform directory patterns

$(1)_lib := $(subst /src/,/lib/,$($(1)_lib))

$(1)_lib_test := $(subst /test/,/lib-test/,$($(1)_lib_test))

$(1)_lib_test_spec := $(subst /test/,/lib-test/,$($(1)_lib_test_spec))

endef

define package_template_5

# append to master lists

lib += $($(1)_lib)
lib_test += $($(1)_lib_test)
lib_test_spec += $($(1)_lib_test_spec)
package_json += $($(1))/package.json
node_modules += $($(1))/node_modules
src += $($(1)_src)

# library target

# $($(1)_lib): $(capnp_out)
$($(1)_lib): $($(1)_src)
$($(1)_lib): $(tsconfig)
$($(1)_lib): $(node_modules)
$($(1)_lib): node_modules
	@echo
	@echo compiling package
	@echo $($(1)_name)
	@echo =================
	@echo
	@echo tsc $(TSC_FLAGS) -p configs/$($(1)_name)/tsconfig-lib.json
	@$(tsc) $(TSC_FLAGS) -p configs/$($(1)_name)/tsconfig-lib.json
	@echo

# test target

$($(1)_lib_test): $($(1)_lib)
$($(1)_lib_test): $($(1)_test)
$($(1)_lib_test): $($(1)_test_data)
$($(1)_lib_test): $(tsconfig)
$($(1)_lib_test): $(node_modules)
$($(1)_lib_test): node_modules
	@echo
	@echo compiling tests
	@echo $($(1)_name)
	@echo ===============
	@echo
	@echo tsc $(TSC_FLAGS) -p configs/$($(1)_name)/tsconfig-lib-test.json
	@$(tsc) $(TSC_FLAGS) -p configs/$($(1)_name)/tsconfig-lib-test.json
	@echo

endef

##############
# binary paths

node_bin := node_modules/.bin

capnp := capnp
codecov := $(node_bin)/codecov
lerna := $(node_bin)/lerna
nodemon := $(node_bin)/nodemon
tsc := $(node_bin)/tsc
tslint := $(node_bin)/tslint
tap := $(node_bin)/tap

##########
# packages

$(foreach pkg,$(PACKAGES),$(eval $(call package_template,$(pkg))))

##################
# misc input files

capnp_in := $(shell find packages -name '*.capnp' -print)

tsconfig := $(shell find . -name 'tsconfig*.json' -print)

tslint_config := $(shell find . -name 'tslint*.json' -print)

###################
# misc output files

capnp_out := $(patsubst %.capnp,%.ts,$(capnp_in))

capnp_ts_test_data := $(shell find $(capnp_ts)/test/data -name '*' -print)

################
# build commands

.PHONY: benchmark
benchmark: $(capnp_ts_lib_test)
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
	rm -rf .nyc_output .tmp coverage $(foreach pkg,$(PACKAGES),$(pkg)/lib $(pkg)/lib-test)
	@echo lerna clean
	@$(lerna) clean --yes
	@echo

.PHONY: coverage
coverage: TAP_FLAGS += --cov --nyc-arg='-x=**/lib-test/**/*'
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
	@echo $(tslint) $(TSLINT_FLAGS) -c tslint.json 'packages/**/src/**/*.ts'
	@$(tslint) $(TSLINT_FLAGS) -c tslint.json packages/**/src/**/*.ts

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
	@$(nodemon) -e ts,capnp -w $(capnp_ts)/src -w $(capnp_ts)/test -w Makefile -x 'npm test'
	@echo	

##############
# misc targets

# FIXME: Need to implement the schema compiler.

# $(capnp_out): node_modules
# $(capnp_out): %.ts: %.capnp
# 	@echo
# 	@echo compiling capnp schemas
# 	@echo =======================
# 	@echo
# 	@# capnp compile -o bin/capnpc-ts $< > $@
# 	touch $@

$(capnp_ts_lib_test): $(capnp_ts_test_data)

$(lerna): package.json
	@echo
	@echo setting up lerna
	@echo ================
	@echo
	npm install lerna
	@echo

$(node_modules): $(package_json)
$(node_modules): node_modules
	@echo
	@echo installing and linking packages
	@echo ===============================
	@echo
	@echo lerna bootstrap
	@$(lerna) bootstrap
	@touch $(node_modules)
	@echo

node_modules: package.json
	@echo
	@echo installing build dependencies
	@echo =============================
	@echo
	npm install
	@touch node_modules
	@echo
