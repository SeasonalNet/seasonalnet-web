APP_VERSION ?= $(shell sh tools/version.sh)
APP_REVISION ?= $(shell sh tools/version.sh --revision)
PNPM ?= pnpm
APP ?= www

.DEFAULT_GOAL := quality
.NOTPARALLEL: ci

.PHONY: install dev quality supply-chain build ci test test-watch

install:
	$(PNPM) install --frozen-lockfile

dev:
	$(PNPM) --filter @seasonalnet/$(APP) dev

quality:
	$(PNPM) run quality

build:
	$(PNPM) run build

supply-chain:
	$(PNPM) audit signatures
	$(PNPM) audit --audit-level low

ci: supply-chain quality build

test:
	$(PNPM) run test

test-watch:
	$(PNPM) run test:watch

.PHONY: container container-check
IMAGE ?= seasonalnet-web-$(APP):local

container:
	docker buildx build --load --build-arg "APP_VERSION=$(APP_VERSION)" --build-arg "APP_REVISION=$(APP_REVISION)" --build-arg APP=$(APP) --tag "$(IMAGE)" .

container-check: container
	python3 -m unittest discover -s tools/container -p 'test_*.py'
	python3 tools/container/check-image.py "$(IMAGE)"
